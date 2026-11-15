#!/usr/bin/env python3
"""Daily scraper for Lahore High Court reported judgments.

It reads ``#latestJudgments`` from the LHC listing page, extracts metadata for
each row, reads each judgment PDF (in memory, never saved) to find its own
citation and the case law it cites, and POSTs it to the Laravel import endpoint
at ``/api/judgments/import`` using a bearer token.

See ``docs/judgment-automation.md`` for setup and deployment.
"""

from __future__ import annotations

import argparse
import fcntl
import io
import json
import logging
import os
import re
import sys
import time
import unicodedata
from contextlib import contextmanager
from dataclasses import asdict, dataclass, replace
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
LOG_FILE = STORAGE_DIR / "scraper.log"
LOCK_FILE = STORAGE_DIR / "scraper.lock"
CITATION_CACHE_FILE = STORAGE_DIR / "pdf_citations.json"
MAX_PDF_BYTES = 25 * 1024 * 1024
MAX_PDF_PAGES = 80
MAX_CITED = 150
DEFAULT_LISTING_URL = (
    "https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting"
)
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36 WakeelDiaryLHCScraper/1.0"
)

logger = logging.getLogger("lhc_scraper")


@dataclass(frozen=True)
class Config:
    listing_url: str
    import_url: str
    import_token: str
    timeout: float
    max_retries: int
    user_agent: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            listing_url=os.getenv("LHC_LISTING_URL", DEFAULT_LISTING_URL).strip(),
            import_url=os.getenv("JUDGMENTS_IMPORT_URL", "").strip(),
            import_token=os.getenv("JUDGMENTS_IMPORT_TOKEN", "").strip(),
            timeout=float(os.getenv("REQUEST_TIMEOUT", "30")),
            max_retries=max(1, int(os.getenv("MAX_RETRIES", "3"))),
            user_agent=os.getenv("USER_AGENT", DEFAULT_USER_AGENT).strip(),
        )


@dataclass(frozen=True)
class JudgmentRecord:
    court: str
    case_type: str
    case_number: str
    title: str
    judges: str
    citation: str | None
    tag_line: str | None
    decision_date: None
    uploaded_on: str
    pdf_path: str
    source_url: str
    slug: str
    is_published: bool
    cited_citations: tuple[str, ...] = ()

    def as_payload(self) -> dict[str, object]:
        payload = asdict(self)
        payload["cited_citations"] = list(self.cited_citations)

        return payload


def configure_logging(verbose: bool = False) -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)-8s %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


@contextmanager
def single_instance_lock() -> Iterator[bool]:
    """Prevent overlapping cron runs with a non-blocking advisory lock."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    handle = LOCK_FILE.open("w", encoding="utf-8")

    try:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            yield False
            return

        handle.write(str(os.getpid()))
        handle.flush()
        yield True
    finally:
        handle.close()


def build_session(config: Config) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": config.user_agent,
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        }
    )

    retry = Retry(
        total=config.max_retries,
        connect=config.max_retries,
        read=config.max_retries,
        status=config.max_retries,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    return session


def clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value).strip("-")


def is_lhc_pdf_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    return (
        parsed.scheme in {"http", "https"}
        and (host == "lhc.gov.pk" or host.endswith(".lhc.gov.pk"))
        and parsed.path.lower().endswith(".pdf")
    )


def extract_uploaded_on(text: str) -> str | None:
    match = re.search(
        r"uploaded\s*on\s*:?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})",
        text,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    day, month, year = match.groups()
    year = int(year)
    if year < 100:
        year += 2000

    try:
        return datetime(year, int(month), int(day)).date().isoformat()
    except ValueError:
        return None


def extract_judge(anchor) -> str:
    candidates = [
        clean_text(strong.get_text(" ", strip=True))
        for strong in anchor.find_all("strong")
    ]
    candidates = [candidate for candidate in candidates if candidate]

    for candidate in reversed(candidates):
        if candidate.lower() != "vs":
            return candidate

    return ""


def extract_tag_line(cell) -> str | None:
    for node in cell.find_all(string=re.compile(r"tag\s*line", re.IGNORECASE)):
        italic = node.parent.find("i") if node.parent else None
        if italic is None:
            italic = node.find_next("i")

        if italic is not None:
            tag_line = clean_text(italic.get_text(" ", strip=True))
            if tag_line:
                return tag_line

    match = re.search(
        r"tag\s*line\s*:\s*(.+?)\s*(?:uploaded\s*on\s*:|$)",
        clean_text(cell.get_text(" ", strip=True)),
        flags=re.IGNORECASE,
    )

    return clean_text(match.group(1)) if match else None


def split_case_and_title(anchor_text: str) -> tuple[str, str, str] | None:
    """Split "Case Type 123-26 (Title) by Judge" into its three parts.

    The final parenthesised group is the title. Its matching opener is found by
    scanning backwards so case types and titles may both contain parentheses.
    """
    text = clean_text(anchor_text)
    markers = list(re.finditer(r"\)\s+by\s+", text, flags=re.IGNORECASE))
    if not markers:
        return None

    body = text[: markers[-1].start() + 1]
    depth = 0
    opener = -1

    for index in range(len(body) - 1, -1, -1):
        if body[index] == ")":
            depth += 1
        elif body[index] == "(":
            depth -= 1
            if depth == 0:
                opener = index
                break

    if opener == -1:
        return None

    case_part = body[:opener].strip()
    title = re.sub(r"[\s.]+$", "", body[opener + 1 : -1].strip())

    if not case_part or not title:
        return None

    parts = case_part.rsplit(None, 1)
    if len(parts) != 2:
        return None

    case_type, case_number = parts[0].strip(), parts[1].strip()
    if not case_type or not re.search(r"\d", case_number):
        return None

    return case_type, case_number, title


def parse_judgments(
    html: str | bytes, source_url: str
) -> tuple[list[JudgmentRecord], int, int]:
    """Return ``(records, total_rows, skipped_rows)`` for the listing page."""
    soup = BeautifulSoup(html, "html.parser")
    container = soup.find(id="latestJudgments")

    if container is None:
        logger.error("Could not find #latestJudgments on the LHC page.")
        return [], 0, 0

    table = container.find("table")
    if table is None:
        logger.error("#latestJudgments does not contain a table.")
        return [], 0, 0

    rows = table.find_all("tr")
    records: list[JudgmentRecord] = []
    skipped = 0

    for position, row in enumerate(rows, start=1):
        anchor = row.find("a", href=True)
        if anchor is None:
            if clean_text(row.get_text(" ", strip=True)):
                skipped += 1
                logger.warning("Row %d skipped: no judgment link.", position)
            continue

        pdf_url = clean_text(anchor.get("href"))
        if not is_lhc_pdf_url(pdf_url):
            skipped += 1
            logger.warning("Row %d skipped: invalid PDF URL %r.", position, pdf_url)
            continue

        cells = row.find_all("td")
        cell = cells[1] if len(cells) > 1 else row
        parsed = split_case_and_title(anchor.get_text(" ", strip=True))
        uploaded_on = extract_uploaded_on(cell.get_text(" ", strip=True))
        judge = extract_judge(anchor)

        if parsed is None or uploaded_on is None or not judge:
            skipped += 1
            logger.warning(
                "Row %d skipped: could not parse case/title/judge/date (%r).",
                position,
                clean_text(anchor.get_text(" ", strip=True))[:160],
            )
            continue

        case_type, case_number, title = parsed
        slug = slugify(
            f"lhc {case_type} {case_number} {title}"
        )[:150].strip("-") or "judgment"

        records.append(
            JudgmentRecord(
                court="LHC",
                case_type=case_type,
                case_number=case_number,
                title=title,
                judges=judge,
                citation=citation_from_pdf_url(pdf_url),
                tag_line=extract_tag_line(cell),
                decision_date=None,
                uploaded_on=uploaded_on,
                pdf_path=pdf_url,
                source_url=source_url,
                slug=slug,
                is_published=True,
            )
        )

    return records, len(rows), skipped


# --- Citations -------------------------------------------------------------
#
# Pakistani law reports: "PLD 2026 Lahore 172" (reporter, year, court, page) and
# "2026 CLC 1150" / "2021 SCMR 1234" / "2026 LHC 8777" (year, reporter, page).
# Text from PDFs often has broken spacing, so matching tolerates extra spaces.

PLD_COURTS = {
    "supremecourt": "SC", "sc": "SC",
    "lahore": "Lahore", "lah": "Lahore",
    "karachi": "Karachi", "kar": "Karachi", "sindh": "Sindh",
    "peshawar": "Peshawar", "pesh": "Peshawar",
    "quetta": "Quetta", "balochistan": "Balochistan", "bal": "Balochistan",
    "islamabad": "Islamabad", "isl": "Islamabad",
    "federalshariatcourt": "FSC", "fsc": "FSC",
    "ajk": "AJ&K", "aj&k": "AJ&K", "azadj&k": "AJ&K",
    "gb": "GB", "gilgitbaltistan": "GB",
}

YEAR_FIRST_REPORTERS = {
    "scmr": "SCMR", "clc": "CLC", "ylr": "YLR", "mld": "MLD", "cld": "CLD", "ptd": "PTD",
    "plc": "PLC", "plc(cs)": "PLC (C.S.)", "pcrlj": "PCr.LJ", "nlr": "NLR", "ptcl": "PTCL",
    "klr": "KLR", "gblr": "GBLR", "lhc": "LHC", "scp": "SCP", "ihc": "IHC",
    "phc": "PHC", "shc": "SHC", "bhc": "BHC",
}

PLD_PATTERN = re.compile(
    r"\bP\s*L\s*D\s+((?:19|20)\d{2})\s+"
    r"(Supreme\s+Court|Federal\s+Shariat\s+Court|Gilgit[-\s]*Baltistan|Azad\s+J\s*&\s*K|AJ\s*&\s*K|"
    r"Lahore|Lah|Karachi|Kar|Sindh|Peshawar|Pesh|Quetta|Balochistan|Bal|Islamabad|Isl|FSC|SC|GB)"
    r"\.?\s+(\d{1,5})\b",
    flags=re.IGNORECASE,
)

YEAR_FIRST_PATTERN = re.compile(
    r"\b((?:19|20)\d{2})\s+"
    r"(SCMR|CLC|YLR|MLD|CLD|PTD|PLC\s*\(\s*C\s*\.?\s*S\s*\.?\s*\)|PLC|P\s*\.?\s*Cr\s*\.?\s*L\s*\.?\s*J|"
    r"NLR|PTCL|KLR|GBLR|LHC|SCP|IHC|PHC|SHC|BHC)"
    r"\.?\s+(\d{1,6})\b",
)

OWN_CITATION_IN_URL = re.compile(
    r"((?:19|20)\d{2})[\s_-]*(LHC|SHC|PHC|BHC|IHC|SCP)[\s_-]*(\d{1,6})\.pdf$", flags=re.IGNORECASE
)


def citation_from_pdf_url(url: str) -> str | None:
    """LHC names reported PDFs after their citation: 2026LHC8777.pdf -> "2026 LHC 8777"."""
    match = OWN_CITATION_IN_URL.search(urlparse(url).path.rsplit("/", 1)[-1])
    if not match:
        return None

    year, reporter, page = match.groups()

    return f"{year} {reporter.upper()} {int(page)}"


def _key(value: str) -> str:
    return re.sub(r"[\s.]+", "", value).lower()


def extract_citations(text: str) -> list[str]:
    """Return every distinct law report citation in ``text``, in order of appearance."""
    text = clean_text(text)
    found: list[tuple[int, str]] = []

    for match in PLD_PATTERN.finditer(text):
        year, court, page = match.groups()
        court_name = PLD_COURTS.get(_key(court).replace("-", ""), court.title())
        found.append((match.start(), f"PLD {year} {court_name} {int(page)}"))

    for match in YEAR_FIRST_PATTERN.finditer(text):
        year, reporter, page = match.groups()
        name = YEAR_FIRST_REPORTERS.get(_key(reporter))
        if name:
            found.append((match.start(), f"{year} {name} {int(page)}"))

    seen: set[str] = set()
    citations: list[str] = []
    for _, citation in sorted(found):
        if _key(citation) not in seen:
            seen.add(_key(citation))
            citations.append(citation)

    return citations


def read_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    pages = reader.pages[:MAX_PDF_PAGES]

    return "\n".join((page.extract_text() or "") for page in pages)


def download_pdf(session: requests.Session, config: Config, url: str) -> bytes:
    """Download a court PDF into memory, refusing anything that is not a PDF or is too large."""
    with session.get(url, timeout=config.timeout, stream=True) as response:
        response.raise_for_status()
        chunks: list[bytes] = []
        size = 0
        for chunk in response.iter_content(chunk_size=65536):
            size += len(chunk)
            if size > MAX_PDF_BYTES:
                raise ValueError(f"PDF larger than {MAX_PDF_BYTES // (1024 * 1024)} MB")
            chunks.append(chunk)

    content = b"".join(chunks)
    if not content.startswith(b"%PDF"):
        raise ValueError("response is not a PDF")

    return content


def load_citation_cache() -> dict[str, dict[str, object]]:
    try:
        data = json.loads(CITATION_CACHE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_citation_cache(cache: dict[str, dict[str, object]]) -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    temporary = CITATION_CACHE_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")
    temporary.replace(CITATION_CACHE_FILE)


def add_pdf_citations(
    session: requests.Session,
    config: Config,
    records: list[JudgmentRecord],
) -> list[JudgmentRecord]:
    """Read each judgment PDF once (results are cached) and attach its citations.

    The judgment's own citation comes from the PDF file name, or from the top of
    the first page when the name does not carry it. Everything else found in the
    text is case law the judgment cites. A PDF that cannot be read is logged and
    the record is still imported without cited case law.
    """
    cache = load_citation_cache()
    enriched: list[JudgmentRecord] = []
    downloaded = 0

    for record in records:
        cached = cache.get(record.pdf_path)

        if cached is None:
            if downloaded:
                time.sleep(0.5)  # be polite to the court server
            try:
                text = read_pdf_text(download_pdf(session, config, record.pdf_path))
                downloaded += 1
            except Exception as exc:  # noqa: BLE001 - one unreadable PDF must not stop the run
                logger.warning("Could not read PDF %s: %s", record.pdf_path, exc)
                enriched.append(record)
                continue

            own = record.citation
            if own is None:
                header = [c for c in extract_citations(text[:600]) if re.search(r"\b(LHC|SHC|PHC|BHC|IHC|SCP)\b", c)]
                own = header[0] if header else None

            cited = [c for c in extract_citations(text) if own is None or _key(c) != _key(own)]
            cached = {"citation": own, "cited": cited[:MAX_CITED]}
            cache[record.pdf_path] = cached

        citation = record.citation or cached.get("citation")
        cited = tuple(str(c) for c in (cached.get("cited") or []))
        enriched.append(replace(record, citation=citation, cited_citations=cited))
        logger.debug("Citations for %s: %s; cites %d", record.pdf_path, citation, len(cited))

    save_citation_cache(cache)
    logger.info("Citations read: %d PDFs downloaded, %d from cache.", downloaded, len(records) - downloaded)

    return enriched


def fetch_listing(session: requests.Session, config: Config) -> bytes:
    response = session.get(config.listing_url, timeout=config.timeout)
    response.raise_for_status()

    return response.content


def post_record(
    session: requests.Session, config: Config, payload: dict[str, object]
) -> tuple[str, str | None]:
    """POST one record. Returns ``("imported"|"duplicate"|"failed", error)``."""
    headers = {
        "Authorization": f"Bearer {config.import_token}",
        "Accept": "application/json",
    }
    last_error = "unknown error"

    for attempt in range(1, config.max_retries + 1):
        try:
            response = session.post(
                config.import_url,
                json=payload,
                headers=headers,
                timeout=config.timeout,
            )

            if response.status_code in {200, 201}:
                try:
                    body = response.json()
                except ValueError:
                    return "failed", (
                        f"HTTP {response.status_code} but the response was not JSON: "
                        f"{response.text[:200]}"
                    )

                status = body.get(
                    "status", "imported" if response.status_code == 201 else "duplicate"
                )
                if status in {"imported", "duplicate"}:
                    return status, None

                return "failed", f"unexpected API status {status!r}"

            message = f"HTTP {response.status_code}: {response.text[:300]}"
            if response.status_code in {401, 403, 404, 422}:
                return "failed", message

            if response.status_code != 429 and response.status_code < 500:
                return "failed", message

            last_error = message
        except requests.RequestException as exc:
            last_error = f"{type(exc).__name__}: {exc}"

        if attempt < config.max_retries:
            delay = min(2**attempt, 8)
            logger.warning(
                "Import attempt %d/%d failed (%s); retrying in %ds.",
                attempt,
                config.max_retries,
                last_error,
                delay,
            )
            time.sleep(delay)

    return "failed", last_error


def run(config: Config, *, dry_run: bool, limit: int | None, read_pdfs: bool = True) -> int:
    logger.info(
        "Scraper started (dry_run=%s, limit=%s, read_pdfs=%s).", dry_run, limit or "none", read_pdfs
    )
    logger.info("Fetching listing: %s", config.listing_url)

    session = build_session(config)

    try:
        html = fetch_listing(session, config)
    except requests.RequestException as exc:
        logger.error("Failed to fetch the LHC listing: %s", exc)
        logger.info("Scraper completed with a fetch failure.")
        return 1

    records, total_rows, skipped = parse_judgments(html, config.listing_url)
    logger.info("Total rows found: %d.", total_rows)
    logger.info("Rows parsed: %d. Rows skipped: %d.", len(records), skipped)

    if total_rows == 0:
        logger.error(
            "No judgment rows found; the LHC page may have changed or be unavailable."
        )
        logger.info("Scraper completed with a parse failure.")
        return 1

    if not records:
        logger.error(
            "No parseable judgment rows (rows=%d, skipped=%d); the page layout may have changed.",
            total_rows,
            skipped,
        )
        logger.info("Scraper completed with a parse failure.")
        return 1

    if limit:
        records = records[:limit]
        logger.info("Limiting this run to %d records.", limit)

    if read_pdfs:
        records = add_pdf_citations(session, config, records)

    if dry_run:
        for record in records:
            logger.info("Parsed: %s", json.dumps(record.as_payload(), ensure_ascii=False))
        logger.info("Scraper completed (dry run). No records imported.")
        return 0

    if not config.import_url or not config.import_token:
        logger.error(
            "JUDGMENTS_IMPORT_URL and JUDGMENTS_IMPORT_TOKEN must be set to import."
        )
        logger.info("Scraper completed with a configuration error.")
        return 1

    imported = 0
    duplicates = 0
    failed = 0

    for index, record in enumerate(records, start=1):
        payload = record.as_payload()
        status, error = post_record(session, config, payload)

        if status == "imported":
            imported += 1
            logger.info(
                "[%d/%d] Imported: %s %s (%s)",
                index,
                len(records),
                record.case_type,
                record.case_number,
                record.pdf_path,
            )
        elif status == "duplicate":
            duplicates += 1
            logger.info(
                "[%d/%d] Duplicate skipped: %s %s",
                index,
                len(records),
                record.case_type,
                record.case_number,
            )
        else:
            failed += 1
            logger.error(
                "[%d/%d] Failed: %s %s -> %s",
                index,
                len(records),
                record.case_type,
                record.case_number,
                error,
            )

    logger.info(
        "Scraper completed. Parsed=%d Imported=%d Duplicates=%d Failed=%d Skipped=%d.",
        len(records),
        imported,
        duplicates,
        failed,
        skipped,
    )

    return 1 if failed else 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import LHC reported judgments.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and log records without calling the Laravel API.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only process the first N parsed records.",
    )
    parser.add_argument(
        "--source-url",
        default=None,
        help="Override LHC_LISTING_URL for this run.",
    )
    parser.add_argument(
        "--skip-pdf",
        action="store_true",
        help="Do not download PDFs; citations then come only from the PDF file names.",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")

    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_dotenv(BASE_DIR / ".env")
    configure_logging(args.verbose)

    if args.source_url:
        os.environ["LHC_LISTING_URL"] = args.source_url

    try:
        config = Config.from_env()
    except ValueError as exc:
        logger.error("Invalid scraper configuration: %s", exc)
        return 1

    with single_instance_lock() as acquired:
        if not acquired:
            logger.warning(
                "Another scraper instance is already running; this run will exit."
            )
            return 0

        try:
            return run(config, dry_run=args.dry_run, limit=args.limit, read_pdfs=not args.skip_pdf)
        except Exception:
            logger.exception("Unhandled scraper error.")
            logger.info("Scraper completed with an unhandled error.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())

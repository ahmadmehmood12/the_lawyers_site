#!/usr/bin/env python3
"""Scraper for Supreme Court of Pakistan reported judgments.

Sources (both use the same "judgment-grid" table):
  1. https://scp.gov.pk/LatestJudgments  - the newest judgments, no captcha (daily run).
  2. Search result pages you saved from https://scp.gov.pk/JudgmentsSearch in your browser
     (Reported = Yes), passed with --from-html. The search form is protected by Google
     reCAPTCHA, so this scraper never submits it; a person runs the search and saves pages.

Grid columns: Sr. No | Case Subject | Case No | Case Title | Author Judge | Judgment Date |
Upload Date | Citation | SC Citation | Download (PDF). A row may be followed by a
"tagline-row". Every judgment is POSTed to the Laravel /api/judgments/import endpoint.

See docs/judgment-automation.md.
"""

from __future__ import annotations

import argparse
import fcntl
import glob
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
from datetime import date
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pypdf import PdfReader
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
LOG_FILE = STORAGE_DIR / "scraper.log"
LOCK_FILE = STORAGE_DIR / "scraper.lock"
CITATION_CACHE_FILE = STORAGE_DIR / "pdf_citations.json"
DRY_RUN_FILE = STORAGE_DIR / "dry-run-results.json"
DEFAULT_LATEST_URL = "https://scp.gov.pk/LatestJudgments"
DEFAULT_SOURCE_URL = "https://scp.gov.pk/JudgmentsSearch"
DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; DaBarristerJudgments/1.0)"
COURT_HOSTS = ("scp.gov.pk", "supremecourt.gov.pk")
MAX_PDF_BYTES = 25 * 1024 * 1024
MAX_PDF_PAGES = 80
MAX_CITED = 150
UNKNOWN_BENCH = "Supreme Court of Pakistan"

# Seconds between imports, to stay under the site's rate limit (600 a minute).
IMPORT_DELAY = float(os.getenv("IMPORT_DELAY", "0.15"))

logger = logging.getLogger("sc_scraper")


@dataclass(frozen=True)
class Config:
    latest_url: str
    source_url: str
    import_url: str
    import_token: str
    timeout: float
    max_retries: int
    delay: float
    user_agent: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            latest_url=os.getenv("SC_LATEST_URL", DEFAULT_LATEST_URL).strip(),
            source_url=os.getenv("SC_SOURCE_URL", DEFAULT_SOURCE_URL).strip(),
            import_url=os.getenv("JUDGMENTS_IMPORT_URL", "").strip(),
            import_token=os.getenv("JUDGMENTS_IMPORT_TOKEN", "").strip(),
            timeout=float(os.getenv("REQUEST_TIMEOUT", "60")),
            max_retries=max(1, int(os.getenv("MAX_RETRIES", "3"))),
            delay=max(0.0, float(os.getenv("REQUEST_DELAY", "1.0"))),
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
    sc_citation: str | None
    tag_line: str | None
    decision_date: str | None
    uploaded_on: str
    pdf_path: str
    source_url: str
    slug: str
    is_published: bool
    cited_citations: tuple[str, ...] = ()
    # Saved "Reported = Yes" search pages: reported, with or without a citation. The Latest page
    # has no Reported column, so its rows are unreported (hidden) unless --latest-reported is used;
    # importing the same judgment later from a Reported = Yes page marks it reported.
    is_reported: bool = True

    def as_payload(self) -> dict[str, object]:
        payload = asdict(self)
        payload["cited_citations"] = list(self.cited_citations)

        return payload


# --- Infrastructure ----------------------------------------------------------


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
    session.headers.update({"User-Agent": config.user_agent, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"})
    retry = Retry(
        total=config.max_retries, connect=config.max_retries, read=config.max_retries, status=config.max_retries,
        backoff_factor=2, status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset({"GET"}), raise_on_status=False,
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


def is_court_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    return parsed.scheme in {"http", "https"} and any(host == h or host.endswith("." + h) for h in COURT_HOSTS)


def parse_date(value: str) -> str | None:
    match = re.search(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", value or "")
    if not match:
        return None
    day, month, year = (int(part) for part in match.groups())
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


# --- Parsing the judgment grid -----------------------------------------------


def judgment_rows(soup: BeautifulSoup) -> list:
    """Rows that hold one judgment: a "data-row" whose own cells include the case title.

    Works for both layouts: the Latest page (rows directly in the grid) and the search
    page (each judgment in a small table nested inside an outer "data-row").
    """
    rows = []
    for row in soup.find_all("tr", class_="data-row"):
        cells = row.find_all("td", recursive=False)
        if any("case-title" in (cell.get("class") or []) for cell in cells):
            rows.append(row)

    return rows


def tagline_for(row) -> str | None:
    sibling = row.find_next_sibling("tr")
    if sibling is not None and "tagline-row" in (sibling.get("class") or []):
        text = clean_text(sibling.get_text(" "))
        return text or None

    return None


def parse_judgments(page_html: str, source_url: str, reported: bool = True) -> tuple[list[JudgmentRecord], int, int]:
    """Return ``(records, total_rows, skipped_rows)`` for one grid page.

    ``reported`` marks every row: True for Reported = Yes search pages, False for
    Reported = No pages or the Latest page (unless --latest-reported).
    """
    soup = BeautifulSoup(page_html, "html.parser")
    rows = judgment_rows(soup)
    records: list[JudgmentRecord] = []
    skipped = 0
    today = date.today().isoformat()

    for position, row in enumerate(rows, start=1):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 10:
            skipped += 1
            logger.warning("Row %d skipped: %d columns.", position, len(cells))
            continue

        text = [clean_text(cell.get_text(" ")) for cell in cells]
        anchor = cells[9].find("a", href=True)
        pdf_url = anchor["href"].strip() if anchor else ""
        case_type = re.sub(r"\s*/\s*", " / ", text[1]).strip(" /") or "Case"
        case_number, title = text[2], text[3]
        decided = parse_date(text[5])

        if not pdf_url or not is_court_url(pdf_url) or not case_number or not title:
            skipped += 1
            logger.warning("Row %d skipped: missing case number, title or court PDF link (%r).", position, case_number or title)
            continue

        citation, sc_citation = text[7][:120] or None, text[8][:120] or None
        records.append(
            JudgmentRecord(
                court="SCP",
                case_type=case_type[:160],
                case_number=case_number[:60],
                title=title[:500],
                judges=(text[4] or UNKNOWN_BENCH)[:500],
                citation=citation,
                sc_citation=sc_citation,
                tag_line=tagline_for(row),
                decision_date=decided,
                uploaded_on=today,  # the day this run found it
                pdf_path=pdf_url,
                source_url=source_url,
                slug=(slugify(f"scp {case_number} {title}")[:150].strip("-") or "judgment"),
                is_published=True,
                is_reported=reported,
            )
        )

    return records, len(rows), skipped


def read_html_files(patterns: list[str]) -> list[tuple[str, str]]:
    """Saved search pages: (file name, HTML). Accepts files and glob patterns."""
    files: list[str] = []
    for pattern in patterns:
        matches = sorted(glob.glob(pattern)) or [pattern]
        files.extend(matches)

    pages = []
    for name in files:
        try:
            pages.append((name, Path(name).read_text(encoding="utf-8", errors="replace")))
        except OSError as exc:
            logger.error("Cannot read %s: %s", name, exc)

    return pages


# --- Citations (same rules as the LHC scraper) -------------------------------

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

# PHC listings also write "2019 PLD Pesh. 12" (year first).
PLD_YEAR_FIRST_PATTERN = re.compile(
    r"\b((?:19|20)\d{2})\s+P\s*L\s*D\s+"
    r"(Supreme\s+Court|Federal\s+Shariat\s+Court|Lahore|Lah|Karachi|Kar|Sindh|Peshawar|Pesh|Quetta|Balochistan|Bal|Islamabad|Isl|FSC|SC)"
    r"\.?\s+(\d{1,5})\b",
    flags=re.IGNORECASE,
)

YEAR_FIRST_PATTERN = re.compile(
    r"\b((?:19|20)\d{2})\s+"
    r"(SCMR|CLC|YLR|MLD|CLD|PTD|PLC\s*\(\s*C\s*\.?\s*S\s*\.?\s*\)|PLC\s+CS|PLC|P\s*\.?\s*Cr\s*\.?\s*L\s*\.?\s*J|PCrLJ|"
    r"NLR|PTCL|KLR|GBLR|LHC|SCP|IHC|PHC|SHC|BHC)"
    r"\.?\s+(?:Note\s+)?(\d{1,6})\b",
)


def _key(value: str) -> str:
    return re.sub(r"[\s.]+", "", value).lower()


def extract_citations(text: str) -> list[str]:
    """Every distinct law report citation in ``text``, in order of appearance."""
    text = clean_text(text)
    found: list[tuple[int, str]] = []

    for pattern in (PLD_PATTERN, PLD_YEAR_FIRST_PATTERN):
        for match in pattern.finditer(text):
            year, court, page = match.groups()
            court_name = PLD_COURTS.get(_key(court).replace("-", ""), court.title())
            found.append((match.start(), f"PLD {year} {court_name} {int(page)}"))

    for match in YEAR_FIRST_PATTERN.finditer(text):
        year, reporter, page = match.groups()
        name = YEAR_FIRST_REPORTERS.get(_key(reporter).replace("plccs", "plc(cs)"))
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

    return "\n".join((page.extract_text() or "") for page in reader.pages[:MAX_PDF_PAGES])


def download_pdf(session: requests.Session, config: Config, url: str) -> bytes:
    """Download a court PDF into memory; refuse anything that is not a PDF or is too large."""
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


def add_citations(session: requests.Session, config: Config, records: list[JudgmentRecord], read_pdfs: bool) -> list[JudgmentRecord]:
    """Case law each judgment cites, from its tagline and (once, cached) its PDF; own citations excluded."""
    cache = load_citation_cache()
    enriched: list[JudgmentRecord] = []
    downloaded = 0

    for record in records:
        own = {_key(c) for c in (record.citation, record.sc_citation) if c}
        cited = extract_citations(record.tag_line or "")

        if read_pdfs:
            cached = cache.get(record.pdf_path)
            if cached is None:
                time.sleep(config.delay)
                try:
                    cached = {"cited": extract_citations(read_pdf_text(download_pdf(session, config, record.pdf_path)))}
                    cache[record.pdf_path] = cached
                    downloaded += 1
                    if downloaded % 25 == 0:
                        save_citation_cache(cache)
                except Exception as exc:  # noqa: BLE001 - one unreadable PDF must not stop the run
                    logger.warning("Could not read PDF %s: %s", record.pdf_path, exc)
                    cached = {"cited": []}
            cited += [str(c) for c in cached.get("cited") or []]

        unique: list[str] = []
        for citation in cited:
            if _key(citation) not in own and _key(citation) not in {_key(u) for u in unique}:
                unique.append(citation)
        enriched.append(replace(record, cited_citations=tuple(unique[:MAX_CITED])))

    if read_pdfs:
        save_citation_cache(cache)
        logger.info("Citations read: %d PDFs downloaded, %d from cache.", downloaded, len(records) - downloaded)

    return enriched


# --- Import ------------------------------------------------------------------


def post_record(session: requests.Session, config: Config, payload: dict[str, object]) -> tuple[str, str | None]:
    """POST one record. Returns ``("imported"|"duplicate"|"failed", error)``."""
    headers = {"Authorization": f"Bearer {config.import_token}", "Accept": "application/json"}
    last_error = "unknown error"

    for attempt in range(1, config.max_retries + 1):
        try:
            response = session.post(config.import_url, json=payload, headers=headers, timeout=60)

            if response.status_code in {200, 201}:
                try:
                    body = response.json()
                except ValueError:
                    return "failed", f"HTTP {response.status_code} but the response was not JSON: {response.text[:200]}"
                status = body.get("status", "imported" if response.status_code == 201 else "duplicate")
                return (status, None) if status in {"imported", "duplicate"} else ("failed", f"unexpected API status {status!r}")

            if response.status_code == 429:
                wait = min(int(response.headers.get("Retry-After") or 30), 120)
                logger.warning("The site asked to slow down (429); waiting %ds.", wait)
                time.sleep(wait)
                last_error = "HTTP 429 Too Many Requests"
                continue

            message = f"HTTP {response.status_code}: {response.text[:300]}"
            if response.status_code != 429 and response.status_code < 500:
                return "failed", message
            last_error = message
        except requests.RequestException as exc:
            last_error = f"{type(exc).__name__}: {exc}"

        if attempt < config.max_retries:
            delay = min(2**attempt, 8)
            logger.warning("Import attempt %d/%d failed (%s); retrying in %ds.", attempt, config.max_retries, last_error, delay)
            time.sleep(delay)

    return "failed", last_error


def report_dry_run(records: list[JudgmentRecord], output: Path | None) -> None:
    """Show every judgment found and how it would be saved; save all fields to JSON."""
    for index, record in enumerate(records, start=1):
        verdict = "would import as reported" if record.is_reported else "would import as unreported"
        print(f"\n[{index}] {record.case_type} | {record.case_number}   [{verdict}]")
        print(f"    Title:      {record.title}")
        print(f"    Judge:      {record.judges}")
        print(f"    Citation:   {record.citation or '-'}   SC citation: {record.sc_citation or '-'}")
        print(f"    Decided:    {record.decision_date}   Uploaded (run date): {record.uploaded_on}")
        print(f"    PDF:        {record.pdf_path}")
        print(f"    Tag line:   {(record.tag_line or '-')[:240]}")
        print(f"    Cites:      {', '.join(record.cited_citations) or '-'}")

    target = output or DRY_RUN_FILE
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps([r.as_payload() for r in records], ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Dry run: %d judgments shown above; full data saved to %s. Nothing was imported.", len(records), target)


def collect(config: Config, session: requests.Session, html_files: list[str] | None, reported: bool) -> tuple[list[JudgmentRecord], int]:
    """Records from saved search pages, or from the live Latest Judgments page. Returns (records, skipped)."""
    pages: list[tuple[str, str]]
    if html_files:
        pages = read_html_files(html_files)
    else:
        logger.info("Fetching %s", config.latest_url)
        response = session.get(config.latest_url, timeout=config.timeout)
        response.raise_for_status()
        pages = [(config.latest_url, response.text)]

    records: list[JudgmentRecord] = []
    seen: set[str] = set()
    skipped = 0
    for name, page in pages:
        parsed, total, page_skipped = parse_judgments(page, config.source_url, reported)
        skipped += page_skipped
        fresh = [r for r in parsed if r.pdf_path not in seen]
        seen.update(r.pdf_path for r in fresh)
        records.extend(fresh)
        logger.info("%s: %d rows, %d parsed, %d skipped.", name, total, len(parsed), page_skipped)

    return records, skipped


def run(config: Config, *, dry_run: bool, limit: int | None, html_files: list[str] | None, reported: bool, read_pdfs: bool, output: Path | None) -> int:
    logger.info("Scraper started (dry_run=%s, limit=%s, source=%s).", dry_run, limit or "none", "saved pages" if html_files else "latest")
    session = build_session(config)

    try:
        records, skipped = collect(config, session, html_files, reported)
    except requests.RequestException as exc:
        logger.error("Failed to fetch the Supreme Court page: %s", exc)
        return 1

    if not records:
        logger.error("No judgments parsed; the page may have changed, or a saved file is not a results page.")
        return 1

    logger.info(
        "%d judgments, saved as %s.", len(records),
        "reported (is_reported = 1)" if reported else "unreported (is_reported = 0, hidden until a Reported = Yes import confirms them)",
    )

    if limit:
        records = records[:limit]

    if dry_run:
        report_dry_run(add_citations(session, config, records, read_pdfs), output)
        return 0

    records = add_citations(session, config, records, read_pdfs)

    if not config.import_url or not config.import_token:
        logger.error("JUDGMENTS_IMPORT_URL and JUDGMENTS_IMPORT_TOKEN must be set to import.")
        return 1

    counts = {"imported": 0, "duplicate": 0, "failed": 0}
    for index, record in enumerate(records, start=1):
        if index > 1:
            time.sleep(IMPORT_DELAY)
        status, error = post_record(session, config, record.as_payload())
        counts[status] += 1
        if status == "failed":
            logger.error("[%d/%d] Failed: %s -> %s", index, len(records), record.case_number, error)
        else:
            logger.info("[%d/%d] %s: %s", index, len(records), status.capitalize(), record.case_number)

    logger.info("Scraper completed. Imported=%d Duplicates=%d Failed=%d Skipped=%d.", counts["imported"], counts["duplicate"], counts["failed"], skipped)

    return 1 if counts["failed"] else 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Supreme Court of Pakistan reported judgments.")
    parser.add_argument("--dry-run", action="store_true", help="Test run: show what would be imported and save it to storage/dry-run-results.json; nothing is sent to the site.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--from-html", nargs="+", metavar="FILE", help="Parse search result pages saved from scp.gov.pk/JudgmentsSearch (files or patterns like 'saved/*.html').")
    parser.add_argument("--unreported-pages", action="store_true", help="With --from-html: the saved pages come from a 'Reported = No' search (is_reported = 0). Default: Reported = Yes (is_reported = 1).")
    parser.add_argument("--latest-reported", action="store_true", help="Latest page: save its judgments as reported (is_reported = 1). Default: unreported, because that page has no Reported column.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N judgments.")
    parser.add_argument("--skip-pdf", action="store_true", help="Do not download PDFs; cited case law then comes from the tag line only.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")

    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_dotenv(BASE_DIR / ".env")
    configure_logging(args.verbose)
    config = Config.from_env()

    with single_instance_lock() as acquired:
        if not acquired:
            logger.warning("Another scraper instance is already running; this run will exit.")
            return 0
        try:
            return run(
                config, dry_run=args.dry_run, limit=args.limit, html_files=args.from_html,
                reported=(not args.unreported_pages) if args.from_html else args.latest_reported,
                read_pdfs=not args.skip_pdf, output=args.output,
            )
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())

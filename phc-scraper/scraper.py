#!/usr/bin/env python3
"""Scraper for Peshawar High Court reported judgments.

Reads the PHC "Reported Judgments" search page, parses every row of the results
table, finds the bench of each judgment through the page's judge filter, reads
each judgment PDF in memory to collect the case law it cites, and POSTs every
judgment to the Laravel import endpoint ``/api/judgments/import`` (the same
endpoint and token as the LHC scraper).

Results table columns: S.No | Case | Remarks | Other Citation |
PHC Neutral Citation | Decision Date | S.C.Status | Category | Judgment | SC Judgment

See ``docs/judgment-automation.md`` for setup and deployment.
"""

from __future__ import annotations

import argparse
import fcntl
import html as html_lib
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
from datetime import date, datetime
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
DEFAULT_LISTING_URL = (
    "https://www.peshawarhighcourt.gov.pk/PHCCMS/reportedJudgments.php?action=search"
)
# The PHC server answers 406 Not Acceptable to non-browser clients.
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
MAX_PDF_BYTES = 25 * 1024 * 1024
MAX_PDF_PAGES = 80
MAX_CITED = 150
UNKNOWN_BENCH = "Peshawar High Court"
DRY_RUN_FILE = STORAGE_DIR / "dry-run-results.json"
# The site's category list spells "Revenue" as "Revenu".
CATEGORIES = {"revenu": "Revenue"}

# Seconds between imports, to stay under the site's rate limit (600 a minute).
IMPORT_DELAY = float(os.getenv("IMPORT_DELAY", "0.15"))

logger = logging.getLogger("phc_scraper")


@dataclass(frozen=True)
class Config:
    listing_url: str
    import_url: str
    import_token: str
    timeout: float
    max_retries: int
    delay: float
    user_agent: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            listing_url=os.getenv("PHC_LISTING_URL", DEFAULT_LISTING_URL).strip(),
            import_url=os.getenv("JUDGMENTS_IMPORT_URL", "").strip(),
            import_token=os.getenv("JUDGMENTS_IMPORT_TOKEN", "").strip(),
            timeout=float(os.getenv("REQUEST_TIMEOUT", "180")),
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
    other_citation: str | None
    remarks: str | None
    tag_line: None
    decision_date: str | None
    uploaded_on: str
    pdf_path: str
    source_url: str
    slug: str
    is_published: bool
    cited_citations: tuple[str, ...] = ()
    is_reported: bool = True  # this court's listing only holds judgments approved for reporting

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
    session.headers.update(
        {
            "User-Agent": config.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    retry = Retry(
        total=config.max_retries,
        connect=config.max_retries,
        read=config.max_retries,
        status=config.max_retries,
        backoff_factor=2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
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


def decode_page(content: bytes) -> str:
    """The page declares ISO-8859-1 but its text is UTF-8 (em dashes, quotes).

    Some remarks contain a broken "<br?" tag that would swallow the rest of the row.
    """
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("cp1252", errors="replace")

    return re.sub(r"<br\s*[?/]*\s*>?(?=[^>]*<)", "<br/>", text, flags=re.IGNORECASE)


def is_phc_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    return parsed.scheme in {"http", "https"} and (
        host == "peshawarhighcourt.gov.pk" or host.endswith(".peshawarhighcourt.gov.pk")
    )


def normalise_pdf_url(url: str) -> str:
    """Collapse the double slash the site prints (".../PHCCMS//judgments/x.pdf")."""
    parsed = urlparse(url.strip())

    return parsed._replace(path=re.sub(r"/{2,}", "/", parsed.path)).geturl()


# --- Fetching the listing ----------------------------------------------------


def search(session: requests.Session, config: Config, *, year: int = 0, judge: int = 0) -> str:
    """POST the search form (year 0 = all years, judge 0 = all judges) and return the HTML."""
    response = session.post(
        config.listing_url,
        files={
            "year": (None, str(year)),
            "judge": (None, str(judge)),
            "category": (None, "0"),
            "txtsearchbyremarks": (None, ""),
            "submit": (None, "search"),
        },
        timeout=config.timeout,
    )
    response.raise_for_status()

    return decode_page(response.content)


def parse_judges(page_html: str) -> dict[int, str]:
    """Judge filter options: {id: "Justice ..."}; "All Courts" (0) is left out."""
    soup = BeautifulSoup(page_html, "html.parser")
    select = soup.find("select", attrs={"name": "judge"})
    judges: dict[int, str] = {}

    for option in select.find_all("option") if select else []:
        value = (option.get("value") or "").strip()
        name = clean_text(option.get_text(" ", strip=True))
        if value.isdigit() and int(value) > 0 and name:
            judges[int(value)] = name

    return judges


def tidy_judge(name: str) -> str:
    """Keep the court's wording ("Justice X"); only tidy "Justice(R)" to "Justice (R)"."""
    return re.sub(r"Justice\s*\(R\)", "Justice (R)", clean_text(name), flags=re.IGNORECASE)


# --- Parsing rows ------------------------------------------------------------

CONNECTORS = {"of", "opf", "pf", "0f", "&", "and", "to", "etc", "etc.", ",", "/"}
NUMBER_MARKER = re.compile(r"\b(?:Nos?|N0s?)(?![a-z])\s*[.,:]*\s*", re.IGNORECASE)
VERSUS = re.compile(r"\s(?:Vs\.?|V/s\.?|v\.|versus)\s", re.IGNORECASE)


def split_case(text: str) -> tuple[str, str, str] | None:
    """Split "W.P No. 1517-M, 1518-M etc of 2025 Dilawar Khan Vs The State"
    into ("W.P", "1517-M, 1518-M etc of 2025", "Dilawar Khan Vs The State").

    The type is everything before "No."/"Nos." (or before the first token with a
    digit). Number tokens and connectors ("of", "&", "to", "etc", "(BA)") are then
    taken until the first plain word, which starts the parties' title.
    """
    text = clean_text(text).rstrip(" .")
    versus = VERSUS.search(text)
    head = text[: versus.start()] if versus else text

    marker = NUMBER_MARKER.search(head)
    if marker:
        case_type, start = text[: marker.start()], marker.end()
    else:
        first_digit = re.search(r"\S*\d\S*", head)
        if not first_digit:
            return split_case_title_first(text)
        case_type, start = text[: first_digit.start()], first_digit.start()

    number_end = start
    for token in re.finditer(r"[^\s,&]+|[,&]", text[start:]):
        word = token.group(0)
        bare = word.strip("().").lower()
        if re.search(r"\d", word) or bare in CONNECTORS or re.fullmatch(r"\(?[A-Z]{1,3}\)?", word):
            if not (bare in CONNECTORS and not re.search(r"\d", word)):
                number_end = start + token.end()  # trailing connectors are not part of the number
            continue
        break

    number = clean_text(text[start:number_end]).strip(" ,&")
    title = re.sub(r"^(?:(?:of|opf|pf|0f|etc\.?|&|and|,)\s*)+", "", text[number_end:].strip(), flags=re.IGNORECASE)
    title = clean_text(title).strip(" .,-")
    case_type = clean_text(case_type).strip(" .,-") or "Case"

    if not number or not title:
        return split_case_title_first(text)

    return case_type[:160], number[:60], title[:500]


def split_case_title_first(text: str) -> tuple[str, str, str] | None:
    """Rare rows print the parties first: "A Vs B CM 12(2) No. 14-P of 2023 in W.P No. 2154 of 2010"."""
    match = re.search(r"\s([A-Z][\w.()]*(?:\s+[\w.()]+){0,3}?)\s*No(?![a-z])\s*\.*\s*([\w\-/]+(?:\s+of\s+(?:19|20)\d{2})?)", text)
    if not match or not VERSUS.search(text[: match.start()]):
        return None
    title = clean_text(text[: match.start()]).strip(" .,-")

    return clean_text(match.group(1))[:160] or "Case", clean_text(text[match.start(2) :])[:60], title[:500]


def parse_date(value: str) -> str | None:
    match = re.search(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", value or "")
    if not match:
        return None
    day, month, year = (int(part) for part in match.groups())
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def cell_text(cell) -> str:
    """Remarks keep their line breaks: <br> becomes a new line."""
    for br in cell.find_all("br"):
        br.replace_with("\n")
    text = html_lib.unescape(cell.get_text())
    text = text.replace('\\"', '"').replace("\\'", "'")
    lines = [clean_text(line) for line in text.split("\n")]

    return "\n".join(line for line in lines if line).strip()


def parse_judgments(page_html: str, source_url: str, *, empty_ok: bool = False) -> tuple[list[JudgmentRecord], int, int]:
    """Return ``(records, total_rows, skipped_rows)`` for the results table.

    A search with no results has no table at all; ``empty_ok`` treats that as zero rows.
    """
    soup = BeautifulSoup(page_html, "html.parser")
    body = soup.find("tbody")
    if body is None:
        if not empty_ok:
            logger.error("Could not find the results table (tbody) on the PHC page.")
        return [], 0, 0

    # Only the table's own rows: a few remarks cells contain small tables of their own.
    rows = body.find_all("tr", recursive=False)
    records: list[JudgmentRecord] = []
    skipped = 0

    for position, row in enumerate(rows, start=1):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 9:
            if clean_text(row.get_text(" ")):
                skipped += 1
                logger.warning("Row %d skipped: %d columns.", position, len(cells))
            continue

        anchor = cells[8].find("a", href=True)
        pdf_url = normalise_pdf_url(anchor["href"]) if anchor else ""
        if not pdf_url or not is_phc_url(pdf_url):
            skipped += 1
            logger.warning("Row %d skipped: no PHC judgment link (%r).", position, pdf_url)
            continue

        case_text = clean_text(cells[1].get_text(" "))
        parsed = split_case(case_text)
        decided = parse_date(cells[5].get_text(" "))
        if parsed is None or decided is None:
            skipped += 1
            logger.warning("Row %d skipped: could not parse case or date (%r).", position, case_text[:160])
            continue

        label, number, title = parsed
        category = clean_text(cells[7].get_text(" "))
        category = CATEGORIES.get(category.lower(), category) or "Case"
        # case_type is the PHC category (Civil, Criminal, Service, ...); the court's own label
        # ("RFA", "W.P", "Cr.M (BA)") stays in front of the number: "RFA 04-B of 2026".
        case_type, case_number = category[:160], f"{label} {number}"[:60]
        other = clean_text(cells[3].get_text(" "))
        neutral = clean_text(cells[4].get_text(" ")) or None
        remarks = cell_text(cells[2]) or None

        records.append(
            JudgmentRecord(
                court="PHC",
                case_type=case_type,
                case_number=case_number,
                title=title,
                judges=UNKNOWN_BENCH,
                citation=neutral[:120] if neutral else None,
                other_citation=None if not other or other.lower() == "awaited" else other[:120],
                remarks=remarks,
                tag_line=None,
                decision_date=decided,
                uploaded_on=date.today().isoformat(),  # the day this run found it
                pdf_path=pdf_url,
                source_url=source_url,
                slug=(slugify(f"phc {case_type} {case_number} {title}")[:150].strip("-") or "judgment"),
                is_published=True,
            )
        )

    return records, len(rows), skipped


# --- Benches (judge filter) --------------------------------------------------


def bench_map(session: requests.Session, config: Config, judges: dict[int, str], year: int) -> dict[str, list[str]]:
    """Search once per judge and note which judgments (by PDF URL) list each judge.

    The results table has no judge column; a judgment of a Division Bench appears
    under each of its judges, so all their names are joined.
    """
    benches: dict[str, list[str]] = {}

    for index, (judge_id, name) in enumerate(judges.items(), start=1):
        time.sleep(config.delay)
        try:
            page = search(session, config, year=year, judge=judge_id)
        except requests.RequestException as exc:
            logger.warning("Judge %s (%s) search failed: %s", judge_id, name, exc)
            continue

        records, _, _ = parse_judgments(page, config.listing_url, empty_ok=True)
        for record in records:
            benches.setdefault(record.pdf_path, [])
            if tidy_judge(name) not in benches[record.pdf_path]:
                benches[record.pdf_path].append(tidy_judge(name))
        logger.info("[%d/%d] %s: %d judgments.", index, len(judges), name, len(records))

    return benches


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


def add_citations(
    session: requests.Session, config: Config, records: list[JudgmentRecord], read_pdfs: bool
) -> list[JudgmentRecord]:
    """Attach the case law each judgment cites, from its remarks and (once, cached) its PDF.

    The judgment's own citations (PHC neutral citation and the other report
    citation) are left out of the cited list. An unreadable PDF is logged and the
    record still goes through with what the remarks gave.
    """
    cache = load_citation_cache()
    enriched: list[JudgmentRecord] = []
    downloaded = 0

    for index, record in enumerate(records, start=1):
        own = {_key(c) for c in (record.citation, record.other_citation) if c}
        cited = extract_citations(record.remarks or "")

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
                        logger.info("PDFs read: %d (%d/%d records).", downloaded, index, len(records))
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
    """Show what would be imported, readably, and save every field to a JSON file."""
    for index, record in enumerate(records, start=1):
        print(f"\n[{index}] {record.case_type} | {record.case_number}")
        print(f"    Title:      {record.title}")
        print(f"    Bench:      {record.judges}")
        print(f"    Citation:   {record.citation or '-'}   Other: {record.other_citation or '-'}")
        print(f"    Decided:    {record.decision_date}   Uploaded (run date): {record.uploaded_on}")
        print(f"    PDF:        {record.pdf_path}")
        print(f"    Cites:      {', '.join(record.cited_citations) or '-'}")
        remarks = (record.remarks or "-").replace("\n", " ")
        print(f"    Remarks:    {remarks[:240]}{'…' if len(remarks) > 240 else ''}")

    target = output or DRY_RUN_FILE
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps([r.as_payload() for r in records], ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Dry run: %d records shown above; full data saved to %s. Nothing was imported.", len(records), target)


def run(config: Config, *, dry_run: bool, limit: int | None, year: int, judge: int | None, read_pdfs: bool, resolve_benches: bool, output: Path | None = None) -> int:
    logger.info(
        "Scraper started (dry_run=%s, limit=%s, year=%s, judge=%s, read_pdfs=%s, benches=%s).",
        dry_run, limit or "none", year or "all", judge or "all", read_pdfs, resolve_benches,
    )
    session = build_session(config)

    try:
        logger.info("Fetching listing: %s", config.listing_url)
        page = search(session, config, year=year, judge=judge or 0)
    except requests.RequestException as exc:
        logger.error("Failed to fetch the PHC listing: %s", exc)
        return 1

    records, total_rows, skipped = parse_judgments(page, config.listing_url)
    logger.info("Total rows found: %d. Rows parsed: %d. Rows skipped: %d.", total_rows, len(records), skipped)

    if total_rows == 0 or not records:
        logger.error("No judgment rows parsed; the PHC page may have changed or be unavailable.")
        return 1

    judges = parse_judges(page)
    if judge:
        bench = tidy_judge(judges.get(judge, ""))
        if not bench:
            logger.error("Judge id %s is not in the PHC judge filter.", judge)
            return 1
        records = [replace(r, judges=bench) for r in records]
    elif resolve_benches and judges:
        benches = bench_map(session, config, judges, year)
        records = [replace(r, judges=", ".join(benches[r.pdf_path])) if benches.get(r.pdf_path) else r for r in records]
        unmatched = sum(1 for r in records if r.judges == UNKNOWN_BENCH)
        logger.info("Benches found for %d of %d judgments.", len(records) - unmatched, len(records))

    if limit:
        records = records[:limit]
        logger.info("Limiting this run to %d records.", limit)

    records = add_citations(session, config, records, read_pdfs)

    if dry_run:
        report_dry_run(records, output)
        return 0

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
            logger.error("[%d/%d] Failed: %s %s -> %s", index, len(records), record.case_type, record.case_number, error)
        else:
            logger.info("[%d/%d] %s: %s %s", index, len(records), status.capitalize(), record.case_type, record.case_number)

    logger.info(
        "Scraper completed. Parsed=%d Imported=%d Duplicates=%d Failed=%d Skipped=%d.",
        len(records), counts["imported"], counts["duplicate"], counts["failed"], skipped,
    )

    return 1 if counts["failed"] else 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Peshawar High Court reported judgments.")
    parser.add_argument("--dry-run", action="store_true", help="Test run: show what would be imported and save it to storage/dry-run-results.json; nothing is sent to the site.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N parsed records (newest first).")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--year", type=int, default=None, help="Only judgments decided in this year (default: the current year).")
    group.add_argument("--all-years", action="store_true", help="Every year on the site (first full import; slow).")
    parser.add_argument("--judge", type=int, default=None, help="Only this judge's judgments (id from the PHC judge filter; see --list-judges).")
    parser.add_argument("--list-judges", action="store_true", help="Print the judge filter ids and names, then exit.")
    parser.add_argument("--skip-pdf", action="store_true", help="Do not download PDFs; cited case law then comes from the remarks only.")
    parser.add_argument("--skip-benches", action="store_true", help="Do not search per judge; benches are left as 'Peshawar High Court'.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")

    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_dotenv(BASE_DIR / ".env")
    configure_logging(args.verbose)

    try:
        config = Config.from_env()
    except ValueError as exc:
        logger.error("Invalid scraper configuration: %s", exc)
        return 1

    if args.list_judges:
        session = build_session(config)
        judges = parse_judges(decode_page(session.get(config.listing_url, timeout=config.timeout).content))
        for judge_id, name in judges.items():
            print(f"{judge_id:>4}  {name}")
        return 0

    year = 0 if args.all_years else (args.year or datetime.now().year)

    with single_instance_lock() as acquired:
        if not acquired:
            logger.warning("Another scraper instance is already running; this run will exit.")
            return 0
        try:
            return run(
                config, dry_run=args.dry_run, limit=args.limit, year=year, judge=args.judge,
                read_pdfs=not args.skip_pdf, resolve_benches=not args.skip_benches, output=args.output,
            )
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())

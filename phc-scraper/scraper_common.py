"""Shared pipeline for the judgment scrapers (identical copy in lhc-, phc- and sc-scraper).

Each scraper collects JudgmentRecords from its court's website; this module then:
  1. keeps only judgments not yet sent to the site (storage/state.json, see import_state.py),
  2. orders them oldest decision first, so the newest judgments are added to the site last,
  3. reads each PDF once in memory for the case law it cites (cached) and, when an
     ANTHROPIC_API_KEY is set, writes an AI summary (judgment_summary.py, cached),
  4. in a dry run prints the full counts and what would be imported, saving every field to JSON;
     otherwise POSTs each judgment to the Laravel /api/judgments/import endpoint.
"""

from __future__ import annotations

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
from datetime import date
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Iterator

import requests
from pypdf import PdfReader
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import text_indexer
from import_state import ImportState
from judgment_summary import Summarizer

logger = logging.getLogger("scraper")

MAX_PDF_BYTES = 25 * 1024 * 1024
MAX_PDF_PAGES = 80
MAX_CITED = 150
# Seconds between imports, to stay under the site's rate limit (600 a minute).
IMPORT_DELAY = float(os.getenv("IMPORT_DELAY", "0.15"))


@dataclass(frozen=True)
class Settings:
    import_url: str
    import_token: str
    timeout: float
    max_retries: int
    delay: float
    user_agent: str

    @classmethod
    def from_env(cls, default_timeout: float = 60, default_user_agent: str = "Mozilla/5.0 (compatible; DaBarristerJudgments/1.0)") -> "Settings":
        return cls(
            import_url=os.getenv("JUDGMENTS_IMPORT_URL", "").strip(),
            import_token=os.getenv("JUDGMENTS_IMPORT_TOKEN", "").strip(),
            timeout=float(os.getenv("REQUEST_TIMEOUT", str(default_timeout))),
            max_retries=max(1, int(os.getenv("MAX_RETRIES", "3"))),
            delay=max(0.0, float(os.getenv("REQUEST_DELAY", "1.0"))),
            user_agent=os.getenv("USER_AGENT", default_user_agent).strip(),
        )


@dataclass(frozen=True)
class JudgmentRecord:
    court: str
    case_type: str
    case_number: str
    title: str
    judges: str
    decision_date: str | None
    pdf_path: str
    source_url: str
    slug: str
    bench: bool = False
    apex_court_case: str | None = None
    apex_court_status: str | None = None
    citation: str | None = None
    other_citation: str | None = None
    sc_citation: str | None = None
    tag_line: str | None = None
    remarks: str | None = None
    uploaded_on: str = ""
    is_published: bool = True
    is_reported: bool = True
    cited_citations: tuple[str, ...] = ()
    summary: dict | None = None

    def as_payload(self) -> dict[str, object]:
        payload = asdict(self)
        payload["cited_citations"] = list(self.cited_citations)
        payload["uploaded_on"] = self.uploaded_on or date.today().isoformat()  # the day the scraper ran

        return payload


# --- Infrastructure ----------------------------------------------------------


def configure_logging(storage: Path, verbose: bool = False) -> None:
    storage.mkdir(parents=True, exist_ok=True)
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    root.handlers.clear()
    formatter = logging.Formatter("%(asctime)s %(levelname)-8s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    file_handler = RotatingFileHandler(storage / "scraper.log", maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8")
    file_handler.setFormatter(formatter)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    root.addHandler(file_handler)
    root.addHandler(console)
    for noisy in ("httpx", "httpcore", "urllib3", "pypdf"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


@contextmanager
def single_instance_lock(storage: Path) -> Iterator[bool]:
    """Prevent overlapping cron runs with a non-blocking advisory lock."""
    storage.mkdir(parents=True, exist_ok=True)
    handle = (storage / "scraper.lock").open("w", encoding="utf-8")
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


def build_session(settings: Settings, accept: str = "text/html,application/xhtml+xml,*/*;q=0.8") -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": settings.user_agent, "Accept": accept, "Accept-Language": "en-US,en;q=0.9"})
    retry = Retry(
        total=settings.max_retries, connect=settings.max_retries, read=settings.max_retries, status=settings.max_retries,
        backoff_factor=2, status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset({"GET", "POST"}), raise_on_status=False,
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


def parse_date(value: str | None) -> str | None:
    """dd-mm-yyyy (or with / or .) to yyyy-mm-dd."""
    match = re.search(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", value or "")
    if not match:
        return None
    day, month, year = (int(part) for part in match.groups())
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def merge_benches(records: list[JudgmentRecord]) -> list[JudgmentRecord]:
    """One record per PDF; a judgment found under several judges (a bench) lists all of them."""
    merged: dict[str, JudgmentRecord] = {}
    for record in records:
        existing = merged.get(record.pdf_path)
        if existing is None:
            merged[record.pdf_path] = record
            continue
        names = [n for n in existing.judges.split(", ") if n]
        for name in record.judges.split(", "):
            if name and name not in names:
                names.append(name)
        merged[record.pdf_path] = replace(existing, judges=", ".join(names)[:500])

    return list(merged.values())


# --- Citations ----------------------------------------------------------------

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


def download_pdf(session: requests.Session, settings: Settings, url: str) -> bytes:
    """Download a court PDF into memory; refuse anything that is not a PDF or is too large."""
    with session.get(url, timeout=settings.timeout, stream=True) as response:
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


class JsonCache:
    def __init__(self, path: Path) -> None:
        self.path = path
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            self.data: dict[str, dict] = data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            self.data = {}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.data, ensure_ascii=False, indent=0), encoding="utf-8")
        temporary.replace(self.path)


# --- The pipeline -------------------------------------------------------------


class Pipeline:
    """Shared steps after a scraper has collected its records."""

    def __init__(self, settings: Settings, storage: Path, *, read_pdfs: bool = True, summaries: bool = True, index_text: bool = False) -> None:
        self.settings = settings
        self.storage = storage
        self.read_pdfs = read_pdfs
        self.session = build_session(settings, accept="application/pdf,*/*;q=0.8")
        self.state = ImportState(storage / "state.json")
        self.citations = JsonCache(storage / "pdf_citations.json")
        self.summarizer = Summarizer(storage / "summaries.json", enabled=summaries)
        self.index_text = index_text
        # The text endpoint sits beside the import endpoint (/api/judgments/import -> /api/judgments/text).
        self.text_url = re.sub(r"/import/?$", "/text", settings.import_url) if settings.import_url else ""
        self.text_results: dict[str, text_indexer.TextResult] = {}

    def pending(self, records: list[JudgmentRecord], resend: bool = False) -> list[JudgmentRecord]:
        """Judgments the site does not have yet, oldest decision first (today's go in last)."""
        todo = records if resend else [r for r in records if not self.state.is_imported(r.pdf_path)]

        return sorted(todo, key=lambda r: (r.decision_date or "0000-00-00", r.case_number))

    def enrich(self, record: JudgmentRecord) -> JudgmentRecord:
        """Cited case law (remarks/tag line + PDF) and the AI summary; each PDF is read at most once per run."""
        own = {_key(c) for c in (record.citation, record.other_citation, record.sc_citation) if c}
        cited = extract_citations(" ".join(filter(None, [record.tag_line, record.remarks])))
        cached = self.citations.data.get(record.pdf_path)
        summary = self.summarizer.cached(record.pdf_path)
        wants_index = self.index_text and record.pdf_path not in self.text_results and not self.state.is_indexed(record.pdf_path)
        needs_text = (self.read_pdfs and cached is None) or (self.summarizer.enabled and summary is None) or wants_index

        text = ""
        if needs_text:
            time.sleep(self.settings.delay)
            content = b""
            try:
                content = download_pdf(self.session, self.settings, record.pdf_path)
                text = read_pdf_text(content)
            except Exception as exc:  # noqa: BLE001 - one unreadable PDF must not stop the run
                logger.warning("Could not read PDF %s: %s", record.pdf_path, exc)
            if cached is None and text:
                cached = {"cited": extract_citations(text)}
                self.citations.data[record.pdf_path] = cached
            # Full page-by-page text + keywords for phrase/keyword search, from the same download.
            if content and wants_index:
                self.text_results[record.pdf_path] = text_indexer.extract(content)

        cited += [str(c) for c in (cached or {}).get("cited") or []]
        unique: list[str] = []
        for citation in cited:
            if _key(citation) not in own and _key(citation) not in {_key(u) for u in unique}:
                unique.append(citation)

        if summary is None and self.summarizer.enabled:
            source = text or " ".join(filter(None, [record.tag_line, record.remarks]))
            summary = self.summarizer.summarize(record.pdf_path, source, {
                "Court": record.court, "Case": f"{record.case_type} {record.case_number}", "Title": record.title,
                "Bench": record.judges, "Decision date": record.decision_date, "Citation": record.citation or record.sc_citation,
                "Tag line": record.tag_line, "Remarks (court headnote)": record.remarks,
            })

        return replace(record, cited_citations=tuple(unique[:MAX_CITED]), summary=summary)

    def save_caches(self) -> None:
        self.citations.save()
        self.summarizer.save()
        self.state.save()

    def send_text(self, record: JudgmentRecord) -> None:
        """POST a judgment's extracted page text + keywords to the site's /text endpoint (idempotent)."""
        result = self.text_results.get(record.pdf_path)
        if result is None or not result.pages or not self.text_url:
            return

        payload = {
            "pdf_path": record.pdf_path,
            "ocr_used": result.ocr_used,
            "status": result.status,
            "pages": [{"page": number, "body": body} for number, body in result.pages],
            "keywords": [{"keyword": keyword[:190], "frequency": frequency} for keyword, frequency in result.keywords],
        }
        headers = {"Authorization": f"Bearer {self.settings.import_token}", "Accept": "application/json"}
        try:
            response = self.session.post(self.text_url, json=payload, headers=headers, timeout=120)
        except requests.RequestException as exc:
            logger.warning("Text index POST failed for %s: %s", record.case_number, exc)
            return

        if response.status_code == 200:
            self.state.mark_indexed(record.pdf_path)
            body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            logger.info("    Indexed text: %s pages, %s keywords%s.", body.get("pages", "?"), body.get("keywords", "?"), " (OCR)" if result.ocr_used else "")
        elif response.status_code == 404:
            logger.warning("Text index: no judgment yet for %s (metadata import must land first).", record.case_number)
        else:
            logger.warning("Text index failed for %s: HTTP %s %s", record.case_number, response.status_code, response.text[:200])

    def post(self, payload: dict[str, object]) -> tuple[str, str | None]:
        """POST one judgment. Returns ("imported"|"duplicate"|"failed", error)."""
        headers = {"Authorization": f"Bearer {self.settings.import_token}", "Accept": "application/json"}
        last_error = "unknown error"

        for attempt in range(1, self.settings.max_retries + 1):
            try:
                response = self.session.post(self.settings.import_url, json=payload, headers=headers, timeout=60)
                if response.status_code in {200, 201}:
                    try:
                        status = response.json().get("status", "imported" if response.status_code == 201 else "duplicate")
                    except ValueError:
                        return "failed", f"HTTP {response.status_code} but the response was not JSON: {response.text[:200]}"
                    return (status, None) if status in {"imported", "duplicate"} else ("failed", f"unexpected API status {status!r}")
                if response.status_code == 429:
                    wait = min(int(response.headers.get("Retry-After") or 30), 120)
                    logger.warning("The site asked to slow down (429); waiting %ds.", wait)
                    time.sleep(wait)
                    last_error = "HTTP 429 Too Many Requests"
                    continue
                message = f"HTTP {response.status_code}: {response.text[:300]}"
                if response.status_code < 500:
                    return "failed", message
                last_error = message
            except requests.RequestException as exc:
                last_error = f"{type(exc).__name__}: {exc}"

            if attempt < self.settings.max_retries:
                time.sleep(min(2**attempt, 8))

        return "failed", last_error

    def run(self, found: list[JudgmentRecord], *, groups: dict[str, int], dry_run: bool, limit: int | None, resend: bool, output: Path | None) -> int:
        """Counts, new judgments only, oldest first, enrich, then dry run report or import."""
        new = self.pending(found, resend)
        logger.info(
            "Found %d judgments in total; already on the site: %d; to %s now: %d.",
            len(found), len(found) - len(new) if not resend else 0, "check" if dry_run else "import", len(new),
        )
        if limit:
            new = new[:limit]
            logger.info("Limited to the first %d (oldest first).", limit)
        if self.summarizer.enabled:
            logger.info("AI summaries on (model %s, effort %s).", self.summarizer.model, self.summarizer.effort)
        elif not os.getenv("ANTHROPIC_API_KEY"):
            logger.info("AI summaries off: set ANTHROPIC_API_KEY in .env to turn them on.")
        if self.index_text:
            logger.info("PDF text indexing on (phrase/keyword search)%s.", "" if text_indexer.ocr_available() else "; OCR unavailable (install tesseract for scanned judgments)")

        if dry_run:
            enriched = []
            for index, record in enumerate(new, start=1):
                enriched.append(self.enrich(record))
                if index % 25 == 0:
                    self.citations.save()
                    self.summarizer.save()
            self.citations.save()
            self.summarizer.save()
            report_dry_run(found, enriched, groups, self.state, output or self.storage / "dry-run-results.json", self.text_results)
            return 0

        if not self.settings.import_url or not self.settings.import_token:
            logger.error("JUDGMENTS_IMPORT_URL and JUDGMENTS_IMPORT_TOKEN must be set to import.")
            return 1

        counts = {"imported": 0, "duplicate": 0, "failed": 0}
        for index, record in enumerate(new, start=1):
            record = self.enrich(record)
            if index > 1:
                time.sleep(IMPORT_DELAY)
            status, error = self.post(record.as_payload())
            counts[status] += 1
            if status == "failed":
                logger.error("[%d/%d] Failed: %s %s -> %s", index, len(new), record.case_type, record.case_number, error)
            else:
                self.state.mark(record.pdf_path)
                logger.info("[%d/%d] %s: %s %s (%s)", index, len(new), status.capitalize(), record.case_type, record.case_number, record.decision_date or "no date")
                if self.index_text:
                    self.send_text(record)
            if index % 25 == 0:
                self.save_caches()

        self.save_caches()
        logger.info("Completed. Imported=%d Already there=%d Failed=%d.", counts["imported"], counts["duplicate"], counts["failed"])

        return 1 if counts["failed"] else 0


def report_dry_run(found: list[JudgmentRecord], shown: list[JudgmentRecord], groups: dict[str, int], state: ImportState, target: Path, text_results: dict[str, "text_indexer.TextResult"] | None = None) -> None:
    """Full counts first, then each judgment that would be imported, and all fields saved to JSON."""
    print(f"\n=== {len(found)} judgments found; {sum(1 for r in found if state.is_imported(r.pdf_path))} already imported; {len(found) - sum(1 for r in found if state.is_imported(r.pdf_path))} new ===")
    if groups:
        print("By judge / source:")
        for name, count in sorted(groups.items(), key=lambda item: (-item[1], item[0])):
            print(f"  {count:>5}  {name}")

    for index, record in enumerate(shown or [], start=1):
        print(f"\n[{index}] {record.case_type} | {record.case_number}   [{'reported' if record.is_reported else 'unreported'}]")
        print(f"    Title:      {record.title}")
        print(f"    Bench:      {record.judges}  [{'D.B.' if record.bench else 'S.B.'}]")
        if record.apex_court_case or record.apex_court_status:
            print(f"    Apex court: {record.apex_court_case or '-'}  ({record.apex_court_status or '-'})")
        print(f"    Citation:   {record.citation or '-'}   Other: {record.other_citation or '-'}   SC: {record.sc_citation or '-'}")
        print(f"    Decided:    {record.decision_date or '-'}   Uploaded (run date): {record.as_payload()['uploaded_on']}")
        print(f"    PDF:        {record.pdf_path}")
        if record.tag_line:
            print(f"    Tag line:   {record.tag_line[:240]}")
        if record.remarks:
            remarks = record.remarks.replace("\n", " ")
            print(f"    Remarks:    {remarks[:240]}{'…' if len(remarks) > 240 else ''}")
        print(f"    Cites:      {', '.join(record.cited_citations) or '-'}")
        result = (text_results or {}).get(record.pdf_path)
        if result is not None:
            print(f"    Text:       {result.page_count} pages ({result.status}{', OCR' if result.ocr_used else ''}); keywords: {', '.join(k for k, _ in result.keywords[:12]) or '-'}")
        if record.summary:
            print(f"    Summary:    {record.summary.get('overview', '')[:300]}")
            print(f"    Outcome:    {record.summary.get('outcome', '')}")

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps([r.as_payload() for r in shown or []], ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Dry run: %d shown; full data saved to %s. Nothing was imported.", len(shown or []), target)

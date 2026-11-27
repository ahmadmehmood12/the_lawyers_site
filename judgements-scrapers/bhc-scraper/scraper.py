#!/usr/bin/env python3
"""Balochistan High Court reported judgments, judge by judge (sitting judges first, then former).

Judge list:  https://bhc.gov.pk/resources/judgments
  Each judge card links to  .../resources/judgments/<judge-slug>/reported-judgments , one page with
  every reported judgment of that judge as a ".judgmentbox":
    .title strong  -> title (party names)
    .note i        -> citation, e.g. "CLD 2024 462"
    .filelink a[data-src] -> the PDF, e.g. https://bhc.gov.pk/media/judgments/1584.pdf

Everything else is read from the PDF (law-report header), e.g.
    Before Iqbal Ahmed Kasi and Muhammad Aamir Nawaz Rana, JJ
    Sales Tax Reference Appeal No.06 of 2025, decided on 10th December, 2025.
  -> judges "Justice Iqbal Ahmed Kasi, Justice Muhammad Aamir Nawaz Rana" (2+ judges = Division Bench),
     case_type "Sales Tax Reference Appeal", case_number "06 of 2025", decision_date 2025-12-10.
A judgment listed under several judges (a division bench) is saved once (same PDF).

Each new PDF is downloaded ONCE: its header is parsed here and the same bytes are reused by the
pipeline for the stored copy, page text, keywords and cited citations. Parsed headers are cached in
storage/pdf_meta.json. The first run imports everything; later runs send only new judgments
(storage/state.json). Uploaded date = the day the scraper runs. See docs/judgment-automation.md.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import logging
import re
from datetime import date
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

import scraper_common
from import_state import ImportState
from scraper_common import JudgmentRecord, Pipeline, Settings, build_session, clean_optional, clean_text, configure_logging, merge_benches, single_instance_lock, slugify

BASE_DIR = Path(__file__).resolve().parent
STORAGE = BASE_DIR / "storage"
JUDGES_URL = "https://bhc.gov.pk/resources/judgments"
META_FILE = STORAGE / "pdf_meta.json"
PDF_CACHE = STORAGE / "pdf_cache"
BROWSER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
# "decided on 10th December, 2025" (PLD style) or "decided on 31.5.2023" (PLJ style).
DECIDED = re.compile(r"(?:decided|heard|announced)\s+(?:on\s*)?:?\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+|[./-])?\s*([A-Za-z]{3,9}|\d{1,2})\.?,?[./-]?\s*(\d{4})", flags=re.IGNORECASE)
CASE_HEAD = re.compile(r"^(?P<type>.*?[A-Za-z.)])\s*(?:Nos?\s*\.?\s*)?(?P<number>(?:\([A-Za-z]{1,3}\)|[A-Za-z]{1,3}-)?\s*\d[\w\-/]*)")
YEAR = re.compile(r"\bof\s+((?:19|20)\d{2})\b")

logger = logging.getLogger("bhc_scraper")


# ---------------------------------------------------------------- listing pages

def judge_links(page_html: str) -> list[dict]:
    """[{name, url, former}] in page order; cards after the "Former Justices" heading are former judges."""
    soup = BeautifulSoup(page_html, "html.parser")
    judges: list[dict] = []
    seen: set[str] = set()
    # The "Former Justices" section heading (not the menu link of the same name) starts the former judges.
    heading = next((h for h in soup.find_all(["h1", "h2", "h3"]) if re.search(r"Former\s+Justices", h.get_text(" "), flags=re.IGNORECASE)), None)
    former_ids = {id(a) for a in heading.find_all_next("a")} if heading else set()
    for anchor in soup.select('a[href$="/reported-judgments"]'):
        url = urljoin(JUDGES_URL, anchor["href"].strip())
        heading = anchor.find_previous("h3")
        name = clean_text(heading.find("span").get_text(" ") if heading and heading.find("span") else "")
        if not name or url in seen:
            continue
        seen.add(url)
        former = id(anchor) in former_ids
        judges.append({"name": name, "url": url, "former": former})

    return judges


def parse_judge_page(page_html: str) -> list[dict]:
    """[{title, citation, pdf}] for every judgment box on one judge's page."""
    soup = BeautifulSoup(page_html, "html.parser")
    rows: list[dict] = []
    for box in soup.select(".judgmentbox"):
        link = box.select_one(".filelink a[data-src], .filelink a[href$='.pdf']")
        pdf = (link.get("data-src") or link.get("href") or "").strip() if link else ""
        title = clean_text((box.select_one(".title") or box).get_text(" ")).rstrip(" ,")
        note = box.select_one(".note")
        if not pdf.lower().endswith(".pdf") or not title:
            continue
        rows.append({"title": title, "citation": clean_optional(note.get_text(" ") if note else None), "pdf": urljoin(JUDGES_URL, pdf)})

    return rows


# ---------------------------------------------------------------- PDF header

def _header_text(content: bytes) -> str:
    """Text of the first two pages, line breaks kept, spaces collapsed (PyMuPDF, else pypdf)."""
    try:
        import fitz  # PyMuPDF

        with fitz.open(stream=content, filetype="pdf") as doc:
            text = " ".join(page.get_text("text") for page in list(doc)[:2])
    except Exception:  # noqa: BLE001
        from pypdf import PdfReader

        text = " ".join((page.extract_text() or "") for page in PdfReader(io.BytesIO(content)).pages[:2])

    text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) < 200:
        text = _ocr_first_pages(content) or text

    return text


def _ocr_first_pages(content: bytes) -> str:
    """Scanned PDF (image only): read the header from an OCR of the first two pages, if Tesseract is installed."""
    import text_indexer

    if not text_indexer.ocr_available():
        return ""
    try:
        import fitz
        import pytesseract
        from PIL import Image

        with fitz.open(stream=content, filetype="pdf") as doc:
            images = [Image.open(io.BytesIO(page.get_pixmap(dpi=text_indexer.OCR_DPI).tobytes("png"))) for page in list(doc)[:2]]
        return re.sub(r"[ \t]+", " ", "\n".join(pytesseract.image_to_string(image) for image in images)).strip()
    except Exception:  # noqa: BLE001
        return ""


def parse_header(content: bytes) -> dict:
    """{judges[], case_type, case_number, decision_date} from the law-report header of a judgment PDF."""
    raw = _header_text(content)
    text = re.sub(r"\s+", " ", raw)
    meta: dict = {"judges": [], "case_type": None, "case_number": None, "decision_date": None}

    # "Before X and Y, JJ" / "Present: X C.J and Y, J." — the whole line (plus the next if the names wrap).
    if before := re.search(r"\b(?:Before|Present)\s*:?\s*([^\n]+)(?:\n([^\n]+))?", raw[:2000]):
        line = before.group(1)
        if not re.search(r"\b(?:JJ|J|C\.?\s?J)\.?\s*$", line) and before.group(2) and len(before.group(2)) < 80:
            line += " " + before.group(2)
        line = re.sub(r"\s*,?\s*\b(?:JJ|J)\.?\s*$", "", line.strip())
        names = re.split(r"\s*,\s*|\s+and\s+|\s*&\s*", line, flags=re.IGNORECASE)
        cleaned = [clean_text(re.sub(r"\s*,?\s*\b(?:C\.?\s?J|JJ|J)\.?$", "", n)).strip(" ,.") for n in names]
        # PLJ prints names in capitals ("SARDAR AHMAD HALEEMI"); store them in title case.
        meta["judges"] = [f"Justice {n.title() if n.isupper() else n}" for n in cleaned if n and len(n) > 2][:7]

    decided = DECIDED.search(text[:4000])
    if decided:
        part = decided.group(2)
        month = int(part) if part.isdigit() and 1 <= int(part) <= 12 else MONTHS.get(part[:3].lower())
        try:
            meta["decision_date"] = date(int(decided.group(3)), month, int(decided.group(1))).isoformat() if month else None
        except ValueError:
            pass

    # The case line(s) just above "decided on", e.g. "Criminal Appeal No.6 and Criminal Revision No.7 of 2007,"
    # / "F.A.O. 153 of 2009," / "Constitution Petition No.(S)34 of 2019,". Party lines ("…---Respondents",
    # "Versus") end the block.
    raw_decided = DECIDED.search(raw[:5000])
    if raw_decided:
        lines = raw[: raw_decided.start()].split("\n")
        block: list[str] = []
        for line in reversed(lines):
            line = line.strip()
            if not line:
                if block:
                    break
                continue
            if "--" in line or re.fullmatch(r"versus|vs\.?", line, flags=re.IGNORECASE) or re.search(r"\]$|\bJJ?\.?$", line):
                break
            block.insert(0, line)
            if len(block) == 3:
                break
        # A party name can sit right above the case line without a "---" marker ("…Islamabad and 3 others");
        # the case line has "No." or "<n> of <year>".
        while len(block) > 1 and not re.search(r"\bNos?\s*\.|\d\s+of\s+(?:19|20)\d{2}", block[0]):
            block.pop(0)
        descriptor = clean_text(" ".join(block)).rstrip(" ,")
        head = CASE_HEAD.match(descriptor)
        years = YEAR.findall(descriptor)
        if head and years:
            meta["case_type"] = clean_text(head.group("type")).strip(" ,")[:160] or None
            meta["case_number"] = f"{clean_text(head.group('number'))} of {years[-1]}"[:60]
            # Several cases decided together: keep the full list.
            if len(re.findall(r"\d+", descriptor)) > 2:
                meta["cases"] = descriptor[:500]

    return meta


# ---------------------------------------------------------------- one download per PDF

def _cache_path(url: str) -> Path:
    return PDF_CACHE / (hashlib.sha1(url.encode()).hexdigest() + ".pdf")


_original_download = scraper_common.download_pdf


def _cached_download(session: requests.Session, settings: Settings, url: str) -> bytes:
    """The pipeline's download_pdf, served from the copy fetched while parsing the header (then removed)."""
    path = _cache_path(url)
    if path.exists():
        content = path.read_bytes()
        path.unlink(missing_ok=True)
        return content
    return _original_download(session, settings, url)


scraper_common.download_pdf = _cached_download


def load_meta() -> dict:
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_meta(meta: dict) -> None:
    META_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = META_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(meta, indent=0, ensure_ascii=False), encoding="utf-8")
    tmp.replace(META_FILE)


# ---------------------------------------------------------------- collect

def pdf_number(url: str) -> int:
    match = re.search(r"/(\d+)\.pdf$", url)
    return int(match.group(1)) if match else 0


def collect(session: requests.Session, settings: Settings, args: argparse.Namespace) -> tuple[list[JudgmentRecord], dict[str, int]]:
    response = session.get(JUDGES_URL, timeout=settings.timeout)
    response.raise_for_status()
    judges = judge_links(response.text)
    if not judges:
        raise RuntimeError("No judges found on the BHC judgments page; the site may have changed.")
    if args.only:
        judges = [j for j in judges if j["former"] == (args.only == "former")]
    if args.judge:
        judges = [j for j in judges if args.judge.lower() in j["name"].lower()]
    logger.info("%d judges (%d sitting, %d former).", len(judges), sum(not j["former"] for j in judges), sum(j["former"] for j in judges))

    listed: dict[str, dict] = {}  # pdf url -> listing row + the judges whose page lists it
    groups: dict[str, int] = {}
    for index, judge in enumerate(judges, start=1):
        label = f"{judge['name']} ({'former' if judge['former'] else 'sitting'})"
        try:
            page = session.get(judge["url"], timeout=settings.timeout)
            page.raise_for_status()
            rows = parse_judge_page(page.text)
        except requests.RequestException as exc:
            logger.warning("[%d/%d] %s: could not load (%s).", index, len(judges), label, exc)
            continue
        groups[label] = len(rows)
        logger.info("[%d/%d] %s: %d reported judgments.", index, len(judges), label, len(rows))
        for row in rows:
            entry = listed.setdefault(row["pdf"], {**row, "listed_under": []})
            entry["listed_under"].append(judge)
            entry["citation"] = entry["citation"] or row["citation"]

    state = ImportState(STORAGE / "state.json")
    meta = load_meta()
    full = args.resend or args.index_only or args.reindex_scanned
    wanted = [url for url in listed if full or not state.is_imported(url)]
    wanted.sort(key=pdf_number)  # the site numbers PDFs in upload order: oldest first
    if args.limit and not full:
        wanted = wanted[: args.limit]

    to_parse = [url for url in wanted if url not in meta]
    if to_parse:
        logger.info("Reading the header of %d new PDFs (case number, bench, decision date)…", len(to_parse))
    PDF_CACHE.mkdir(parents=True, exist_ok=True)
    for count, url in enumerate(to_parse, start=1):
        try:
            content = _original_download(session, settings, url)
            meta[url] = parse_header(content)
            if not args.dry_run:
                _cache_path(url).write_bytes(content)  # reused by the pipeline, then deleted
        except Exception as exc:  # noqa: BLE001 - one bad PDF must not stop the run
            logger.warning("Could not read %s: %s", url, exc)
            meta[url] = {"judges": [], "case_type": None, "case_number": None, "decision_date": None, "error": str(exc)[:200]}
        if count % 25 == 0:
            save_meta(meta)
    save_meta(meta)

    records = []
    for url in wanted:
        row, info = listed[url], meta.get(url, {})
        listed_names = [j["name"] for j in row["listed_under"]]
        judges_text = ", ".join(info.get("judges") or listed_names)
        bench = len(info.get("judges") or listed_names) > 1
        case_type = info.get("case_type") or "Case"
        case_number = info.get("case_number") or f"BHC-{pdf_number(url)}"
        if not info.get("case_number"):
            logger.warning("No case number found in %s; using %s.", url, case_number)
        former = all(j["former"] for j in row["listed_under"])
        records.append(JudgmentRecord(
            court="BHC",
            case_type=case_type,
            case_number=case_number,
            title=row["title"][:500],
            judges=judges_text[:500],
            bench=bench,
            decision_date=info.get("decision_date"),
            pdf_path=url,
            source_url=row["listed_under"][0]["url"] if not former else JUDGES_URL,
            slug=(slugify(f"bhc {case_type} {case_number} {row['title']}")[:150].strip("-") or "judgment"),
            citation=row["citation"][:120] if row["citation"] else None,
            remarks=f"Decided together: {info['cases']}." if info.get("cases") else None,
            is_reported=True,
            is_published=True,
        ))

    return merge_benches(records), groups


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import Balochistan High Court reported judgments, judge by judge.")
    parser.add_argument("--dry-run", action="store_true", help="Test run: counts per judge and what would be imported (storage/dry-run-results.json); nothing is sent.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N new judgments (oldest first).")
    parser.add_argument("--judge", default=None, help="Only judges whose name contains this text.")
    parser.add_argument("--only", choices=["sitting", "former"], default=None, help="Only sitting or only former judges.")
    parser.add_argument("--resend", action="store_true", help="Send every judgment found again (fills empty fields, e.g. a citation added later).")
    parser.add_argument("--skip-pdf", action="store_true", help="Do not read PDFs for cited case law (the header is still read).")
    parser.add_argument("--skip-summary", action="store_true", help="Do not write AI summaries.")
    parser.add_argument("--no-store-pdf", action="store_true", help="Do not store the PDF on the site (on by default).")
    parser.add_argument("--no-index-text", action="store_true", help="Do not extract and send full text + keywords (on by default).")
    parser.add_argument("--index-only", action="store_true", help="Only add text + keywords (and the stored PDF) for judgments already on the site.")
    parser.add_argument("--reindex-scanned", action="store_true", help="OCR again the judgments whose text on the site is partial / empty (scanned PDFs read without OCR). Needs tesseract.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    load_dotenv(BASE_DIR / ".env")
    configure_logging(STORAGE, args.verbose)
    settings = Settings.from_env(default_timeout=120, default_user_agent=BROWSER_AGENT)

    with single_instance_lock(STORAGE) as acquired:
        if not acquired:
            logger.warning("Another scraper instance is already running; this run will exit.")
            return 0
        try:
            pipeline = Pipeline(settings, STORAGE, read_pdfs=not args.skip_pdf, summaries=not args.skip_summary, index_text=not args.no_index_text, store_pdf=not args.no_store_pdf)
            records, groups = collect(build_session(settings), settings, args)
            if not groups:
                logger.error("No judge pages could be read; the BHC site may be unavailable.")
                return 1
            if not records:
                logger.info("Nothing new.")
                return 0
            return pipeline.run(records, groups=groups, dry_run=args.dry_run, limit=args.limit, resend=args.resend, output=args.output, index_only=args.index_only, reindex_scanned=args.reindex_scanned)
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1
        finally:
            # Leftover header downloads (e.g. a failed import) are fetched again next time.
            for leftover in PDF_CACHE.glob("*.pdf") if PDF_CACHE.exists() else []:
                leftover.unlink(missing_ok=True)


if __name__ == "__main__":
    raise SystemExit(main())

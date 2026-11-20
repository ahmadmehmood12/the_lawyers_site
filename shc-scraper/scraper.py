#!/usr/bin/env python3
"""Sindh High Court reported (Approved For Reporting) judgments, judge by judge.

Judge list (34 sitting + former judges, each with an "AFR" count linking to that judge's page):
  https://caselaw.shc.gov.pk/caselaw/public/rpt-afr

For every judge the scraper opens that judge's AFR page
(.../public/reported-judgements-detail-all/<id>/AFR/AFR) and reads each judgment row:
  Code | S.No | Citation | Case No (label + (S.B./D.B.) + download link) | Case Type | Case Year |
  Parties | Bench | Order Date | A.F.R | Tag Line | Bench | Apex Court | Apex Status.
These pages are DataTables grids that return every row in one response (no pagination).

A judgment that appears under several judges (a division bench) is saved once; its judge column
already lists the whole bench. Bench type comes from the "(D.B.)"/"(S.B.)" marker in the case label.
Every run after the first sends only judgments the site does not have yet, oldest decision first.

Uploaded date = the day the scraper runs. See docs/judgment-automation.md.
"""

from __future__ import annotations

import argparse
import logging
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from scraper_common import JudgmentRecord, Pipeline, Settings, build_session, clean_text, configure_logging, merge_benches, single_instance_lock, slugify

BASE_DIR = Path(__file__).resolve().parent
STORAGE = BASE_DIR / "storage"
# The site declares <base href="/caselaw/">, so every relative link resolves against this.
SITE_BASE = "https://caselaw.shc.gov.pk/caselaw/"
JUDGES_URL = "https://caselaw.shc.gov.pk/caselaw/public/rpt-afr"
SOURCE_URL = JUDGES_URL
BROWSER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
BENCH_MARKER = re.compile(r"\((D\.?B\.?|S\.?B\.?)\)", flags=re.IGNORECASE)

logger = logging.getLogger("shc_scraper")


def judge_links(page_html: str) -> list[tuple[str, str, int]]:
    """(AFR page URL, judge full name, the site's own AFR count) for each judge on the list page."""
    soup = BeautifulSoup(page_html, "html.parser")
    judges: list[tuple[str, str, int]] = []

    for row in soup.find_all("tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 4:
            continue
        anchor = row.find("a", href=re.compile(r"reported-judgements-detail-all/\d+/AFR/AFR"))
        name = clean_text(cells[1].get_text(" "))
        if anchor is None or not name:
            continue
        url = urljoin(SITE_BASE, anchor["href"].strip())
        count = int(re.sub(r"\D", "", anchor.get_text()) or "0")
        judges.append((url, name, count))

    return judges


def is_shc_pdf(url: str) -> bool:
    return bool(re.match(r"^https?://([a-z0-9-]+\.)*shc\.gov\.pk/", url, flags=re.IGNORECASE))


def parse_shc_date(value: str) -> str | None:
    """Dates look like "23-MAY-25" (dd-MON-yy); returns yyyy-mm-dd."""
    match = re.search(r"(\d{1,2})-([A-Za-z]{3})-(\d{2,4})", value or "")
    if not match:
        return None
    for fmt in ("%d-%b-%y", "%d-%b-%Y"):
        try:
            return datetime.strptime(match.group(0), fmt).date().isoformat()
        except ValueError:
            continue

    return None


def case_number_and_bench(label: str) -> tuple[str, bool]:
    """From "Cr.Rev 135/2024 (D.B.) Sindh High Court, Karachi --> ..." -> ("Cr.Rev 135/2024", True)."""
    text = clean_text(label)
    marker = BENCH_MARKER.search(text)
    is_division = bool(marker and marker.group(1).upper().startswith("D"))
    if marker:
        number = text[:marker.start()].strip()
    else:
        number = re.split(r"\bSindh High Court\b|-->", text, maxsplit=1)[0].strip()

    return (number or text)[:60], is_division


def pdf_url(case_cell) -> str:
    """The judgment's download link, preferred over the inline viewer link; absolute."""
    download = case_cell.find("a", href=re.compile(r"download-file\.php\?doc="))
    viewer = case_cell.find("a", href=re.compile(r"(download-file\.php|view-file)"))
    anchor = download or viewer
    if anchor is None:
        return ""

    return urljoin(SITE_BASE, anchor["href"].strip())


def parse_judge_page(page_html: str, judge_name: str) -> list[JudgmentRecord]:
    """Every judgment row on one judge's AFR page."""
    soup = BeautifulSoup(page_html, "html.parser")
    records: list[JudgmentRecord] = []
    body = soup.find("tbody") or soup

    for row in body.find_all("tr"):
        cells = row.find_all("td", recursive=False)
        # 12 columns: S.No | Citation | Case No | Case Type | Year | Parties | Order Date |
        # A.F.R | Head Notes | Bench (judges) | Apex Court | Apex Status. Rows start with the S.No.
        if len(cells) < 12 or not cells[0].get_text(strip=True).isdigit():
            continue

        url = pdf_url(cells[2])
        if not is_shc_pdf(url):
            continue

        case_number, is_division = case_number_and_bench(cells[2].get_text(" "))
        citation = clean_text(cells[1].get_text(" ")) or None
        case_type = clean_text(cells[3].get_text(" ")) or "Case"
        title = clean_text(cells[5].get_text(" "))
        tag_line = clean_text(cells[8].get_text(" ")) or None
        judges = clean_text(cells[9].get_text(" ")) or judge_name
        apex_case = clean_text(cells[10].get_text(" ")) or None
        apex_status = clean_text(cells[11].get_text(" ")) or None
        reported = clean_text(cells[7].get_text(" ")).lower().startswith("y")

        if not title:
            continue

        records.append(JudgmentRecord(
            court="SHC",
            case_type=case_type[:160],
            case_number=case_number,
            title=title[:500],
            judges=judges[:500],
            bench=is_division,
            apex_court_case=apex_case[:255] if apex_case else None,
            apex_court_status=apex_status[:255] if apex_status else None,
            decision_date=parse_shc_date(cells[6].get_text(" ")),
            pdf_path=url,
            source_url=SOURCE_URL,
            slug=(slugify(f"shc {case_type} {case_number} {title}")[:150].strip("-") or "judgment"),
            citation=citation[:120] if citation else None,
            tag_line=tag_line,
            is_reported=reported,
        ))

    return records


def collect(session: requests.Session, settings: Settings, only_judge: str | None) -> tuple[list[JudgmentRecord], dict[str, int]]:
    logger.info("Reading the judge list: %s", JUDGES_URL)
    response = session.get(JUDGES_URL, timeout=settings.timeout)
    response.raise_for_status()
    judges = judge_links(response.text)
    if only_judge:
        judges = [j for j in judges if only_judge.lower() in j[1].lower()]
    logger.info("%d judges with AFR judgments.", len(judges))

    records: list[JudgmentRecord] = []
    groups: dict[str, int] = {}
    for index, (url, name, expected) in enumerate(judges, start=1):
        try:
            page = session.get(url, timeout=settings.timeout)
            page.raise_for_status()
            rows = parse_judge_page(page.text, name)
        except requests.RequestException as exc:
            logger.warning("[%d/%d] %s: could not load (%s).", index, len(judges), name, exc)
            continue
        records.extend(rows)
        groups[name] = len(rows)
        if expected and expected != len(rows):
            logger.warning("[%d/%d] %s: site lists %d AFR, parsed %d.", index, len(judges), name, expected, len(rows))
        else:
            logger.info("[%d/%d] %s: %d judgments.", index, len(judges), name, len(rows))

    return merge_benches(records), groups


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import Sindh High Court reported (AFR) judgments, judge by judge.")
    parser.add_argument("--dry-run", action="store_true", help="Test run: full counts per judge and what would be imported (saved to storage/dry-run-results.json); nothing is sent.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N new judgments (oldest first).")
    parser.add_argument("--judge", default=None, help="Only judges whose name contains this text.")
    parser.add_argument("--resend", action="store_true", help="Send every judgment found again (fills empty fields on the site).")
    parser.add_argument("--skip-pdf", action="store_true", help="Do not read PDFs (no cited case law from the PDF, summaries from the tag line only).")
    parser.add_argument("--skip-summary", action="store_true", help="Do not write AI summaries.")
    parser.add_argument("--index-text", action="store_true", help="Also extract each PDF's full text + keywords and send them for phrase/keyword search.")
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
            pipeline = Pipeline(settings, STORAGE, read_pdfs=not args.skip_pdf, summaries=not args.skip_summary, index_text=args.index_text)
            records, groups = collect(build_session(settings), settings, args.judge)
            if not records:
                logger.error("No judgments parsed; the SHC pages may have changed or be unavailable.")
                return 1
            return pipeline.run(records, groups=groups, dry_run=args.dry_run, limit=args.limit, resend=args.resend, output=args.output)
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())

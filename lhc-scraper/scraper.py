#!/usr/bin/env python3
"""Lahore High Court reported judgments, judge by judge.

Pages (both have an "Hon'ble Judge" filter that loads a results table for one judge):
  current judges  https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting
  former judges   https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting_by_former_judges

For every judge in the filter the scraper loads that judge's table and reads each judgment:
Case # (type + number) | Title | Decision Date | LHC Citation | Other Citations | Judgment (PDF),
followed by a "Tag Line" row. A judgment that appears under several judges (a bench) is saved
once with all their names. The former judges are imported once (first run, or --former); every
run after the first sends only judgments the site does not have yet, oldest first.

Uploaded date = the day the scraper runs. See docs/judgment-automation.md.
"""

from __future__ import annotations

import argparse
import logging
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from scraper_common import JudgmentRecord, Pipeline, Settings, build_session, clean_text, configure_logging, merge_benches, parse_date, single_instance_lock, slugify

BASE_DIR = Path(__file__).resolve().parent
STORAGE = BASE_DIR / "storage"
SOURCE_URL = "https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting"
SOURCES = {
    "current": (SOURCE_URL, "https://data.lhc.gov.pk/dynamic/approved_judgments_result_new.php"),
    "former": (
        "https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting_by_former_judges",
        "https://data.lhc.gov.pk/dynamic/approved_judgments_result_former_judges.php",
    ),
}
BROWSER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

logger = logging.getLogger("lhc_scraper")


def judge_options(page_html: str) -> list[tuple[str, str]]:
    """(value sent to the results page, judge's full name) for each judge in the filter."""
    soup = BeautifulSoup(page_html, "html.parser")
    select = soup.find("select", attrs={"name": "courtName"})
    options = []
    for option in select.find_all("option") if select else []:
        value = (option.get("value") or "").strip()
        name = clean_text(option.get_text(" "))
        if value and value.lower() != "all courts" and name:
            options.append((value, name))

    return options


def judge_table(session: requests.Session, endpoint: str, judge_value: str, timeout: float) -> str:
    params = {
        "year": "", "debug": "0", "courtName": judge_value, "caseNumber": "", "citationTag": "", "partyName": "",
        "decisionDate0": "", "decisionDate1": "", "uploadDate": "", "uploadDate1": "",
    }
    response = session.get(endpoint, params=params, timeout=timeout)
    response.raise_for_status()

    return response.text


def is_lhc_pdf(url: str) -> bool:
    return bool(re.match(r"^https?://([a-z0-9-]+\.)*lhc\.gov\.pk/.+\.pdf$", url, flags=re.IGNORECASE))


def parse_table(page_html: str, judge_name: str) -> tuple[list[JudgmentRecord], int]:
    """Judgments in one judge's table and the site's own "Total Judgments" count."""
    soup = BeautifulSoup(page_html, "html.parser")
    total_match = re.search(r"Total Judgments\s*\(?\s*(\d+)", soup.get_text(" "))
    records: list[JudgmentRecord] = []

    for row in soup.find_all("tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 7 or not re.match(r"^\s*\d+", cells[0].get_text(" ")):
            continue
        anchor = cells[6].find("a", href=True)
        pdf_url = (anchor["href"] if anchor else "").strip()
        if not is_lhc_pdf(pdf_url):
            continue

        case_lines = [clean_text(part) for part in cells[1].get_text("\n").split("\n") if clean_text(part)]
        case_type = case_lines[0] if case_lines else "Case"
        case_number = " ".join(case_lines[1:]) or case_type
        title = clean_text(cells[2].get_text(" "))
        citation = clean_text(cells[4].get_text(" ")) or None
        other = clean_text(cells[5].get_text(" ")) or None

        tag_line = None
        following = row.find_next_sibling("tr")
        if following is not None and "tag line" in following.get_text(" ").lower():
            tag_line = clean_text(re.sub(r"^\s*Tag\s*Line\s*:?", "", following.get_text(" "), flags=re.IGNORECASE)) or None

        if not title:
            continue

        records.append(JudgmentRecord(
            court="LHC",
            case_type=case_type[:160],
            case_number=case_number[:60],
            title=title[:500],
            judges=judge_name[:500],
            decision_date=parse_date(cells[3].get_text(" ")),
            pdf_path=pdf_url,
            source_url=SOURCE_URL,
            slug=(slugify(f"lhc {case_type} {case_number} {title}")[:150].strip("-") or "judgment"),
            citation=citation[:120] if citation else None,
            other_citation=other[:120] if other else None,
            tag_line=tag_line,
            is_reported=True,  # every judgment on these pages is approved for reporting
        ))

    return records, int(total_match.group(1)) if total_match else len(records)


def collect(session: requests.Session, settings: Settings, which: list[str], only_judge: str | None) -> tuple[list[JudgmentRecord], dict[str, int]]:
    records: list[JudgmentRecord] = []
    groups: dict[str, int] = {}

    for source in which:
        page_url, endpoint = SOURCES[source]
        logger.info("Reading the judge list (%s judges): %s", source, page_url)
        response = session.get(page_url, timeout=settings.timeout)
        response.raise_for_status()
        judges = judge_options(response.text)
        if only_judge:
            judges = [j for j in judges if only_judge.lower() in j[1].lower()]
        logger.info("%d %s judges.", len(judges), source)

        for index, (value, name) in enumerate(judges, start=1):
            try:
                table, total = parse_table(judge_table(session, endpoint, value, settings.timeout), name)
            except requests.RequestException as exc:
                logger.warning("[%d/%d] %s: could not load (%s).", index, len(judges), name, exc)
                continue
            records.extend(table)
            groups[f"{name}{' (former)' if source == 'former' else ''}"] = len(table)
            if total != len(table):
                logger.warning("[%d/%d] %s: site says %d, parsed %d.", index, len(judges), name, total, len(table))
            else:
                logger.info("[%d/%d] %s: %d judgments.", index, len(judges), name, len(table))

    return merge_benches(records), groups


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import Lahore High Court reported judgments, judge by judge.")
    parser.add_argument("--dry-run", action="store_true", help="Test run: full counts per judge and what would be imported (saved to storage/dry-run-results.json); nothing is sent.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N new judgments (oldest first).")
    parser.add_argument("--former", action="store_true", help="Also read the former judges page (done automatically on the first run).")
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
            former_done = pipeline.state.flag("lhc_former_done")
            which = ["current"] + (["former"] if args.former or not former_done else [])
            records, groups = collect(build_session(settings), settings, which, args.judge)
            if not records:
                logger.error("No judgments parsed; the LHC pages may have changed or be unavailable.")
                return 1
            code = pipeline.run(records, groups=groups, dry_run=args.dry_run, limit=args.limit, resend=args.resend, output=args.output)
            if code == 0 and not args.dry_run and not args.limit and not args.judge and "former" in which:
                pipeline.state.set_flag("lhc_former_done")
                pipeline.state.save()
            return code
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())

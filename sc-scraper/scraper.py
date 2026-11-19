#!/usr/bin/env python3
"""Supreme Court of Pakistan reported judgments.

The reported archive is the search at https://scp.gov.pk/JudgmentsSearch with Reported = Yes
(about 3,874 judgments over ~155 pages). That search is protected by Google reCAPTCHA, so this
scraper never submits it: run the search in your browser, save each results page
(Cmd/Ctrl+S, "Web page, HTML only") into storage/saved/, and the scraper reads those files.
Every judgment in them is reported (is_reported = 1).

--latest reads https://scp.gov.pk/LatestJudgments instead (newest ~25, no captcha, no Reported
column: saved as unreported unless --latest-reported).

Grid columns: Sr | Case Subject | Case No | Case Title | Author Judge | Judgment Date | Upload
Date | Citation | SC Citation | Download, plus an optional tagline row. Only judgments the site
does not have yet are sent, oldest decision first; uploaded date = the day the scraper runs.
See docs/judgment-automation.md.
"""

from __future__ import annotations

import argparse
import glob
import logging
import os
import re
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from scraper_common import JudgmentRecord, Pipeline, Settings, build_session, clean_text, configure_logging, merge_benches, parse_date, single_instance_lock, slugify

BASE_DIR = Path(__file__).resolve().parent
STORAGE = BASE_DIR / "storage"
DEFAULT_SAVED_PAGES = str(STORAGE / "saved" / "*.html")
DEFAULT_LATEST_URL = "https://scp.gov.pk/LatestJudgments"
DEFAULT_SOURCE_URL = "https://scp.gov.pk/JudgmentsSearch"
COURT_HOSTS = ("scp.gov.pk", "supremecourt.gov.pk")
UNKNOWN_BENCH = "Supreme Court of Pakistan"

logger = logging.getLogger("sc_scraper")


def is_court_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    return parsed.scheme in {"http", "https"} and any(host == h or host.endswith("." + h) for h in COURT_HOSTS)


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
        files.extend(sorted(glob.glob(os.path.expanduser(pattern))))

    pages = []
    for name in files:
        try:
            pages.append((name, Path(name).read_text(encoding="utf-8", errors="replace")))
        except OSError as exc:
            logger.error("Cannot read %s: %s", name, exc)

    return pages


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import Supreme Court of Pakistan reported judgments.")
    parser.add_argument("--dry-run", action="store_true", help="Test run: full counts and what would be imported (saved to storage/dry-run-results.json); nothing is sent.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--from-html", nargs="+", metavar="FILE", help="Saved search pages (default: SC_SAVED_PAGES, storage/saved/*.html).")
    parser.add_argument("--unreported-pages", action="store_true", help="The saved pages come from a 'Reported = No' search (is_reported = 0).")
    parser.add_argument("--latest", action="store_true", help="Read the Latest Judgments page instead of saved pages.")
    parser.add_argument("--latest-reported", action="store_true", help="With --latest: save those judgments as reported.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N new judgments (oldest first).")
    parser.add_argument("--resend", action="store_true", help="Send every judgment found again (fills empty fields on the site).")
    parser.add_argument("--skip-pdf", action="store_true", help="Do not read PDFs (cited case law and summaries from the tag line only).")
    parser.add_argument("--skip-summary", action="store_true", help="Do not write AI summaries.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    load_dotenv(BASE_DIR / ".env")
    configure_logging(STORAGE, args.verbose)
    settings = Settings.from_env(default_timeout=60)
    source_url = os.getenv("SC_SOURCE_URL", DEFAULT_SOURCE_URL).strip()

    with single_instance_lock(STORAGE) as acquired:
        if not acquired:
            logger.warning("Another scraper instance is already running; this run will exit.")
            return 0
        try:
            if args.latest:
                url = os.getenv("SC_LATEST_URL", DEFAULT_LATEST_URL).strip()
                logger.info("Fetching %s", url)
                response = build_session(settings).get(url, timeout=settings.timeout)
                response.raise_for_status()
                pages, reported = [(url, response.text)], args.latest_reported
            else:
                patterns = args.from_html or [os.getenv("SC_SAVED_PAGES", DEFAULT_SAVED_PAGES)]
                pages, reported = read_html_files(patterns), not args.unreported_pages
                if not pages:
                    logger.error(
                        "No saved search pages found (%s). Search scp.gov.pk/JudgmentsSearch with Reported = Yes in your "
                        "browser, save every results page into storage/saved/, then run again (or use --latest).", ", ".join(patterns),
                    )
                    return 1

            records: list[JudgmentRecord] = []
            groups: dict[str, int] = {}
            for name, page in pages:
                parsed, total, skipped = parse_judgments(page, source_url, reported)
                records.extend(parsed)
                groups[Path(name).name if not args.latest else "Latest Judgments page"] = len(parsed)
                logger.info("%s: %d rows, %d parsed, %d skipped.", name, total, len(parsed), skipped)

            if not records:
                logger.error("No judgments parsed; the page may have changed, or a saved file is not a results page.")
                return 1
            logger.info("Saved as %s.", "reported (is_reported = 1)" if reported else "unreported (is_reported = 0)")

            pipeline = Pipeline(settings, STORAGE, read_pdfs=not args.skip_pdf, summaries=not args.skip_summary)
            return pipeline.run(merge_benches(records), groups=groups, dry_run=args.dry_run, limit=args.limit, resend=args.resend, output=args.output)
        except requests.RequestException as exc:
            logger.error("Failed to fetch the Supreme Court page: %s", exc)
            return 1
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())

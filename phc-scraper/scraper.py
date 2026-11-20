#!/usr/bin/env python3
"""Peshawar High Court reported judgments.

Source: https://www.peshawarhighcourt.gov.pk/PHCCMS/reportedJudgments.php?action=search
One page lists every reported judgment (about 5,956). Columns: S.No | Case | Remarks | Other
Citation | PHC Neutral Citation | Decision Date | S.C.Status | Category | Judgment | SC Judgment.
The bench is found with the page's judge filter: one search per judge (49), so every judgment
gets the judges it appears under.

The first run imports everything; later runs send only judgments the site does not have yet
(storage/state.json), oldest decision first so today's are added last. Each PDF is read once for
the case law it cites and, with ANTHROPIC_API_KEY set, an AI summary. case_type = the PHC
category; uploaded date = the day the scraper runs. See docs/judgment-automation.md.
"""

from __future__ import annotations

import argparse
import html as html_lib
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from scraper_common import JudgmentRecord, Pipeline, Settings, build_session, clean_text, configure_logging, merge_benches, parse_date, single_instance_lock, slugify

BASE_DIR = Path(__file__).resolve().parent
STORAGE = BASE_DIR / "storage"
DEFAULT_LISTING_URL = "https://www.peshawarhighcourt.gov.pk/PHCCMS/reportedJudgments.php?action=search"
# The PHC server answers 406 Not Acceptable to non-browser clients.
BROWSER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
UNKNOWN_BENCH = "Peshawar High Court"
# The site's category list spells "Revenue" as "Revenu".
CATEGORIES = {"revenu": "Revenue"}

logger = logging.getLogger("phc_scraper")


@dataclass(frozen=True)
class PhcConfig:
    listing_url: str
    timeout: float
    delay: float


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


def search(session: requests.Session, config: PhcConfig, *, year: int = 0, judge: int = 0) -> str:
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
                pdf_path=pdf_url,
                source_url=source_url,
                slug=(slugify(f"phc {case_type} {case_number} {title}")[:150].strip("-") or "judgment"),
                is_published=True,
            )
        )

    return records, len(rows), skipped


# --- Benches (judge filter) --------------------------------------------------


def bench_map(session: requests.Session, config: PhcConfig, judges: dict[int, str], year: int) -> dict[str, list[str]]:
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



def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import Peshawar High Court reported judgments.")
    parser.add_argument("--dry-run", action="store_true", help="Test run: full counts per judge and what would be imported (saved to storage/dry-run-results.json); nothing is sent.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N new judgments (oldest first).")
    parser.add_argument("--year", type=int, default=0, help="Only judgments of this year (default: every year).")
    parser.add_argument("--judge", type=int, default=None, help="Only this judge's judgments (id from --list-judges).")
    parser.add_argument("--list-judges", action="store_true", help="Print the judge filter ids and names, then exit.")
    parser.add_argument("--resend", action="store_true", help="Send every judgment found again (fills empty fields on the site).")
    parser.add_argument("--skip-benches", action="store_true", help="Do not search per judge; benches saved as 'Peshawar High Court'.")
    parser.add_argument("--skip-pdf", action="store_true", help="Do not read PDFs (cited case law and summaries from the remarks only).")
    parser.add_argument("--skip-summary", action="store_true", help="Do not write AI summaries.")
    parser.add_argument("--index-text", action="store_true", help="Also extract each PDF's full text + keywords and send them for phrase/keyword search.")
    parser.add_argument("--store-pdf", action="store_true", help="Also download each PDF and upload it to the site, so the site stores and serves the file.")
    parser.add_argument("--index-only", action="store_true", help="Only add text + keywords (and the stored PDF) for judgments already on the site; do not import metadata. For backfilling.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    load_dotenv(BASE_DIR / ".env")
    configure_logging(STORAGE, args.verbose)
    settings = Settings.from_env(default_timeout=180, default_user_agent=BROWSER_AGENT)
    config = PhcConfig(os.getenv("PHC_LISTING_URL", DEFAULT_LISTING_URL).strip(), settings.timeout, settings.delay)
    session = build_session(settings)

    if args.list_judges:
        for judge_id, name in parse_judges(search(session, config)).items():
            print(f"{judge_id:>4}  {name}")
        return 0

    with single_instance_lock(STORAGE) as acquired:
        if not acquired:
            logger.warning("Another scraper instance is already running; this run will exit.")
            return 0
        try:
            logger.info("Fetching the listing (%s): %s", args.year or "all years", config.listing_url)
            page = search(session, config, year=args.year, judge=args.judge or 0)
            records, total_rows, skipped = parse_judgments(page, config.listing_url)
            logger.info("Rows on the site: %d. Parsed: %d. Skipped: %d.", total_rows, len(records), skipped)
            if not records:
                logger.error("No judgment rows parsed; the PHC page may have changed or be unavailable.")
                return 1

            judges = parse_judges(page)
            groups: dict[str, int] = {}
            if args.judge:
                name = tidy_judge(judges.get(args.judge, ""))
                records = [replace_judges(r, name or UNKNOWN_BENCH) for r in records]
                groups[name or str(args.judge)] = len(records)
            elif not args.skip_benches and judges:
                benches = bench_map(session, config, judges, args.year)
                records = [replace_judges(r, ", ".join(benches[r.pdf_path])) if benches.get(r.pdf_path) else r for r in records]
                for names in benches.values():
                    for name in names:
                        groups[name] = groups.get(name, 0) + 1
                unmatched = sum(1 for r in records if r.judges == UNKNOWN_BENCH)
                if unmatched:
                    groups["No judge in the filter (saved as Peshawar High Court)"] = unmatched

            pipeline = Pipeline(settings, STORAGE, read_pdfs=not args.skip_pdf, summaries=not args.skip_summary, index_text=args.index_text or args.index_only, store_pdf=args.store_pdf or args.index_only)
            return pipeline.run(merge_benches(records), groups=groups, dry_run=args.dry_run, limit=args.limit, resend=args.resend, output=args.output, index_only=args.index_only)
        except requests.RequestException as exc:
            logger.error("Failed to fetch the PHC page: %s", exc)
            return 1
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1


def replace_judges(record: JudgmentRecord, judges: str) -> JudgmentRecord:
    from dataclasses import replace

    return replace(record, judges=judges[:500])


if __name__ == "__main__":
    raise SystemExit(main())

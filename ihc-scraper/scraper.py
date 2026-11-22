#!/usr/bin/env python3
"""Islamabad High Court reported judgments, judge by judge (sitting and former judges).

Judge lists (each judge has a "Reported" button that opens a modal of that judge's judgments):
  sitting judges  https://mis.ihc.gov.pk/frmJgmnt?jgs=1
  former judges   https://mis.ihc.gov.pk/frmJgmnt?jgs=0

Both pages fill themselves from the site's own JSON web methods, which this scraper calls directly:
  POST ihc.asmx/Juges_GA          every judge (JUDGE_ID, JUG_REALNAME, ISRETIRED 0 = sitting, 1 = former)
  POST ihc.asmx/srchDecisionClms  one judge's reported judgments — exactly the modal rows
       (CASENO, BENCHNAME, AUTHOR_JUDGES, PARTIES, O_CITATION, ATTACHMENTS = the PDF, DDATE, …)

Mapping: "Writ Petition-2553-2026" -> case_type "Writ Petition", case_number "2553-2026"; the bench
column is stored as-is in `judges` (two or more names, comma separated = Division Bench, bench=1);
parties -> title; citation ("Citation Awaited" -> NULL, refilled by a later run); the PDF link
(the same file as the download button on frmRdJgmnt.aspx) -> pdf_path. Decision date from the
listing (DDATE), else the "Date of Decision:" line in the PDF. Uploaded date = the day the scraper runs.

Former judges are imported once: when every PDF of a former judge is on the site, the judge is
remembered in storage/former_done.json and skipped on later runs. Sitting judges are checked every
run and only judgments the site does not have yet are sent. See docs/judgment-automation.md.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urljoin

import requests
from dotenv import load_dotenv

from import_state import ImportState
from scraper_common import JudgmentRecord, Pipeline, Settings, build_session, clean_optional, clean_text, configure_logging, merge_benches, single_instance_lock, slugify

BASE_DIR = Path(__file__).resolve().parent
STORAGE = BASE_DIR / "storage"
SITE = "https://mis.ihc.gov.pk/"
SITTING_URL = "https://mis.ihc.gov.pk/frmJgmnt?jgs=1"
FORMER_URL = "https://mis.ihc.gov.pk/frmJgmnt?jgs=0"
JUDGES_METHOD = urljoin(SITE, "ihc.asmx/Juges_GA")
JUDGMENTS_METHOD = urljoin(SITE, "ihc.asmx/srchDecisionClms")
FORMER_DONE = STORAGE / "former_done.json"
BROWSER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
CASE_NO = re.compile(r"^(?P<type>.+?)\s*-\s*(?P<number>[0-9][0-9A-Za-z/]*(?:-[0-9A-Za-z/]+)*-(?:19|20)\d{2})\s*$")

logger = logging.getLogger("ihc_scraper")


def call(session: requests.Session, settings: Settings, url: str, body: dict, referer: str) -> list[dict]:
    """POST an ASMX web method; it answers {"d": "<json array>"} or {"d": "\"empty\""}."""
    response = session.post(url, json=body, timeout=settings.timeout, headers={
        "Content-Type": "application/json; charset=utf-8", "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest", "Referer": referer, "Origin": SITE.rstrip("/"),
    })
    response.raise_for_status()
    payload = response.json().get("d")
    rows = json.loads(payload) if isinstance(payload, str) else payload
    return rows if isinstance(rows, list) else []


def list_judges(session: requests.Session, settings: Settings) -> list[dict]:
    """[{id, name, former}] for every judge on both pages."""
    rows = call(session, settings, JUDGES_METHOD, {"_params": {"PISRETIRED": 0, "CUR_REC": None}}, SITTING_URL)
    judges = []
    for row in rows:
        name = clean_text(str(row.get("JUG_REALNAME") or row.get("JUDGE_NAME") or ""))
        if row.get("JUDGE_ID") is None or not name or str(row.get("ISDELETED") or "0") == "1":
            continue
        judges.append({"id": str(row["JUDGE_ID"]), "name": name, "title": clean_text(str(row.get("JUDGE_TITLE") or "")), "former": str(row.get("ISRETIRED")) == "1"})

    return judges


def judge_rows(session: requests.Session, settings: Settings, judge: dict) -> list[dict]:
    """The judge's "Reported" modal rows (same parameters as the site's Reported button)."""
    body = {"PCASENO": "0", "PJUG": judge["id"], "PADV": "0", "PYEAR": "0", "pPrty": "", "PDDATE": "01/01/1900", "PLANDMARK": "1", "PAFR": "1"}
    return call(session, settings, JUDGMENTS_METHOD, body, FORMER_URL if judge["former"] else SITTING_URL)


def split_case_no(value: str) -> tuple[str, str]:
    """"Writ Petition-2553-2026" -> ("Writ Petition", "2553-2026"); "Crl. Misc.-12-B-2025" -> ("Crl. Misc.", "12-B-2025")."""
    text = clean_text(value)
    match = CASE_NO.match(text)
    if match:
        return clean_text(match.group("type")).rstrip("-. ") or "Case", match.group("number")
    head, _, tail = text.partition("-")
    return (clean_text(head) or "Case", clean_text(tail) or text)


def parse_ihc_date(value: object) -> str | None:
    """DDATE looks like "10-APR-2025"."""
    match = re.search(r"\d{1,2}-[A-Za-z]{3}-\d{4}", str(value or ""))
    if not match:
        return None
    try:
        return datetime.strptime(match.group(0), "%d-%b-%Y").date().isoformat()
    except ValueError:
        return None


def pdf_link(path: object) -> str:
    """ATTACHMENTS "/attachments/judgements/…/x.pdf" -> absolute URL (spaces and brackets encoded)."""
    text = str(path or "").strip()
    if not text.lower().endswith(".pdf"):
        return ""
    return urljoin(SITE, quote(text, safe="/:._-()~%"))


def to_record(row: dict, judge: dict) -> JudgmentRecord | None:
    url = pdf_link(row.get("ATTACHMENTS"))
    title = clean_text(str(row.get("PARTIES") or row.get("TITLE") or ""))
    if not url or not title:
        return None

    case_type, case_number = split_case_no(str(row.get("CASENO") or ""))
    bench = clean_text(str(row.get("BENCHNAME") or "")) or clean_text(str(row.get("AUTHOR_JUDGES") or "")) or f"{judge['title']} {judge['name']}".strip()
    citation = clean_optional(str(row.get("O_CITATION") or ""))
    other = clean_optional(str(row.get("O_CITATION_IMP") or ""))
    sc_citation = clean_optional(str(row.get("O_SC_CITATION") or ""))
    sc_status = clean_optional(" — ".join(filter(None, [clean_text(str(row.get("O_SC_STATUS") or "")), clean_text(str(row.get("O_SC_RESULT") or ""))])))
    headnote = clean_optional(str(row.get("O_IHC_HEADNOTE") or ""))
    sections = clean_optional(str(row.get("O_UNDERSECTION") or ""))
    remarks = clean_optional(clean_text(" ".join(filter(None, [clean_text(str(row.get("O_REMARKS") or "")), f"Under: {sections}." if sections else ""]))))

    return JudgmentRecord(
        court="IHC",
        case_type=case_type[:160],
        case_number=case_number[:60],
        title=title[:500],
        judges=bench[:500],
        bench="," in bench,
        decision_date=parse_ihc_date(row.get("DDATE")),
        pdf_path=url,
        source_url=FORMER_URL if judge["former"] else SITTING_URL,
        slug=(slugify(f"ihc {case_type} {case_number} {title}")[:150].strip("-") or "judgment"),
        citation=citation[:120] if citation else None,
        other_citation=other[:120] if other and other != citation else None,
        sc_citation=sc_citation[:120] if sc_citation else None,
        apex_court_status=sc_status[:255] if sc_status else None,
        tag_line=headnote,
        remarks=remarks,
        is_reported=True,
        is_published=True,
    )


def load_former_done() -> set[str]:
    try:
        return set(json.loads(FORMER_DONE.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return set()


def collect(session: requests.Session, settings: Settings, args: argparse.Namespace) -> tuple[list[JudgmentRecord], dict[str, int], dict[str, list[str]]]:
    judges = list_judges(session, settings)
    if not judges:
        raise RuntimeError("The IHC judge list came back empty; the site may be down or changed.")
    done = set() if args.resend or args.all_former else load_former_done()
    if args.only == "sitting":
        judges = [j for j in judges if not j["former"]]
    elif args.only == "former":
        judges = [j for j in judges if j["former"]]
    if args.judge:
        judges = [j for j in judges if args.judge.lower() in j["name"].lower()]
    skipped = [j for j in judges if j["former"] and j["id"] in done]
    judges = [j for j in judges if not (j["former"] and j["id"] in done)]
    logger.info("%d judges to read (%d sitting, %d former); %d former judges already complete.", len(judges), sum(not j["former"] for j in judges), sum(j["former"] for j in judges), len(skipped))

    records: list[JudgmentRecord] = []
    groups: dict[str, int] = {}
    former_pdfs: dict[str, list[str]] = {}
    for index, judge in enumerate(judges, start=1):
        label = f"{judge['name']} ({'former' if judge['former'] else 'sitting'})"
        try:
            rows = judge_rows(session, settings, judge)
        except (requests.RequestException, ValueError) as exc:
            logger.warning("[%d/%d] %s: could not load (%s).", index, len(judges), label, exc)
            continue
        parsed = [r for r in (to_record(row, judge) for row in rows) if r is not None]
        if len(parsed) != len(rows):
            logger.warning("[%d/%d] %s: %d rows, %d without a PDF or title were skipped.", index, len(judges), label, len(rows), len(rows) - len(parsed))
        logger.info("[%d/%d] %s: %d reported judgments.", index, len(judges), label, len(parsed))
        records.extend(parsed)
        groups[label] = len(parsed)
        if judge["former"]:
            former_pdfs[judge["id"]] = [r.pdf_path for r in parsed]

    return merge_benches(records), groups, former_pdfs


def remember_complete_former(former_pdfs: dict[str, list[str]]) -> None:
    """A former judge whose every PDF is now on the site is never read again."""
    state = ImportState(STORAGE / "state.json")
    done = load_former_done()
    newly = [jid for jid, pdfs in former_pdfs.items() if all(state.is_imported(p) for p in pdfs)]
    if newly:
        FORMER_DONE.write_text(json.dumps(sorted(done | set(newly))), encoding="utf-8")
        logger.info("%d former judges complete; they will be skipped from now on.", len(newly))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import Islamabad High Court reported judgments, judge by judge (sitting + former).")
    parser.add_argument("--dry-run", action="store_true", help="Test run: counts per judge and what would be imported (storage/dry-run-results.json); nothing is sent.")
    parser.add_argument("--output", type=Path, default=None, help="With --dry-run: save the results to this JSON file instead.")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N new judgments (oldest first).")
    parser.add_argument("--judge", default=None, help="Only judges whose name contains this text.")
    parser.add_argument("--only", choices=["sitting", "former"], default=None, help="Only sitting or only former judges.")
    parser.add_argument("--all-former", action="store_true", help="Read former judges again even if already complete.")
    parser.add_argument("--resend", action="store_true", help="Send every judgment found again (fills empty fields such as a citation that was awaited).")
    parser.add_argument("--skip-pdf", action="store_true", help="Do not read PDFs (no cited case law, no PDF decision date).")
    parser.add_argument("--skip-summary", action="store_true", help="Do not write AI summaries.")
    parser.add_argument("--no-store-pdf", action="store_true", help="Do not download and store the PDF on the site (on by default).")
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
            records, groups, former_pdfs = collect(build_session(settings), settings, args)
            if not groups:
                logger.info("Nothing to read: every selected former judge is already complete.")
                return 0
            if not records:
                logger.error("No judgments parsed; the IHC web methods may have changed or be unavailable.")
                return 1
            code = pipeline.run(records, groups=groups, dry_run=args.dry_run, limit=args.limit, resend=args.resend, output=args.output, index_only=args.index_only, reindex_scanned=args.reindex_scanned)
            if not args.dry_run and not args.index_only:
                remember_complete_former(former_pdfs)
            return code
        except Exception:
            logger.exception("Unhandled scraper error.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())

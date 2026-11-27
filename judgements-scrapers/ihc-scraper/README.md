# IHC reported judgments scraper

Imports **Islamabad High Court** reported judgments, judge by judge, for **sitting** judges
(https://mis.ihc.gov.pk/frmJgmnt?jgs=1) and **former** judges (https://mis.ihc.gov.pk/frmJgmnt?jgs=0).

Each judge's **Reported** button opens a modal of that judge's judgments. Both pages and the modal are
filled from the site's own JSON web methods, which the scraper calls directly (no browser needed):

| Web method | Returns |
|---|---|
| `POST ihc.asmx/Juges_GA` | every judge: `JUDGE_ID`, `JUG_REALNAME`, `ISRETIRED` (0 = sitting, 1 = former) |
| `POST ihc.asmx/srchDecisionClms` (`PJUG`=judge id, `PLANDMARK`=1, `PAFR`=1 — the Reported button) | the modal rows |

## Field mapping (`reported_judgments`, `court = ihc`)
| Modal column / JSON field | Stored as |
|---|---|
| CASE_NO `Writ Petition-2553-2026` | `case_type` = `Writ Petition`, `case_number` = `2553-2026` |
| Bench (`BENCHNAME`) | `judges` as-is; two or more names separated by "," → `bench` = 1 (Division Bench, shown as **D.B.**), else S.B. |
| PARTY_NAMES (`PARTIES`) | `title` (as listed, e.g. `MOL Pakistan Oil & Gas VS FBR etc`) |
| CITATIONS (`O_CITATION`) | `citation`; **"Citation Awaited" → NULL**, refilled later with `--resend` once the court publishes it |
| `O_CITATION_IMP` (if different) / `O_SC_CITATION` / `O_SC_STATUS`+`O_SC_RESULT` | `other_citation` / `sc_citation` / `apex_court_status` |
| `O_IHC_HEADNOTE` / `O_REMARKS` + `O_UNDERSECTION` | `tag_line` / `remarks` |
| Download link (`ATTACHMENTS`, the same file as the Download button on `frmRdJgmnt.aspx`) | `pdf_path`; the PDF is downloaded and **stored on the site** |
| `DDATE` (e.g. `10-APR-2025`) | `decision_date`; if missing, the **"Date of Decision:"** line in the PDF |
| — | `uploaded_on` = the day the scraper runs, `is_reported` = 1, `is_published` = 1, `source_url` = the sitting/former page |

From each PDF (one download): **cited citations**, **page-by-page text** and **keywords** for phrase/keyword search
(same `text_indexer.py` as the other scrapers), and optionally an AI summary (`ANTHROPIC_API_KEY`).

Checked 2026-11-23 against the live site: 35 judges (10 sitting, 25 former), **1,982 reported judgments**,
325 division benches, 408 with "Citation Awaited", every case number splits cleanly, every row has a decision
date (only ~1 in 12 PDFs prints a "Date of Decision" line; where it does it matches the listing).

## Former vs sitting
- **Former judges are imported once.** When every PDF of a former judge is on the site, the judge id is saved in
  `storage/former_done.json` and skipped on later runs (`--all-former` reads them again). If a run stops half way,
  the judge is not marked and the next run continues.
- **Sitting judges are read every run**; `storage/state.json` remembers what the site already has, so only new
  judgments are sent. When a judge retires the site moves them to the former list; they are read one last time.

## Run
```bash
cd ihc-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env                                  # JUDGMENTS_IMPORT_URL + JUDGMENTS_IMPORT_TOKEN
.venv/bin/python scraper.py --dry-run --limit 5       # counts per judge + the first 5 new, nothing sent
.venv/bin/python scraper.py                           # first run: everything (former + sitting), oldest first
.venv/bin/python scraper.py --resend                  # fill citations that were "awaited" on earlier runs
```
**Scanned judgments.** Many older IHC PDFs are image-only scans (only the `Uploaded By: "…"` stamp is text). Install **Tesseract** (`apt install tesseract-ocr`, macOS `brew install tesseract`) so they are OCR'd. Without it they are marked `needs_ocr` (stamp never indexed) and indexed automatically on the first run after Tesseract is installed. To fix judgments imported earlier with only the stamp: `.venv/bin/python scraper.py --reindex-scanned`.

Options: `--reindex-scanned`, `--dry-run`, `--output FILE`, `--limit N`, `--judge TEXT`, `--only sitting|former`, `--all-former`,
`--resend`, `--skip-pdf`, `--skip-summary`, `--no-store-pdf`, `--no-index-text`, `--index-only`, `--verbose`.

Daily cron (server timezone Asia/Karachi), e.g. 02:30:
```
cd /www/wwwroot/law_site/judgements-scrapers/ihc-scraper && .venv/bin/python scraper.py >> storage/cron.log 2>&1
```
A weekly `--resend --only sitting --skip-summary` run picks up citations published after the first import.
Full guide: `docs/judgment-automation.md`.

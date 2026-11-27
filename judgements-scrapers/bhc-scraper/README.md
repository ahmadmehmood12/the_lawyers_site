# BHC reported judgments scraper

Imports **Balochistan High Court** reported judgments (`court = bhc`), judge by judge, from
https://bhc.gov.pk/resources/judgments — sitting judges first, then the section headed
**Former Justices**. Each judge card links to `…/resources/judgments/<judge-slug>/reported-judgments`, one
page listing every reported judgment of that judge.

## Where each field comes from
| Field | Source |
|---|---|
| `title` | listing: `.judgmentbox .title strong` (trailing comma removed) |
| `citation` | listing: `.note i`, e.g. `CLD 2024 462` |
| `pdf_path` | listing: `.filelink a[data-src]`, e.g. `https://bhc.gov.pk/media/judgments/1584.pdf` — downloaded and stored on the site under `judgments/bhc/` |
| `judges`, `bench` | PDF header `Before Iqbal Ahmed Kasi and Muhammad Aamir Nawaz Rana, JJ` (PLD style) or `Present: SARDAR AHMAD HALEEMI, J.` (PLJ style) → `Justice Iqbal Ahmed Kasi, Justice Muhammad Aamir Nawaz Rana`; 2+ judges = Division Bench (`bench` = 1, shown as **D.B.**). Fallback: the judge(s) whose page lists it |
| `case_type`, `case_number` | the case line above "decided on": `Criminal Appeal No. 25 of 2025` → `Criminal Appeal` / `25 of 2025`; also `F.A.O. 153 of 2009`, `C.P. No.(S)34 of 2019`, `No. (T) 112 of 2021`, `No.S-18 of 2014`. Cases decided together (`Criminal Appeal No.6 and Criminal Revision No.7 of 2007`) keep the first as the case number and the full list in `remarks` |
| `decision_date` | `decided on 10th December, 2025` or `decided on 31.5.2023` |
| `cited_citations`, page text, keywords | the same PDF (shared `text_indexer.py`) |
| `uploaded_on` / `is_reported` / `is_published` | the day the scraper runs / 1 / 1 |

Each new PDF is downloaded **once**: the header is parsed in `collect()`, and the same file is handed to the
pipeline (stored copy, page text, keywords, cited cases) through `storage/pdf_cache/`, which is emptied after
every run. Parsed headers are cached in `storage/pdf_meta.json`, so a PDF is never re-read for its header.
A judgment listed under both judges of a bench is the same PDF and is saved once.

Checked 2026-11-24 against the live site: 24 judges (10 sitting, 14 former), **1,959 reported judgments**, all
with a citation. Header parsing on 100 random PDFs: bench 100/100, case number 99/100, decision date 99/100
(after the fixes, the remaining miss parses too). Image-only scans have no text: with Tesseract installed the
header is read by OCR, otherwise the case number falls back to `BHC-<pdf number>` and the text waits for OCR
(`needs_ocr`, see the IHC notes).

## Run
```bash
cd bhc-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env                                # JUDGMENTS_IMPORT_URL + JUDGMENTS_IMPORT_TOKEN
.venv/bin/python scraper.py --dry-run --limit 5     # preview (downloads only those 5 PDFs), nothing sent
.venv/bin/python scraper.py                         # first run: all 1,959, oldest first; later runs: only new
.venv/bin/python scraper.py --resend                # refill empty fields (e.g. a citation added later)
.venv/bin/python scraper.py --reindex-scanned       # OCR scanned judgments again once tesseract is installed
```
Options: `--dry-run`, `--output FILE`, `--limit N`, `--judge TEXT`, `--only sitting|former`, `--resend`,
`--skip-pdf`, `--skip-summary`, `--no-store-pdf`, `--no-index-text`, `--index-only`, `--reindex-scanned`, `--verbose`.

Daily cron (Asia/Karachi), e.g. 03:00:
```
cd /www/wwwroot/law_site/judgements-scrapers/bhc-scraper && .venv/bin/python scraper.py >> storage/cron.log 2>&1
```

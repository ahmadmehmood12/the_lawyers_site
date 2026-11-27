# SHC reported judgments scraper

Imports **Sindh High Court** reported (Approved For Reporting) judgments, judge by judge, from
https://caselaw.shc.gov.pk/caselaw/public/rpt-afr — the judge list, where each judge's **AFR**
count links to that judge's judgments page
(`.../public/reported-judgements-detail-all/<id>/AFR/AFR`). Those pages are DataTables grids that
return every row in one response, so there is no pagination to follow.

Per judgment row (14 columns): Citation → `citation`; the case label → `case_number` and the
`(D.B.)`/`(S.B.)` marker → `bench` (1 = Division Bench, 0 = Single Bench); Case Type → `case_type`;
Parties → `title`; Order Date → `decision_date` (dd-MON-yy); A.F.R `Yes/No` → `is_reported`; Head
Notes → `tag_line`; the judge column → `judges` (a division bench lists every judge, comma
separated); Apex Court → `apex_court_case`; Apex Status → `apex_court_status`. The download link
(`download-file.php?doc=…`) → `pdf_path`; `uploaded_on` = the day the scraper runs; `source_url` =
the judge list. A judgment under several judges is saved once (deduped by its PDF link).

The first run imports everything; later runs send only judgments the site does not have yet
(`storage/state.json`), oldest decision first. Each PDF is read once for cited case law; with
`ANTHROPIC_API_KEY` set, an AI summary is written too.

```bash
cd shc-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python scraper.py --dry-run --limit 5     # full counts per judge + the first 5 new
.venv/bin/python scraper.py                         # import + download/store the PDF + index text (defaults on)
.venv/bin/python scraper.py --resend                # also backfill PDFs/text for already-imported judgments
```

By default the SHC scraper **downloads each PDF and stores it on the site** (served by the website,
with plan-gated download) and **extracts the full text + keywords** for search — all from one download.
Use `--no-store-pdf` / `--no-index-text` to turn either off.

Options: `--dry-run`, `--output FILE`, `--limit N`, `--judge TEXT`, `--resend`, `--skip-pdf`,
`--skip-summary`, `--no-store-pdf`, `--no-index-text`, `--index-only`, `--verbose`.

### Phrase / keyword search (`--index-text`)

With `--index-text` the scraper also extracts each judgment PDF's full text, page by page, and a
set of keywords, and POSTs them to `/api/judgments/text`. Text comes from **PyMuPDF**; scanned
pages fall back to **Tesseract OCR** when the `tesseract` binary is installed (otherwise the page
is kept as-is and the status records that OCR was skipped). Keywords use a lightweight frequency
method — no spaCy model download. The site then offers phrase search (`"exact phrase"`) and keyword
search over the stored text, returning the matching page numbers and keywords. Already-indexed
judgments are skipped (`storage/state.json`), so re-running only indexes new ones; `--resend`
re-indexes everything. Full guide: `docs/judgment-automation.md`.

## Running it day to day

**First run vs daily.** `storage/state.json` records every PDF the site has already accepted, so the
scraper is incremental. The **first run imports everything** (hours on the first full load; stored PDFs
use several GB of disk — safe to stop and resume). After that, a **daily run picks up only the new
judgments** — each is imported, its PDF stored, and its text + keywords extracted, in one pass. A quiet
day does nothing. Schedule daily with the server timezone set to **Asia/Karachi**, e.g. 02:00:

```
cd /www/wwwroot/law_site/judgements-scrapers/shc-scraper && /www/wwwroot/law_site/judgements-scrapers/shc-scraper/.venv/bin/python scraper.py >> storage/cron.log 2>&1
```

**What it extracts from each PDF.** Cited case law (`cited_citations`), the full page-by-page text, and
keywords. Keywords include the **important legal entities** — statutes ("Sales Tax Act, 1990"),
provisions ("Order 7, Rule 11", "Section 302, 324…"), case titles ("X v. Y"), case/application numbers
("C.M.A.No.5986 of 2015"), tariff codes ("PCT Heading 3206.4990") and parties/judges — not just frequent
words (up to 120 per judgment).

**Downloaded PDFs.** Stored **by default** (use `--no-store-pdf` to keep only the court link). Stored files go to the site's **private disk** at
`judgments/<court>/<upload-date>/<id>-<case_number>-<title>.pdf` and are served by the website itself: an inline viewer for
everyone, and **download gated by the viewer's plan** (the `judgment_pdf_download` plan feature).

**Backfilling judgments already imported.** To add text + keywords (and the stored PDF) to judgments that
were imported *before* these features — without changing any other column — run once:

```
.venv/bin/python scraper.py --index-only
```

It matches each judgment by its PDF URL — or, if the court changed the PDF link since import, by **court + case number + title** (the same identity check the import uses) — and sends **only** text/keywords/PDF (no metadata import, no
duplicates). `--resend --index-only` redoes all of them.

**Citations.** When a court page has no citation the column is left empty. The import **never overwrites a
filled field**, so re-running later (`--resend`) fills an empty citation once the court publishes it — a
fast citation-only pass is `--resend --no-store-pdf --no-index-text` (SHC/SC) or `--resend` (LHC/PHC).

**Search index maintenance.** B-tree indexes (keyword, citation, dates) update themselves on every
insert/update — nothing to refresh. The MySQL **FULLTEXT** index on `judgment_pages` benefits from
compaction after a large import: run `php artisan judgments:optimize-search-index` once after the first
full scrape, then occasionally (e.g. weekly) — not after every daily run.

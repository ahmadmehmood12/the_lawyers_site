# LHC reported judgments scraper

Imports **Lahore High Court** reported judgments judge by judge, through the "Hon'ble Judge"
filter of both pages:

- current judges: https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting (about 4,718)
- former judges: https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting_by_former_judges (about 5,109, imported once)

Per judgment: Case # → `case_type` (first line) and `case_number`, Title, Decision Date,
LHC Citation → `citation`, Other Citations → `other_citation`, PDF link → `pdf_path`, Tag Line →
`tag_line`, the judge from the filter → `judges` (a bench lists every judge), `uploaded_on` = the
day the scraper runs, `is_reported` = 1, `source_url` = the current judges page.

The first run imports everything (current + former); later runs send only judgments the site
does not have yet (`storage/state.json`), oldest decision first. Each PDF is read once for the
case law it cites; with `ANTHROPIC_API_KEY` set, an AI summary is written too.

```bash
cd lhc-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env                                # import URL, token, optional ANTHROPIC_API_KEY
.venv/bin/python scraper.py --dry-run --limit 5     # full counts per judge + the first 5 new
.venv/bin/python scraper.py                         # import (first run: everything)
```

Options: `--dry-run`, `--output FILE`, `--limit N`, `--former` (read the former judges again),
`--judge TEXT`, `--resend`, `--skip-pdf`, `--skip-summary`, `--store-pdf`, `--index-text`,
`--index-only` (backfill text/keywords/PDF for judgments already imported — no metadata change),
`--verbose`.
Shared code: `scraper_common.py`, `import_state.py`, `judgment_summary.py` (identical in all three scrapers).
Full guide: `docs/judgment-automation.md`.

## Running it day to day

**First run vs daily.** `storage/state.json` records every PDF the site has already accepted, so the
scraper is incremental. The **first run imports everything** (hours on the first full load; stored PDFs
use several GB of disk — safe to stop and resume). After that, a **daily run picks up only the new
judgments** — each is imported, its PDF stored, and its text + keywords extracted, in one pass. A quiet
day does nothing. Schedule daily with the server timezone set to **Asia/Karachi**, e.g. 02:00:

```
cd /www/wwwroot/law_site/judgements-scrapers/lhc-scraper && /www/wwwroot/law_site/judgements-scrapers/lhc-scraper/.venv/bin/python scraper.py >> storage/cron.log 2>&1
```

**What it extracts from each PDF.** Cited case law (`cited_citations`), the full page-by-page text, and
keywords. Keywords include the **important legal entities** — statutes ("Sales Tax Act, 1990"),
provisions ("Order 7, Rule 11", "Section 302, 324…"), case titles ("X v. Y"), case/application numbers
("C.M.A.No.5986 of 2015"), tariff codes ("PCT Heading 3206.4990") and parties/judges — not just frequent
words (up to 120 per judgment).

**Downloaded PDFs.** Opt-in: add `--store-pdf` on a run, or `--index-only` to download+store (and index) judgments already imported. Stored files go to the site's **private disk** at
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

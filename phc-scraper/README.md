# PHC reported judgments scraper

Imports **Peshawar High Court** reported judgments from
https://www.peshawarhighcourt.gov.pk/PHCCMS/reportedJudgments.php?action=search
(5,956 rows = 5,894 distinct judgments; connected cases share one PDF and are saved once).

Per judgment: `case_type` = the PHC category (Civil, Criminal, Constitutional, Service, Revenue,
Corporate), `case_number` = the court's label and number ("RFA 04-B of 2026"), parties → `title`,
Remarks → `remarks`, PHC Neutral Citation → `citation`, Other Citation → `other_citation`, Decision
Date → `decision_date`, PDF link → `pdf_path`, `uploaded_on` = the day the scraper runs,
`is_reported` = 1. The bench comes from the judge filter: one search per judge (49).

The first run imports everything; later runs send only judgments the site does not have yet
(`storage/state.json`), oldest decision first. Each PDF is read once for cited case law; with
`ANTHROPIC_API_KEY` set, an AI summary is written too.

```bash
cd phc-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python scraper.py --dry-run --limit 5     # full counts per judge + the first 5 new
.venv/bin/python scraper.py                         # import (first run: everything)
.venv/bin/python scraper.py --list-judges           # judge filter ids
```

Options: `--dry-run`, `--output FILE`, `--limit N`, `--year YYYY`, `--judge ID`, `--resend`,
`--skip-benches`, `--skip-pdf`, `--skip-summary`, `--store-pdf`, `--index-text`, `--index-only`
(backfill text/keywords/PDF for judgments already imported), `--verbose`. The PHC server answers 406 to
non-browser clients, so the scraper sends browser headers. Full guide: `docs/judgment-automation.md`.

## Running it day to day

**First run vs daily.** `storage/state.json` records every PDF the site has already accepted, so the
scraper is incremental. The **first run imports everything** (hours on the first full load; stored PDFs
use several GB of disk — safe to stop and resume). After that, a **daily run picks up only the new
judgments** — each is imported, its PDF stored, and its text + keywords extracted, in one pass. A quiet
day does nothing. Schedule daily with the server timezone set to **Asia/Karachi**, e.g. 02:00:

```
cd /www/wwwroot/law_site/phc-scraper && /www/wwwroot/law_site/phc-scraper/.venv/bin/python scraper.py >> storage/cron.log 2>&1
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

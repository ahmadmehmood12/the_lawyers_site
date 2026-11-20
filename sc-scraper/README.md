# Supreme Court reported judgments scraper

Imports **Supreme Court of Pakistan** reported judgments (court key `scp`).

**Why saved pages:** the reported archive is the search at https://scp.gov.pk/JudgmentsSearch with
Reported = Yes (about 3,874 judgments, ~155 pages). That search is protected by Google reCAPTCHA,
which exists to stop automated searching, so this scraper does not submit it or page through it.
Instead:

1. Open https://scp.gov.pk/JudgmentsSearch in your browser, set **Reported = Yes**, Search.
2. Save each results page (Cmd/Ctrl+S, "Web page, HTML only") into `sc-scraper/storage/saved/`
   (any names, e.g. page-001.html … page-155.html).
3. `.venv/bin/python scraper.py --dry-run` (counts and preview), then `.venv/bin/python scraper.py`.

Every judgment in those pages is saved as reported (`is_reported = 1`), with or without a citation.
Re-running only sends judgments not imported yet, oldest decision first. For new judgments later,
save the first few result pages again and run it again.

`--latest` reads https://scp.gov.pk/LatestJudgments (no captcha, newest ~25, no Reported column:
saved as unreported unless `--latest-reported`).

Per judgment: Case Subject → `case_type`, Case No → `case_number`, Case Title → `title`, Author
Judge → `judges`, Judgment Date → `decision_date`, Citation → `citation`, SC Citation →
`sc_citation`, PDF link → `pdf_path`, tagline row → `tag_line`, `uploaded_on` = the day the
scraper runs, `source_url` = https://scp.gov.pk/JudgmentsSearch.

By default the SC scraper **downloads each PDF and stores it on the site** (served by the website,
with plan-gated download) and **extracts the full text + keywords** for search, from one download.
Use `--no-store-pdf` / `--no-index-text` to turn either off. Storing is especially useful for SC,
whose site refused to embed its PDFs inside other pages in testing.

Options: `--dry-run`, `--output FILE`, `--from-html FILES`, `--unreported-pages`, `--latest`,
`--latest-reported`, `--limit N`, `--resend`, `--skip-pdf`, `--skip-summary`, `--no-store-pdf`, `--no-index-text`, `--index-only`, `--verbose`. Full guide: `docs/judgment-automation.md`.

## Running it day to day

**First run vs daily.** `storage/state.json` records every PDF the site has already accepted, so the
scraper is incremental. The **first run imports everything** (hours on the first full load; stored PDFs
use several GB of disk — safe to stop and resume). After that, a **daily run picks up only the new
judgments** — each is imported, its PDF stored, and its text + keywords extracted, in one pass. A quiet
day does nothing. Schedule daily with the server timezone set to **Asia/Karachi**, e.g. 02:00:

```
cd /www/wwwroot/law_site/sc-scraper && /www/wwwroot/law_site/sc-scraper/.venv/bin/python scraper.py >> storage/cron.log 2>&1
```

**What it extracts from each PDF.** Cited case law (`cited_citations`), the full page-by-page text, and
keywords. Keywords include the **important legal entities** — statutes ("Sales Tax Act, 1990"),
provisions ("Order 7, Rule 11", "Section 302, 324…"), case titles ("X v. Y"), case/application numbers
("C.M.A.No.5986 of 2015"), tariff codes ("PCT Heading 3206.4990") and parties/judges — not just frequent
words (up to 120 per judgment).

**Downloaded PDFs.** Stored **by default** (use `--no-store-pdf` to keep only the court link); especially useful for SC, whose site refused to embed its PDFs in-page. Stored files go to the site's **private disk** at
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

# PHC reported judgments scraper

Imports **Peshawar High Court** reported judgments from
`https://www.peshawarhighcourt.gov.pk/PHCCMS/reportedJudgments.php?action=search`
into the site through `POST /api/judgments/import` (same endpoint and token as `lhc-scraper`).

For every row of the results table it sends: `case_type` = the PHC category (Civil,
Criminal, Constitutional, Service, Revenue, Corporate), `case_number` = the court's label and
number ("RFA 04-B of 2026"), parties (`title`), remarks (headnote), PHC neutral citation
(`citation`), other law report citation (`other_citation`), decision date, `uploaded_on` = the
day the scraper ran, PDF link (`pdf_path`) and the listing URL (`source_url`).
The bench comes from the page's judge filter (one search per judge; Division Bench
judgments list every judge). Each PDF is read once in memory with pypdf to collect the
case law it cites (`cited_citations`), together with citations found in the remarks.

## Quick start

```bash
cd phc-scraper
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # set JUDGMENTS_IMPORT_URL and JUDGMENTS_IMPORT_TOKEN

.venv/bin/python scraper.py --dry-run --limit 5     # test: prints each judgment, saves storage/dry-run-results.json
.venv/bin/python scraper.py                         # this year's judgments (daily cron)
.venv/bin/python scraper.py --all-years             # first full import (about 6,000 judgments; hours)
.venv/bin/python scraper.py --list-judges           # judge filter ids
.venv/bin/python scraper.py --judge 26 --year 2025  # one judge's judgments only
```

Options: `--output FILE` (dry run JSON elsewhere), `--year YYYY`, `--all-years`, `--judge ID`, `--limit N`, `--skip-pdf` (no PDF
downloads; cited case law from remarks only), `--skip-benches` (no per judge searches;
bench saved as "Peshawar High Court"), `--dry-run`, `--verbose`.

Cron (daily 02:30 PKT, after the LHC scraper):

```bash
cd /www/wwwroot/law_site/phc-scraper && .venv/bin/python scraper.py >> storage/cron.log 2>&1
```

Notes
- The PHC server answers **406** to non-browser user agents; the scraper sends browser headers.
- The page says ISO-8859-1 but is UTF-8; broken `<br?` tags in some remarks are repaired.
- Scanned (image) PDFs give unreliable text, so their cited case law may be empty.
- PDF results are cached in `storage/pdf_citations.json`; logs in `storage/scraper.log`.

Full guide: `docs/judgment-automation.md`.

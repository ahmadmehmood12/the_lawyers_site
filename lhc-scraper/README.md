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
`--judge TEXT`, `--resend`, `--skip-pdf`, `--skip-summary`, `--verbose`.
Shared code: `scraper_common.py`, `import_state.py`, `judgment_summary.py` (identical in all three scrapers).
Full guide: `docs/judgment-automation.md`.

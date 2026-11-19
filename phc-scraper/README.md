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
`--skip-benches`, `--skip-pdf`, `--skip-summary`, `--verbose`. The PHC server answers 406 to
non-browser clients, so the scraper sends browser headers. Full guide: `docs/judgment-automation.md`.

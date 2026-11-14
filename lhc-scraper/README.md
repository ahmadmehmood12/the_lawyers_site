# LHC reported judgments scraper

Daily metadata importer for the Lahore High Court **Latest Reported Judgments**
listing. It uses Requests + BeautifulSoup, never downloads PDFs, and POSTs each
row to the Laravel endpoint `POST /api/judgments/import` with a bearer token.

## Quick start

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
# edit .env: JUDGMENTS_IMPORT_URL and JUDGMENTS_IMPORT_TOKEN
.venv/bin/python scraper.py --dry-run --limit 5
.venv/bin/python scraper.py
```

Run the parser tests:

```bash
.venv/bin/python -m unittest discover -s tests -v
```

Logs are written to `storage/scraper.log`. The script is safe to schedule with
cron because a lock prevents overlapping runs.

Full setup, API contract, duplicate rules, response codes, and the exact aaPanel
cron command are in [`docs/judgment-automation.md`](../docs/judgment-automation.md).

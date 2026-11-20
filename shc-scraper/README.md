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
.venv/bin/python scraper.py                         # import (first run: everything)
.venv/bin/python scraper.py --index-text            # also send full text + keywords for search
```

Options: `--dry-run`, `--output FILE`, `--limit N`, `--judge TEXT`, `--resend`, `--skip-pdf`,
`--skip-summary`, `--index-text`, `--verbose`.

### Phrase / keyword search (`--index-text`)

With `--index-text` the scraper also extracts each judgment PDF's full text, page by page, and a
set of keywords, and POSTs them to `/api/judgments/text`. Text comes from **PyMuPDF**; scanned
pages fall back to **Tesseract OCR** when the `tesseract` binary is installed (otherwise the page
is kept as-is and the status records that OCR was skipped). Keywords use a lightweight frequency
method — no spaCy model download. The site then offers phrase search (`"exact phrase"`) and keyword
search over the stored text, returning the matching page numbers and keywords. Already-indexed
judgments are skipped (`storage/state.json`), so re-running only indexes new ones; `--resend`
re-indexes everything. Full guide: `docs/judgment-automation.md`.

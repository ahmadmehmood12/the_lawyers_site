# Supreme Court reported judgments scraper

Imports **Supreme Court of Pakistan** judgments into the site through `POST /api/judgments/import`
(same endpoint and token as `lhc-scraper` and `phc-scraper`). Court key `scp`.

| Grid column | Saved as |
|---|---|
| Case Subject (`subject-cell`) | `case_type` ("Writ Petition / Direction") |
| Case No (`metadata-cell`) | `case_number` ("C.P.L.A.423-K/2015") |
| Case Title (`case-title`) | `title` |
| Author Judge (`author-judge`) | `judges` |
| Judgment Date | `decision_date` |
| Citation | `citation` ("2017 SCMR 1098") |
| SC Citation | `sc_citation` ("2018 SCP 131") |
| Download (`download-cell` link) | `pdf_path` |
| tagline row | `tag_line` |
| — | `uploaded_on` = the day the scraper ran; `source_url` = https://scp.gov.pk/JudgmentsSearch |

Cited case law comes from the tag line and the PDF (read once in memory, cached in
`storage/pdf_citations.json`); the judgment's own citations are excluded.

## Two ways to get judgments

1. **Saved search pages** (the reported archive): the search form at
   `https://scp.gov.pk/JudgmentsSearch` is protected by Google reCAPTCHA, so this scraper never
   submits it. Open it in your browser, set **Reported = Yes**, search, and save each results
   page (Cmd+S / Ctrl+S, "Web page, HTML only") into a folder. Every judgment in those pages is
   reported, with or without a citation, and is saved with `is_reported = 1`:

   ```bash
   .venv/bin/python scraper.py --from-html saved/*.html --dry-run   # check
   .venv/bin/python scraper.py --from-html saved/*.html             # import
   ```
   (`--unreported-pages` if you ever save a Reported = No search: `is_reported = 0`.)
2. **Latest Judgments page** (default, no captcha): `https://scp.gov.pk/LatestJudgments` lists the
   newest judgments but has no Reported column, so they are saved as unreported
   (`is_reported = 0`, hidden on the site). When the same judgment is imported later from a
   Reported = Yes page it becomes reported automatically. Use `--latest-reported` to save them
   as reported straight away.

## Commands

```bash
cd sc-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env            # JUDGMENTS_IMPORT_URL and JUDGMENTS_IMPORT_TOKEN

.venv/bin/python scraper.py --dry-run          # test: lists every judgment found and how it would be saved;
                                               # saves storage/dry-run-results.json
.venv/bin/python scraper.py                    # import the Latest Judgments page (saved as unreported)
```

Options: `--dry-run`, `--output FILE` (dry run JSON elsewhere), `--from-html FILES` (saved as
reported), `--unreported-pages` (saved pages came from Reported = No), `--latest-reported` (Latest
page saved as reported), `--limit N`, `--skip-pdf`, `--verbose`. Citations never decide whether a
judgment is reported.

Cron (daily 03:00 PKT): `cd /www/wwwroot/law_site/sc-scraper && .venv/bin/python scraper.py >> storage/cron.log 2>&1`

Full guide: `docs/judgment-automation.md`.

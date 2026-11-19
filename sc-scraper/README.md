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

Options: `--dry-run`, `--output FILE`, `--from-html FILES`, `--unreported-pages`, `--latest`,
`--latest-reported`, `--limit N`, `--resend`, `--skip-pdf`, `--skip-summary`, `--verbose`.
Full guide: `docs/judgment-automation.md`.

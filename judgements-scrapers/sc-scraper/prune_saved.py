#!/usr/bin/env python3
"""Delete saved search pages whose judgments have all been imported.

A page in storage/saved/ is deleted only when every judgment on it is recorded as imported in
storage/state.json (written by scraper.py after the site accepted it). Pages with a judgment not
imported yet are kept, so a later run can still pick them up. Rows the scraper skips (no case number,
title or court PDF link) can never be imported and do not keep a page.

    .venv/bin/python prune_saved.py            # report only
    .venv/bin/python prune_saved.py --delete   # delete the fully imported pages
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from import_state import ImportState
from scraper import DEFAULT_SOURCE_URL, STORAGE, parse_judgments


def main() -> int:
    parser = argparse.ArgumentParser(description="Delete saved SC search pages that are fully imported.")
    parser.add_argument("--delete", action="store_true", help="Delete the fully imported pages (default: only report).")
    args = parser.parse_args()
    logging.getLogger("sc_scraper").setLevel(logging.ERROR)  # rows without a PDF link are expected

    state = ImportState(STORAGE / "state.json")
    kept = deleted = 0
    for page in sorted((STORAGE / "saved").glob("*.html")):
        records, _total, skipped = parse_judgments(page.read_text(encoding="utf-8", errors="replace"), DEFAULT_SOURCE_URL)
        missing = [record for record in records if not state.is_imported(record.pdf_path)]
        done = bool(records) and not missing
        print(f"{page.name}: {len(records)} judgments, {skipped} skipped rows, {len(missing)} not imported{' -> fully imported' if done else ''}")
        if done and args.delete:
            page.unlink()
            deleted += 1
        elif not done:
            kept += 1

    print(f"Imported so far: {len(state.imported)}. Pages kept: {kept}. Pages deleted: {deleted}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""What has already been sent to the site (shared by lhc-, phc- and sc-scraper).

storage/state.json keeps the PDF links of every judgment the site accepted (imported or already
there) and a few flags, such as whether the one-time former judges import has run. The first run
sends everything; later runs send only judgments not in this list. Delete the file to start over.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


class ImportState:
    def __init__(self, path: Path) -> None:
        self.path = path
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            data = {}
        self.imported: set[str] = set(data.get("imported", []))
        self.indexed: set[str] = set(data.get("indexed", []))
        self.stored: set[str] = set(data.get("stored", []))
        self.flags: dict[str, str] = dict(data.get("flags", {}))

    def is_imported(self, pdf_url: str) -> bool:
        return pdf_url in self.imported

    def mark(self, pdf_url: str) -> None:
        self.imported.add(pdf_url)

    def is_indexed(self, pdf_url: str) -> bool:
        """Whether the PDF's full text + keywords have already been sent to the site."""
        return pdf_url in self.indexed

    def mark_indexed(self, pdf_url: str) -> None:
        self.indexed.add(pdf_url)

    def is_stored(self, pdf_url: str) -> bool:
        """Whether the PDF file itself has already been downloaded and uploaded to the site."""
        return pdf_url in self.stored

    def mark_stored(self, pdf_url: str) -> None:
        self.stored.add(pdf_url)

    def flag(self, name: str) -> str | None:
        return self.flags.get(name)

    def set_flag(self, name: str) -> None:
        self.flags[name] = datetime.now().isoformat(timespec="seconds")

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(json.dumps({"flags": self.flags, "imported": sorted(self.imported), "indexed": sorted(self.indexed), "stored": sorted(self.stored)}, indent=0), encoding="utf-8")
        temporary.replace(self.path)

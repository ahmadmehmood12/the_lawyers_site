"""AI summaries of judgments with the Claude API (shared by lhc-, phc- and sc-scraper).

Each judgment's PDF text (plus the court's tag line or remarks) goes to Claude, which returns a
structured summary for advocates: overview, outcome, facts, issues, held, reasoning and the laws
applied. On only when ANTHROPIC_API_KEY is set in the scraper's .env (or --skip-summary turns it
off). Summaries are cached in storage/summaries.json so a judgment is summarised once.

Settings (.env): SUMMARY_MODEL (default claude-opus-5-5), SUMMARY_EFFORT (default medium).
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path

import anthropic

logger = logging.getLogger("judgment_summary")

DEFAULT_MODEL = "claude-opus-5-5"
# Very long judgments are cut here (about 150K tokens) and the cut is logged, never silent.
MAX_TEXT_CHARS = 600_000

SCHEMA = {
    "type": "object",
    "properties": {
        "overview": {"type": "string", "description": "3 to 5 plain sentences: who, what was challenged, what the court decided."},
        "outcome": {"type": "string", "description": "One short line, e.g. 'Appeal allowed; case remanded for fresh decision'."},
        "facts": {"type": "string", "description": "The material facts in one short paragraph."},
        "issues": {"type": "array", "items": {"type": "string"}, "description": "The legal questions the court decided, each as a question."},
        "held": {"type": "string", "description": "What the court held on each issue."},
        "reasoning": {"type": "string", "description": "The court's main reasons and the precedents it relied on, in one or two paragraphs."},
        "laws": {"type": "array", "items": {"type": "string"}, "description": "Statutes, sections, articles and rules applied, as cited (e.g. 'Section 497, Cr.P.C.')."},
    },
    "required": ["overview", "outcome", "facts", "issues", "held", "reasoning", "laws"],
    "additionalProperties": False,
}

SYSTEM = (
    "You summarise judgments of Pakistani courts for advocates. Use only what the judgment says: "
    "never add facts, parties, citations or outcomes that are not in the text. Write in clear, "
    "formal English, keep legal terms as the court used them, and name statutes and sections as "
    "cited. If the text is garbled (for example poor OCR of a scanned judgment) or incomplete, say "
    "so in the overview and summarise only what can be read reliably."
)


class Summarizer:
    """Creates and caches summaries. ``enabled`` is False when no API key is configured."""

    def __init__(self, cache_file: Path, enabled: bool = True) -> None:
        self.enabled = enabled and bool(os.getenv("ANTHROPIC_API_KEY"))
        self.model = os.getenv("SUMMARY_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        self.effort = os.getenv("SUMMARY_EFFORT", "medium").strip() or "medium"
        self.cache_file = cache_file
        self.cache: dict[str, dict] = self._load()
        self.client = anthropic.Anthropic() if self.enabled else None
        self.created = 0

    def _load(self) -> dict[str, dict]:
        try:
            data = json.loads(self.cache_file.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}

    def save(self) -> None:
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.cache_file.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.cache, ensure_ascii=False, indent=0), encoding="utf-8")
        temporary.replace(self.cache_file)

    def cached(self, key: str) -> dict | None:
        return self.cache.get(key)

    def summarize(self, key: str, text: str, meta: dict[str, str | None]) -> dict | None:
        """Summary for one judgment (from the cache when present). None when off or it fails."""
        if key in self.cache:
            return self.cache[key]
        if not self.enabled or not text.strip():
            return None

        if len(text) > MAX_TEXT_CHARS:
            logger.warning("Judgment text for %s is %d characters; summarising the first %d.", key, len(text), MAX_TEXT_CHARS)
            text = text[:MAX_TEXT_CHARS]

        details = "\n".join(f"{label}: {value}" for label, value in meta.items() if value)
        prompt = (
            f"{details}\n\n<judgment>\n{text}\n</judgment>\n\n"
            "Summarise this judgment in the structure requested."
        )

        for attempt in range(1, 4):
            try:
                response = self.client.beta.messages.create(
                    model=self.model,
                    max_tokens=16000,
                    betas=["server-side-fallback-2026-07-01"],
                    fallbacks="default",
                    system=SYSTEM,
                    output_config={"effort": self.effort, "format": {"type": "json_schema", "schema": SCHEMA}},
                    messages=[{"role": "user", "content": prompt}],
                )
            except anthropic.BadRequestError as exc:
                logger.warning("Summary request rejected for %s: %s", key, exc.message)
                return None
            except anthropic.AuthenticationError:
                logger.error("ANTHROPIC_API_KEY was rejected; summaries are switched off for this run.")
                self.enabled = False
                return None
            except anthropic.RateLimitError as exc:
                wait = int(exc.response.headers.get("retry-after", "30") or 30)
                logger.warning("Claude API rate limit; waiting %ds (attempt %d/3).", wait, attempt)
                time.sleep(min(wait, 120))
                continue
            except anthropic.APIStatusError as exc:
                logger.warning("Claude API error %s for %s; the summary will be tried on a later run.", exc.status_code, key)
                return None
            except anthropic.APIConnectionError:
                logger.warning("Could not reach the Claude API for %s; the summary will be tried on a later run.", key)
                return None

            if response.stop_reason == "refusal":
                logger.warning("Summary declined for %s; skipped.", key)
                return None
            if response.stop_reason == "max_tokens":
                logger.warning("Summary for %s was cut off; skipped.", key)
                return None

            text_block = next((block.text for block in response.content if block.type == "text"), "")
            try:
                summary = json.loads(text_block)
            except ValueError:
                logger.warning("Summary for %s was not valid JSON; skipped.", key)
                return None

            summary["model"] = response.model
            self.cache[key] = summary
            self.created += 1
            if self.created % 10 == 0:
                self.save()
            return summary

        return None

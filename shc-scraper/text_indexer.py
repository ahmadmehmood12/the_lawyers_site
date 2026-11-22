"""PDF text extraction + keyword indexing for the judgment scrapers (identical copy in each folder).

Given a judgment PDF already downloaded into memory, this returns the text of every page and a
list of meaningful keywords/phrases, so the site can offer phrase and keyword search. The complete
page text is always returned whole; the keywords are a supplementary index, never a replacement.

- Text: PyMuPDF (``fitz``) page by page; falls back to ``pypdf`` when PyMuPDF is not installed.
- Scanned pages (little or no extractable text): Tesseract OCR through ``pytesseract`` + Pillow,
  used only when the library and the ``tesseract`` binary are both present. When OCR is unavailable
  the page is kept as-is and ``status``/``ocr_used`` record that OCR was skipped, so nothing is lost.
- Keywords: a lightweight frequency approach (no spaCy model download). The text is tokenised,
  English and legal-boilerplate stopwords and pure numbers are dropped, and the most frequent
  meaningful single words and two/three-word legal phrases are kept. spaCy can replace this later
  without touching the rest of the pipeline.
"""

from __future__ import annotations

import io
import logging
import re
import shutil
from collections import Counter
from dataclasses import dataclass, field

logger = logging.getLogger("scraper")

try:  # PyMuPDF: best text extraction and the renderer used for OCR.
    import fitz  # type: ignore
except Exception:  # noqa: BLE001
    fitz = None

try:
    from pypdf import PdfReader
except Exception:  # noqa: BLE001
    PdfReader = None  # type: ignore

try:  # Optional OCR for scanned judgments.
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
except Exception:  # noqa: BLE001
    pytesseract = None  # type: ignore
    Image = None  # type: ignore

MAX_PAGES = 400
# A page with fewer real letters than this is treated as scanned and sent to OCR (when available).
MIN_CHARS_FOR_TEXT = 40
OCR_DPI = 300
# Stamps court upload systems print on scanned PDFs (e.g. IHC: 'Uploaded By: "Zulqarnain Shah"').
# They are not judgment text: removed before deciding whether a page is scanned, and never indexed.
UPLOAD_STAMP = re.compile(r"^[ \t]*(?:uploaded|scanned|verified)\s+by\s*:?.*$", flags=re.IGNORECASE | re.MULTILINE)
MAX_KEYWORDS = 120
MAX_KEYWORD_LEN = 190

# --- Legal-entity patterns ----------------------------------------------------
# These capture the *important* keywords a judgment turns on — statutes, provisions, the parties,
# the authorities it cites, people and technical codes — even when each appears only once. They run
# over the original-case text (not lower-cased) so "Sales Tax Act, 1990" is kept as written.

# Statutes / Acts / Ordinances / Codes, with an optional year: "Sales Tax Act, 1990", "Customs Act, 1969".
STATUTE_RE = re.compile(r"\b((?:[A-Z][A-Za-z&'.\-]+\s+){1,6}(?:Act|Ordinance|Rules|Code|Regulations?|Constitution|Policy|Scheme|Tribunal|Order))(?:,?\s*((?:19|20)\d{2}))?")
# Provisions: "Section 11", "Order 7, Rule 11", "Article 199", optionally chained.
PROVISION_RE = re.compile(r"\b((?:Sections?|Articles?|Rules?|Orders?|Chapters?|Schedules?|Clauses?)\s+\d+[A-Z\-]*(?:\s*(?:,|and|&|read with|r/w|of)\s*(?:Sections?|Articles?|Rules?|Orders?|the)?\s*\d+[A-Z\-]*)*)", re.IGNORECASE)
# Procedural law short forms.
LAW_CODE_RE = re.compile(r"\b(C\.?\s?P\.?\s?C\.?|Cr\.?\s?P\.?\s?C\.?|P\.?\s?P\.?\s?C\.?|Qanun[\s\-]?e[\s\-]?Shahadat|CNSA|NAB Ordinance)\b")
# Case titles "X v. Y" / "X versus Y": "Asif Traders and another v. Collector of Customs".
CASE_TITLE_RE = re.compile(r"\b([A-Z][\w.'&()\-]*(?:\s+(?:and|&)?\s*[A-Za-z][\w.'&()\-]*){0,6}?)\s+(?:v\.?|vs\.?|versus)\s+([A-Z][\w.'&()\-]*(?:\s+(?:and|&|of|the)?\s*[A-Za-z][\w.'&()\-]*){0,6})")
# Case / application numbers: "C.M.A.No.5986 of 2015", "Const. P. 1167/2010".
CASE_NO_RE = re.compile(r"\b([A-Z][A-Za-z.]{0,12}\.?\s*(?:No\.?s?\.?\s*)?\d+(?:\s*/\s*|\s+of\s+)(?:19|20)\d{2})")
# Tariff / technical codes: "PCT Heading 3206.4990", "HS Code 1234.5678".
CODE_RE = re.compile(r"\b((?:PCT|HS|H\.S\.|Tariff)\s+(?:Heading|Code|No\.?)?\s*[\d.]+)")
# Multi-word proper nouns (people, authorities): "Kafeel Ahmed Abbasi", "Collector of Customs".
PROPER_NOUN_RE = re.compile(r"\b([A-Z][a-z]{2,}(?:\s+(?:of|and|the|for|bin|al|e)\s+[A-Z][a-z]{2,}|\s+[A-Z][a-z]{2,}){1,3})\b")

# Noise to drop from the proper-noun / title catch (court boilerplate that is not a real keyword).
ENTITY_STOP = {
    "high court", "supreme court", "sindh high court", "lahore high court", "the state", "hon ble",
    "learned counsel", "order sheet", "sindh high", "district judge", "sessions judge", "civil judge",
}

# Standard English stopwords plus the boilerplate that fills every court PDF. Legal terms of art
# (bail, jurisdiction, narcotics, constitution, acquittal...) are deliberately NOT here.
STOPWORDS = {
    "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had", "her", "was", "one", "our",
    "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two", "way", "who",
    "boy", "did", "its", "let", "put", "say", "she", "too", "use", "that", "with", "have", "this", "will",
    "your", "from", "they", "know", "want", "been", "good", "much", "some", "time", "very", "when", "come",
    "here", "just", "like", "long", "make", "many", "more", "only", "over", "such", "take", "than", "them",
    "then", "well", "were", "what", "which", "their", "would", "there", "could", "other", "about", "into",
    "upon", "shall", "also", "under", "being", "these", "those", "after", "before", "where", "while", "whom",
    "hereby", "herein", "thereof", "therein", "whereas", "hence", "thus", "said", "same", "such", "any",
    "page", "pages", "sheet", "dated", "date", "order", "number", "versus", "through", "respect", "regard",
    "above", "below", "between", "against", "accordingly", "therefore", "however", "further", "whether",
    "para", "paras", "paragraph", "sub", "clause", "pdf", "copy", "office", "filed", "file", "annexure",
}


@dataclass
class TextResult:
    pages: list[tuple[int, str]] = field(default_factory=list)
    keywords: list[tuple[str, int]] = field(default_factory=list)
    ocr_used: bool = False
    status: str = "ok"  # ok | ocr | partial | needs_ocr | empty | error

    @property
    def page_count(self) -> int:
        return len(self.pages)


def ocr_available() -> bool:
    return bool(fitz and pytesseract and Image and shutil.which("tesseract"))


def _letters(text: str) -> int:
    return sum(1 for ch in text if ch.isalpha())


def strip_stamps(text: str) -> str:
    return UPLOAD_STAMP.sub("", text or "").strip()


def _pages_pymupdf(content: bytes) -> tuple[list[str], bool, int]:
    """Page texts via PyMuPDF, with per-page Tesseract OCR for scanned pages when available.

    Returns (texts, ocr_used, scanned pages that could not be OCR'd because Tesseract is missing)."""
    ocr_used = False
    missed = 0
    texts: list[str] = []
    can_ocr = ocr_available()
    with fitz.open(stream=content, filetype="pdf") as doc:  # type: ignore[union-attr]
        for page in list(doc)[:MAX_PAGES]:
            text = strip_stamps(page.get_text("text") or "")
            if _letters(text) < MIN_CHARS_FOR_TEXT and not can_ocr and page.get_images():
                missed += 1
            if _letters(text) < MIN_CHARS_FOR_TEXT and can_ocr:
                try:
                    pixmap = page.get_pixmap(dpi=OCR_DPI)
                    image = Image.open(io.BytesIO(pixmap.tobytes("png")))  # type: ignore[union-attr]
                    ocr_text = strip_stamps(pytesseract.image_to_string(image, config="--psm 3") or "")  # type: ignore[union-attr]
                    if _letters(ocr_text) > _letters(text):
                        text = ocr_text
                        ocr_used = True
                except Exception as exc:  # noqa: BLE001
                    logger.warning("OCR failed on a page: %s", exc)
            texts.append(text)

    return texts, ocr_used, missed


def _pages_pypdf(content: bytes) -> list[str]:
    reader = PdfReader(io.BytesIO(content))  # type: ignore[misc]

    return [strip_stamps(page.extract_text() or "") for page in reader.pages[:MAX_PAGES]]


def extract(content: bytes) -> TextResult:
    """Full page-by-page text and supplementary keywords for one judgment PDF."""
    ocr_used = False
    missed = 0
    try:
        if fitz is not None:
            texts, ocr_used, missed = _pages_pymupdf(content)
        elif PdfReader is not None:
            texts = _pages_pypdf(content)
        else:
            return TextResult(status="error")
    except Exception as exc:  # noqa: BLE001 - one unreadable PDF must not stop the run
        logger.warning("Could not extract PDF text: %s", exc)
        return TextResult(status="error")

    pages = [(index, re.sub(r"[ \t]+", " ", text).strip()) for index, text in enumerate(texts, start=1) if text and text.strip()]
    if missed:
        # Scanned pages and no Tesseract: do not index a stamp-only or half-read judgment; the
        # scraper retries it automatically once OCR is installed (status needs_ocr).
        logger.warning("Scanned PDF (%d image-only pages) but Tesseract OCR is not installed; it will be indexed once OCR is available.", missed)
        return TextResult(pages=pages, keywords=extract_keywords("\n".join(t for _, t in pages)) if pages else [], ocr_used=ocr_used, status="needs_ocr")
    if not pages:
        return TextResult(ocr_used=ocr_used, status="empty")

    full_text = "\n".join(text for _, text in pages)
    keywords = extract_keywords(full_text)
    empty_pages = len(texts) - len(pages)
    status = "ocr" if ocr_used else ("partial" if empty_pages else "ok")

    return TextResult(pages=pages, keywords=keywords, ocr_used=ocr_used, status=status)


def _clean_entity(value: str) -> str:
    """Tidy a captured entity: collapse spaces, drop leading filler and trailing connectors."""
    value = re.sub(r"\s+", " ", value).strip(" ,.;:-")
    value = re.sub(r"^(?:In the matter of|In re|In the case of|Through|And|Of|The)\s+", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+(?:and|&|of|the|read with|r/w)$", "", value, flags=re.IGNORECASE).strip()
    return value


def extract_legal_entities(text: str) -> Counter:
    """Statutes, provisions, case titles, case numbers, codes and proper-noun phrases, with counts.

    These are kept even when they appear once, because a judgment often turns on a statute or an
    authority named a single time — exactly the keywords a search or an LLM assistant needs.
    """
    found: Counter[str] = Counter()

    def add(value: str) -> None:
        value = _clean_entity(value)
        if 3 < len(value) <= MAX_KEYWORD_LEN and value.lower() not in ENTITY_STOP:
            found[value] += 1

    for match in STATUTE_RE.finditer(text):
        statute = _clean_entity(match.group(1))
        add(f"{statute}, {match.group(2)}" if match.group(2) else statute)
    for rx in (PROVISION_RE, CASE_NO_RE, CODE_RE, LAW_CODE_RE):
        for match in rx.finditer(text):
            add(match.group(1))
    for match in CASE_TITLE_RE.finditer(text):
        add(f"{_clean_entity(match.group(1))} v. {_clean_entity(match.group(2))}")
    for match in PROPER_NOUN_RE.finditer(text):
        add(match.group(1))

    return found


def extract_keywords(text: str) -> list[tuple[str, int]]:
    """Important legal entities (statutes, provisions, parties, authorities, codes) first, then the
    most frequent meaningful words and phrases — each with how often it appears."""
    entities = extract_legal_entities(text)

    lower = text.lower()
    tokens = re.findall(r"[A-Za-z][A-Za-z'-]{2,}", lower)
    words = [t for t in tokens if t not in STOPWORDS and not t.isnumeric()]
    unigrams = Counter(words)
    phrases: Counter[str] = Counter()
    for size in (2, 3):
        for i in range(len(words) - size + 1):
            gram = words[i:i + size]
            if all(len(w) > 2 for w in gram):
                phrases[" ".join(gram)] += 1

    seen: set[str] = set()
    ranked: list[tuple[str, int]] = []

    def take(keyword: str, count: int) -> None:
        key = re.sub(r"[\s.]+", "", keyword).lower()
        if key and key not in seen and len(keyword) <= MAX_KEYWORD_LEN:
            seen.add(key)
            ranked.append((keyword, count))

    # Legal entities come first (most informative), by frequency then length.
    for keyword, count in sorted(entities.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0])):
        take(keyword, count)
    # Then recurring phrases and single words for topical coverage.
    for phrase, count in sorted(phrases.items(), key=lambda kv: (-kv[1], -len(kv[0]))):
        if count >= 2:
            take(phrase, count)
    for word, count in sorted(unigrams.items(), key=lambda kv: (-kv[1], kv[0])):
        if count >= 2:
            take(word, count)

    return ranked[:MAX_KEYWORDS]

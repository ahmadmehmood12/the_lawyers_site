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
MAX_KEYWORDS = 60
MAX_KEYWORD_LEN = 190

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
    status: str = "ok"  # ok | ocr | partial | empty | error

    @property
    def page_count(self) -> int:
        return len(self.pages)


def ocr_available() -> bool:
    return bool(fitz and pytesseract and Image and shutil.which("tesseract"))


def _letters(text: str) -> int:
    return sum(1 for ch in text if ch.isalpha())


def _pages_pymupdf(content: bytes) -> tuple[list[str], bool]:
    """Page texts via PyMuPDF, with per-page Tesseract OCR for scanned pages when available."""
    ocr_used = False
    texts: list[str] = []
    with fitz.open(stream=content, filetype="pdf") as doc:  # type: ignore[union-attr]
        for page in list(doc)[:MAX_PAGES]:
            text = page.get_text("text") or ""
            if _letters(text) < MIN_CHARS_FOR_TEXT and ocr_available():
                try:
                    pixmap = page.get_pixmap(dpi=200)
                    image = Image.open(io.BytesIO(pixmap.tobytes("png")))  # type: ignore[union-attr]
                    ocr_text = pytesseract.image_to_string(image) or ""  # type: ignore[union-attr]
                    if _letters(ocr_text) > _letters(text):
                        text = ocr_text
                        ocr_used = True
                except Exception as exc:  # noqa: BLE001
                    logger.warning("OCR failed on a page: %s", exc)
            texts.append(text)

    return texts, ocr_used


def _pages_pypdf(content: bytes) -> list[str]:
    reader = PdfReader(io.BytesIO(content))  # type: ignore[misc]

    return [(page.extract_text() or "") for page in reader.pages[:MAX_PAGES]]


def extract(content: bytes) -> TextResult:
    """Full page-by-page text and supplementary keywords for one judgment PDF."""
    ocr_used = False
    try:
        if fitz is not None:
            texts, ocr_used = _pages_pymupdf(content)
        elif PdfReader is not None:
            texts = _pages_pypdf(content)
        else:
            return TextResult(status="error")
    except Exception as exc:  # noqa: BLE001 - one unreadable PDF must not stop the run
        logger.warning("Could not extract PDF text: %s", exc)
        return TextResult(status="error")

    pages = [(index, re.sub(r"[ \t]+", " ", text).strip()) for index, text in enumerate(texts, start=1) if text and text.strip()]
    if not pages:
        return TextResult(ocr_used=ocr_used, status="empty")

    full_text = "\n".join(text for _, text in pages)
    keywords = extract_keywords(full_text)
    empty_pages = len(texts) - len(pages)
    status = "ocr" if ocr_used else ("partial" if empty_pages else "ok")

    return TextResult(pages=pages, keywords=keywords, ocr_used=ocr_used, status=status)


def extract_keywords(text: str) -> list[tuple[str, int]]:
    """Most frequent meaningful words and two/three-word legal phrases, with their counts."""
    tokens = re.findall(r"[A-Za-z][A-Za-z'-]{2,}", text.lower())
    words = [t for t in tokens if t not in STOPWORDS and not t.isnumeric()]
    if not words:
        return []

    unigrams = Counter(words)

    phrases: Counter[str] = Counter()
    for size in (2, 3):
        for i in range(len(words) - size + 1):
            gram = words[i:i + size]
            if all(len(w) > 2 for w in gram):
                phrases[" ".join(gram)] += 1

    scored: dict[str, int] = {}
    for phrase, count in phrases.items():
        if count >= 2 and len(phrase) <= MAX_KEYWORD_LEN:
            scored[phrase] = count
    for word, count in unigrams.items():
        if count >= 2:
            scored[word] = max(scored.get(word, 0), count)

    ranked = sorted(scored.items(), key=lambda item: (-item[1], -len(item[0]), item[0]))

    return ranked[:MAX_KEYWORDS]

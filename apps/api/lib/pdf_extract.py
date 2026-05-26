import fitz  # PyMuPDF

from lib.settings import OCR_DPI, OCR_ENABLED, OCR_LANGUAGE, OCR_MAX_PAGES


def _layout_aware_page_text(page: fitz.Page) -> str:
    """
    Baut den Seitentext aus Wort-Koordinaten neu auf: Wörter auf derselben visuellen
    Zeile werden nach x sortiert zusammengefasst.

    Verwendet Overlap-based Clustering statt fester Bucket-Größe:
    Feste Buckets haben ein Grenzwertproblem (y=287.9 → Bucket 23, y=288.1 → Bucket 24).
    Overlap-Clustering prüft ob zwei Wörter sich vertikal überlappen (≥40 % Höhe) —
    das ist robust gegenüber font-bedingten y-Offsets zwischen Label und Wert.
    """
    try:
        raw_words = page.get_text("words")
    except Exception:
        return page.get_text()
    if not raw_words:
        return page.get_text()

    words: list[tuple[float, float, float, float, str]] = []
    for w in raw_words:
        if len(w) >= 5 and str(w[4]).strip():
            words.append((float(w[0]), float(w[1]), float(w[2]), float(w[3]), str(w[4])))
    if not words:
        return page.get_text()

    words.sort(key=lambda w: (w[1], w[0]))

    row_bounds: list[tuple[float, float]] = []        # (y0, y1) pro Zeile
    row_words:  list[list[tuple[float, str]]] = []    # (x0, text) pro Zeile

    for x0, y0, x1, y1, text in words:
        h = max(y1 - y0, 1.0)
        placed = False
        # Nur die letzten paar Zeilen prüfen (Wörter sind nach y sortiert)
        for i in range(len(row_bounds) - 1, max(len(row_bounds) - 10, -1), -1):
            ry0, ry1 = row_bounds[i]
            if ry1 < y0 - h:          # Zeile liegt zu weit oben → abbrechen
                break
            overlap = max(0.0, min(y1, ry1) - max(y0, ry0))
            if overlap / h >= 0.4:    # ≥40 % Höhenüberlappung → gleiche Zeile
                row_words[i].append((x0, text))
                row_bounds[i] = (min(ry0, y0), max(ry1, y1))
                placed = True
                break
        if not placed:
            row_bounds.append((y0, y1))
            row_words.append([(x0, text)])

    lines: list[str] = []
    for rw in row_words:
        rw.sort(key=lambda w: w[0])
        lines.append(" ".join(w[1] for w in rw))

    return "\n".join(lines)


def build_full_text_and_page_ranges(doc: fitz.Document) -> tuple[str, list[tuple[int, int]]]:
    """
    Rückgabe: vollständiger Text + für jede Seite [start, end) (Zeichen-Offsets in full_text).
    Verwendet layout-aware Extraktion damit Label/Wert-Paare auf derselben Zeile landen.
    """
    page_texts: list[str] = []
    for page in doc:
        page_texts.append(_layout_aware_page_text(page))

    ranges: list[tuple[int, int]] = []
    offset = 0
    n = len(page_texts)
    for i, t in enumerate(page_texts):
        lo = offset
        offset += len(t)
        ranges.append((lo, offset))
        if i < n - 1:
            offset += 1  # Trennzeichen von "\\n".join

    full_text = "\n".join(page_texts)
    return full_text, ranges


def _page_ranges_from_texts(page_texts: list[str]) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    offset = 0
    n = len(page_texts)
    for i, t in enumerate(page_texts):
        lo = offset
        offset += len(t)
        ranges.append((lo, offset))
        if i < n - 1:
            offset += 1
    return ranges


def build_ocr_text_ranges_and_textpages(
    doc: fitz.Document,
) -> tuple[str, list[tuple[int, int]], list[fitz.TextPage | None], str | None]:
    """
    Ein OCR-Durchlauf pro Seite: Text + Page-Ranges + TextPage-Objekte für search_for(..., textpage=).
    Rückgabe: (full_text, page_ranges, textpages, error_hint)
    """
    if len(doc) > OCR_MAX_PAGES:
        return (
            "",
            [],
            [],
            f"Zu viele Seiten für OCR (>{OCR_MAX_PAGES}). JOB_MAX_AGE / OCR_MAX_PAGES anpassen.",
        )

    page_texts: list[str] = []
    textpages: list[fitz.TextPage | None] = []
    first_err: str | None = None

    for page in doc:
        try:
            tp = page.get_textpage_ocr(
                dpi=OCR_DPI,
                full=True,
                language=OCR_LANGUAGE,
            )
            textpages.append(tp)
            page_texts.append(page.get_text("text", textpage=tp))
        except RuntimeError as e:
            if first_err is None:
                first_err = str(e)
            textpages.append(None)
            page_texts.append("")
        except Exception as e:
            if first_err is None:
                first_err = str(e)
            textpages.append(None)
            page_texts.append("")

    ranges = _page_ranges_from_texts(page_texts)
    full_text = "\n".join(page_texts)
    return full_text, ranges, textpages, first_err


def build_ocr_text_and_page_ranges(
    doc: fitz.Document,
) -> tuple[str, list[tuple[int, int]], str | None]:
    """
    Pro Seite Tesseract-OCR (PyMuPDF), Text wie native Extraktion mit \\n verknüpft.
    Rückgabe: (full_text, page_ranges, error_hint)
    """
    full_text, ranges, _tps, err = build_ocr_text_ranges_and_textpages(doc)
    return full_text, ranges, err


def extract_for_analysis(
    pdf_bytes: bytes,
) -> tuple[str, list[tuple[int, int]], bool, bool, str | None]:
    """
    Text für Presidio: zuerst nativer Text, sonst optional OCR.
    Rückgabe: (text, page_ranges, has_meaningful_text, used_ocr, error_hint)
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        full_text, ranges = build_full_text_and_page_ranges(doc)
        if len(full_text.strip()) > 30:
            return full_text, ranges, True, False, None

        if not OCR_ENABLED:
            return (
                full_text,
                ranges,
                False,
                False,
                "Kein auswählbarer Text und OCR ist deaktiviert (OCR_ENABLED).",
            )

        ocr_text, ocr_ranges, ocr_sys_err = build_ocr_text_and_page_ranges(doc)
        if len(ocr_text.strip()) > 30:
            return ocr_text, ocr_ranges, True, True, None

        hint = (
            "OCR hat keinen brauchbaren Text geliefert. Ist Tesseract installiert "
            "(und z. B. tesseract-ocr-deu)? Fehler: "
            + (ocr_sys_err or "unbekannt")
        )
        return ocr_text, ocr_ranges, False, True, hint
    finally:
        doc.close()


def pages_touching_range(
    start: int, end: int, page_ranges: list[tuple[int, int]]
) -> list[int]:
    """Seiten, deren Text-Anteil den halboffenen Zeichenbereich [start, end) schneidet."""
    out: list[int] = []
    for i, (ps, pe) in enumerate(page_ranges):
        if end > ps and start < pe:
            out.append(i)
    return out


def char_slice_on_page(
    full_text: str,
    start: int,
    end: int,
    page_index: int,
    page_ranges: list[tuple[int, int]],
) -> str:
    """Teilstring der Fundstelle, der zu dieser Seite gehört (für search_for)."""
    if page_index < 0 or page_index >= len(page_ranges):
        return ""
    n = len(full_text)
    start = max(0, min(int(start), n))
    end = max(0, min(int(end), n))
    ps, pe = page_ranges[page_index]
    lo = max(start, ps)
    hi = min(end, pe)
    if lo >= hi:
        return ""
    return full_text[lo:hi].strip()


def extract_text(pdf_bytes: bytes) -> tuple[str, bool]:
    """
    Extract all text from a PDF.
    Returns (full_text, has_selectable_text).
    CPU-/Speicher-intensiv bei großen PDFs — nur in einem Worker-Thread aufrufen,
    niemals direkt in der asyncio-Event-Loop (sonst reagiert :3001 für alle nicht mehr).
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        full_text, _ranges = build_full_text_and_page_ranges(doc)
        has_text = len(full_text.strip()) > 30
        return full_text, has_text
    finally:
        doc.close()


def extract_text_with_map(
    pdf_bytes: bytes,
) -> tuple[str, list[tuple[int, int]], bool]:
    """Wie extract_text, zusätzlich page_ranges für seitengetreue Schwärzung."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        full_text, ranges = build_full_text_and_page_ranges(doc)
        has_text = len(full_text.strip()) > 30
        return full_text, ranges, has_text
    finally:
        doc.close()

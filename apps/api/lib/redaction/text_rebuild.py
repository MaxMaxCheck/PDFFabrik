from __future__ import annotations

import re
from collections.abc import Callable

import fitz

from lib.detection_rules import is_safe_pdf_search_value
from lib.pdf_extract import (
    build_full_text_and_page_ranges,
    build_ocr_text_ranges_and_textpages,
)

from lib.redaction.labeled_numbers import _filter_protected_labeled_numbers
from lib.redaction.placeholders import PLACEHOLDERS
from lib.redaction.text_artifacts import clean_extracted_text_artifacts


def _apply_anonymization_spans_to_segment(
    text: str,
    spans: list[tuple[int, int, str, str]],
) -> str:
    """
    Wendet Fundstellen auf einen Teilstring an (Seitenlokale Zeichenoffsets).
    spans: (start, end, action, category) mit halboffenem [start, end).
    """
    if not spans:
        return text
    ordered = sorted(spans, key=lambda x: (x[0], x[1]))
    n = len(text)
    parts: list[str] = []
    i = 0
    for s, e, action, cat in ordered:
        s = max(0, min(int(s), n))
        e = max(s, min(int(e), n))
        if s < i:
            s = i
        if s >= e:
            continue
        parts.append(text[i:s])
        if action == "redact":
            parts.append("")
        else:
            parts.append(PLACEHOLDERS.get(cat, "[REDACTED]"))
        i = e
    parts.append(text[i:])
    return "".join(parts)


def _normalize_extracted_text_for_reflow(text: str) -> str:
    """Vereinheitlicht Zeilenumbrüche; verhindert riesige Lücken durch leere PDF-Seiten."""
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _write_reflow_text_pdf(
    doc: fitz.Document,
    text: str,
    page_width: float,
    page_height: float,
    margin: float,
    *,
    fontsize: float = 10.0,
    min_fontsize: float = 6.0,
    max_pages: int = 5000,
    on_page_written: Callable[[int], None] | None = None,
) -> None:
    """
    Schreibt den kompletten Text fortlaufend auf neue Seiten (einheitliches Seitenformat).
    Nutzt TextWriter.fill_textbox — Überlauf wird seitenweise weitergeführt.
    """
    box = fitz.Rect(margin, margin, page_width - margin, page_height - margin)
    if box.width < 24 or box.height < 24:
        raise ValueError("Seitenrand zu groß für nutzbaren Textbereich")

    font = fitz.Font("helv")
    remaining = text
    if not remaining:
        doc.new_page(width=page_width, height=page_height)
        return

    fs = fontsize
    pages_written = 0

    while remaining.strip():
        if pages_written >= max_pages:
            break

        placed = False
        for _attempt in range(28):
            page = doc.new_page(width=page_width, height=page_height)
            tw = fitz.TextWriter(page.rect)
            overflow = tw.fill_textbox(
                box,
                remaining,
                font=font,
                fontsize=fs,
                align=fitz.TEXT_ALIGN_LEFT,
            )
            next_rem = "\n".join(seg[0] for seg in overflow) if overflow else ""
            if overflow and next_rem.strip() == remaining.strip():
                doc.delete_page(doc.page_count - 1)
                fs = max(min_fontsize, fs - 0.5)
                continue
            tw.write_text(page)
            pages_written += 1
            if on_page_written is not None:
                on_page_written(pages_written)
            placed = True
            remaining = next_rem.strip() if overflow else ""
            break

        if not placed:
            break


def anonymize_rebuilt_text_pdf_to_bytes(
    pdf_bytes: bytes,
    dets: list[dict],
    choices: dict[str, str],
    on_progress: Callable[[str, int], None] | None = None,
    *,
    ocr_used: bool = False,
    active_categories: set[str] | None = None,
) -> bytes:
    """
    Neue PDF nur aus extrahiertem Fließtext: keine Bilder/Vektorgrafik aus der Quelle.
    Anonymisierung (inkl. Adresse, Name, E-Mail, …) erfolgt auf dem gesamten Text
    wie bei der Analyse — dann fortlaufender Textfluss auf neue Seiten im Format der
    ersten Quellseite (keine 1:1-Leerseiten, kein „neue Seite pro Originalseite“).
    """
    def emit(step: str, prog: int) -> None:
        if on_progress:
            on_progress(step, prog)

    emit("PDF wird geöffnet (Text-Modus) …", 5)
    src: fitz.Document | None = None
    out: fitz.Document | None = None
    try:
        src = fitz.open(stream=pdf_bytes, filetype="pdf")
        n_pages = len(src)
        if n_pages == 0:
            out = fitz.open()
            out.new_page(width=595, height=842)
            out.set_metadata({})
            return out.tobytes(garbage=4, deflate=True)

        if ocr_used:
            emit("OCR-Text für Neubau …", 10)
            full_text, _pr_ocr, _tps, ocr_err = build_ocr_text_ranges_and_textpages(
                src
            )
            if len(_pr_ocr) != n_pages or len(full_text.strip()) <= 30:
                emit("OCR schlägt fehl — nativer Text …", 12)
                full_text, _ = build_full_text_and_page_ranges(src)
            elif ocr_err:
                emit("OCR mit Hinweisen …", 11)
        else:
            full_text, _ = build_full_text_and_page_ranges(src)

        raw_active = [d for d in dets if choices.get(d["id"]) not in ("ignore", None)]
        active = [
            d
            for d in raw_active
            if is_safe_pdf_search_value(str(d.get("category", "")), str(d.get("value", "")))
        ]
        choice_categories = {
            str(d.get("category", ""))
            for d in active
            if str(choices.get(d.get("id"), "ignore")) not in ("ignore", "")
        }
        if choice_categories:
            active_categories = set(active_categories or set()) | choice_categories
        active = _filter_protected_labeled_numbers(active, full_text, active_categories)

        global_spans: list[tuple[int, int, str, str]] = []
        for d in active:
            try:
                ds, de = int(d["start"]), int(d["end"])
            except (KeyError, TypeError, ValueError):
                continue
            act = str(choices.get(d["id"], "ignore"))
            if act in ("ignore", ""):
                continue
            cat = str(d.get("category", ""))
            global_spans.append((ds, de, act, cat))

        anon_full = _apply_anonymization_spans_to_segment(full_text, global_spans)
        anon_full = clean_extracted_text_artifacts(anon_full)
        anon_full = _normalize_extracted_text_for_reflow(anon_full)

        emit(
            f"{len(active)} Fundstellen, Text fließend setzen (bis zu "
            f"{max(32, n_pages * 4)} Seiten) …",
            22,
        )

        ref = src[0].rect
        margin = 48.0
        max_pages_cap = max(32, min(5000, n_pages * 4 + 64, len(anon_full) // 350 + 48))

        out = fitz.open()
        last_reported = 0

        def on_page(_n: int) -> None:
            nonlocal last_reported
            if _n - last_reported >= max(1, max_pages_cap // 8) or _n == 1:
                prog = 22 + min(73, int(_n / max(max_pages_cap, 1) * 73))
                emit(f"Neue PDF: Seite {_n} …", min(prog, 95))
                last_reported = _n

        _write_reflow_text_pdf(
            out,
            anon_full,
            ref.width,
            ref.height,
            margin,
            fontsize=10.0,
            min_fontsize=6.0,
            max_pages=max_pages_cap,
            on_page_written=on_page,
        )

        emit("PDF wird geschrieben …", 97)
        out.set_metadata({})
        raw = out.tobytes(garbage=4, deflate=True)
        emit("Fertig", 100)
        return raw
    finally:
        if src is not None:
            src.close()
        if out is not None:
            out.close()

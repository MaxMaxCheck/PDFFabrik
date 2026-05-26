from __future__ import annotations

from collections.abc import Callable

import fitz

from lib.detection_rules import is_safe_pdf_search_value
from lib.pdf_extract import (
    build_full_text_and_page_ranges,
    build_ocr_text_ranges_and_textpages,
)

from lib.redaction.annotations import apply_redaction_annotations
from lib.redaction.text_rebuild import anonymize_rebuilt_text_pdf_to_bytes


def anonymize_pdf_to_bytes(
    pdf_bytes: bytes,
    dets: list[dict],
    choices: dict[str, str],
    on_progress: Callable[[str, int], None] | None = None,
    *,
    ocr_used: bool = False,
    active_categories: set[str] | None = None,
) -> bytes:
    def emit(step: str, prog: int) -> None:
        if on_progress:
            on_progress(step, prog)

    emit("PDF wird geöffnet …", 5)
    doc: fitz.Document | None = None
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        n_pages = len(doc)
        textpages: list[fitz.TextPage | None] | None = None

        if ocr_used:
            emit("OCR für Schwärzung (Tesseract) …", 12)
            full_text, page_ranges, textpages, ocr_err = build_ocr_text_ranges_and_textpages(
                doc
            )
            if len(page_ranges) != n_pages or len(full_text.strip()) <= 30:
                emit("OCR schlägt fehl — Fallback auf nativen Text …", 14)
                full_text, page_ranges = build_full_text_and_page_ranges(doc)
                textpages = None
            elif ocr_err:
                emit("OCR mit Hinweisen fortgesetzt …", 15)
        else:
            full_text, page_ranges = build_full_text_and_page_ranges(doc)

        raw_active = [d for d in dets if choices.get(d["id"]) not in ("ignore", None)]
        active = [
            d
            for d in raw_active
            if is_safe_pdf_search_value(str(d.get("category", "")), str(d.get("value", "")))
        ]
        total = len(active)

        emit(f"PDF geöffnet ({n_pages} Seiten), {total} Fundstellen …", 15)
        emit(f"{total} Fundstellen werden verarbeitet …", 20)

        def on_page_done(page_idx: int, np: int) -> None:
            emit("Schwärzungen werden angewendet …", 88)
            prog = 20 + int((page_idx + 1) / max(np, 1) * 65)
            if page_idx % max(1, np // 4) == 0 or page_idx == np - 1:
                emit(f"Seite {page_idx + 1} / {np}", min(prog, 85))

        apply_redaction_annotations(
            doc,
            active,
            choices,
            full_text,
            page_ranges,
            textpages=textpages,
            on_page_done=on_page_done,
            active_categories=active_categories,
        )

        emit("PDF wird geschrieben …", 95)
        doc.set_metadata({})
        raw = doc.tobytes(garbage=4, deflate=True)
        emit("Fertig", 100)
        return raw
    finally:
        if doc is not None:
            doc.close()


__all__ = ["anonymize_pdf_to_bytes", "anonymize_rebuilt_text_pdf_to_bytes"]

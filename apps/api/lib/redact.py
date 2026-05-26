import fitz  # PyMuPDF

from lib.anonymize_core import apply_redaction_annotations
from lib.detection_rules import is_safe_pdf_search_value
from lib.pdf_extract import build_full_text_and_page_ranges


def redact_pdf(
    pdf_bytes: bytes,
    detections: list[dict],
    choices: dict[str, str],  # detection_id → "redact" | "replace" | "ignore"
) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        raw_active = [d for d in detections if choices.get(d["id"]) not in ("ignore", None)]
        active = [
            d
            for d in raw_active
            if is_safe_pdf_search_value(str(d.get("category", "")), str(d.get("value", "")))
        ]
        full_text, page_ranges = build_full_text_and_page_ranges(doc)
        apply_redaction_annotations(doc, active, choices, full_text, page_ranges)
        doc.set_metadata({})
        return doc.tobytes(garbage=4, deflate=True)
    finally:
        doc.close()

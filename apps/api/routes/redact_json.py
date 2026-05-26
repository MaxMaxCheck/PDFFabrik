import asyncio
import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from lib.detect import detect_pii_fast
from lib.detection_rules import is_safe_pdf_search_value
from lib.pdf_extract import extract_for_analysis
from lib.pdf_strip_metadata import MAX_STRIP_BYTES
from lib.redaction.labeled_numbers import _filter_protected_labeled_numbers
from lib.redaction.placeholders import PLACEHOLDERS
from lib.redaction.text_artifacts import clean_extracted_text_artifacts
from lib.redaction.text_rebuild import _apply_anonymization_spans_to_segment

router = APIRouter()

_VALID_CATEGORIES = frozenset(PLACEHOLDERS.keys())


def _redact_text_sync(
    pdf_bytes: bytes,
    categories: list[str],
    mode: str,
) -> dict:
    text, _page_ranges, has_text, used_ocr, hint = extract_for_analysis(pdf_bytes)

    if not has_text:
        return {
            "text": text,
            "has_selectable_text": False,
            "used_ocr": used_ocr,
            "hint": hint,
            "detections_count": 0,
            "detections": [],
        }

    all_detections = detect_pii_fast(text)

    active_set = set(categories)
    active = [
        d for d in all_detections
        if d["category"] in active_set
        and is_safe_pdf_search_value(d["category"], str(d.get("value", "")))
    ]

    # Schaden-/Vers.-Nr. die NICHT in active_set sind schützen
    active = _filter_protected_labeled_numbers(active, text, active_set)

    spans: list[tuple[int, int, str, str]] = [
        (int(d["start"]), int(d["end"]), mode, str(d["category"]))
        for d in active
    ]

    anon_text = clean_extracted_text_artifacts(
        _apply_anonymization_spans_to_segment(text, spans)
    )

    return {
        "text": anon_text,
        "has_selectable_text": has_text,
        "used_ocr": used_ocr,
        "hint": hint,
        "detections_count": len(active),
        "detections": active,
    }


@router.post("/pdf-redact-json")
async def redact_pdf_to_json(
    file: UploadFile = File(...),
    categories: str = Form(...),
    mode: str = Form("replace"),
):
    """
    Gibt anonymisierten Fließtext zurück — keine PDF-Ausgabe.

    categories: JSON-Array der zu schwärzenden Kategorien,
                z.B. ["name","address","email","phone","iban","date","license_plate","vin"]
    mode:       "replace" (Platzhalter wie [NAME]) oder "redact" (leer)
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise HTTPException(400, "PDF zu groß (max. 80 MB).")

    try:
        cats: list[str] = json.loads(categories)
    except json.JSONDecodeError:
        raise HTTPException(400, "categories muss ein JSON-Array sein.")

    if not isinstance(cats, list) or not cats:
        raise HTTPException(400, "categories muss ein nicht-leeres JSON-Array sein.")

    cats = [c for c in cats if isinstance(c, str) and c in _VALID_CATEGORIES]
    if not cats:
        valid = sorted(_VALID_CATEGORIES)
        raise HTTPException(400, f"Keine gültigen Kategorien. Erlaubt: {valid}")

    if mode not in ("redact", "replace"):
        mode = "replace"

    try:
        result = await asyncio.to_thread(_redact_text_sync, pdf_bytes, cats, mode)
    except Exception as e:
        raise HTTPException(500, f"Anonymisierung fehlgeschlagen: {e!s}") from e

    return result

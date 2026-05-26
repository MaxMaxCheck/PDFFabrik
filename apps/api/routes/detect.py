"""Synchron: PDF → Text + Fundstellen (optional nach Kategorien gefiltert)."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from lib.detect import detect_pii
from lib.pdf_extract import extract_for_analysis
from lib.pdf_strip_metadata import MAX_STRIP_BYTES
from lib.redaction.placeholders import PLACEHOLDERS

router = APIRouter()

_VALID = frozenset(PLACEHOLDERS.keys())

# Deutsche / umgangssprachliche Aliase → interne Kategorie (wie in der Web-UI)
_CATEGORY_ALIASES: dict[str, str] = {
    "schadennummer": "claim_number",
    "schaden_nr": "claim_number",
    "schadensnummer": "claim_number",
    "versicherungsnummer": "insurance_number",
    "versicherung": "insurance_number",
    "versicherungs_nr": "insurance_number",
    "kennzeichen": "license_plate",
    "amtliches": "license_plate",
    "fahrgestellnummer": "vin",
    "fin": "vin",
    "iban": "iban",
    "email": "email",
    "e-mail": "email",
    "telefon": "phone",
    "tel": "phone",
    "telefonnummer": "phone",
    "datum": "date",
    "adresse": "address",
    "name": "name",
    "person": "name",
}

_MAX_TEXT = 120_000


def _normalize_categories_param(raw: str | None) -> frozenset[str] | None:
    if raw is None or not str(raw).strip():
        return None
    out: set[str] = set()
    for part in str(raw).split(","):
        key = part.strip().lower().replace(" ", "_")
        if not key:
            continue
        canon = _CATEGORY_ALIASES.get(key, key)
        if canon in _VALID:
            out.add(canon)
    if not out:
        valid = sorted(_VALID)
        raise HTTPException(
            400,
            f"Keine gültige Kategorie in «categories». Erlaubt: {valid}; "
            f"Aliase z. B. schadennummer → claim_number, versicherungsnummer → insurance_number.",
        )
    return frozenset(out)


@router.post("/detect")
async def detect_in_pdf(
    file: UploadFile = File(...),
    categories: str | None = Query(
        None,
        description="Optional: kommagetrennt, z. B. name,claim_number,email. "
        "Fehlt/leer → alle Kategorien. Aliase: schadennummer, versicherungsnummer, kennzeichen, …",
    ),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise HTTPException(400, "PDF zu groß (max. 80 MB).")

    allowed = _normalize_categories_param(categories)

    def _run():
        text, _ranges, has_text, ocr_used, ocr_hint = extract_for_analysis(pdf_bytes)
        if not has_text:
            return {
                "kind": "analyze",
                "text": "",
                "text_truncated": False,
                "hasSelectableText": False,
                "ocrUsed": ocr_used,
                "detections": [],
                "message": ocr_hint or "Kein auswertbarer Text (weder Textlayer noch OCR).",
            }
        detections = detect_pii(text, progress=None)
        if allowed is not None:
            detections = [d for d in detections if d.get("category") in allowed]
        truncated = len(text) > _MAX_TEXT
        out_text = text[:_MAX_TEXT] if truncated else text
        return {
            "kind": "analyze",
            "text": out_text,
            "text_truncated": truncated,
            "hasSelectableText": True,
            "ocrUsed": ocr_used,
            "detections": detections,
            "message": ocr_hint,
        }

    try:
        return await asyncio.to_thread(_run)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Analyse fehlgeschlagen: {e!s}") from e

import asyncio

from fastapi import APIRouter, File, HTTPException, UploadFile

from lib.pdf_extract import extract_text
from lib.pdf_strip_metadata import MAX_STRIP_BYTES

router = APIRouter()


@router.post("/tools/extract-text")
async def extract_text_endpoint(file: UploadFile = File(...)):
    """
    Reiner Fließtext für serverseitige Nutzung (z. B. Next /chat → Ollama),
    ohne pdf.js/Worker im Node-Bundle.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise HTTPException(400, "PDF ist zu groß (max. 80 MB).")

    try:
        text, has_selectable = await asyncio.to_thread(extract_text, pdf_bytes)
    except Exception as e:
        raise HTTPException(400, f"PDF konnte nicht gelesen werden: {e!s}") from e

    safe_name = (file.filename or "dokument.pdf").rsplit("/", 1)[-1]
    return {
        "filename": safe_name,
        "text": text,
        "has_selectable_text": has_selectable,
    }

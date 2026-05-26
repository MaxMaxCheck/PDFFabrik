import asyncio

from fastapi import APIRouter, File, HTTPException, UploadFile

from lib.pdf_read_metadata import read_pdf_metadata_info
from lib.pdf_strip_metadata import MAX_STRIP_BYTES

router = APIRouter()


@router.post("/tools/read-metadata")
async def read_metadata(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise HTTPException(400, "PDF ist zu groß (max. 80 MB).")

    try:
        info = await asyncio.to_thread(read_pdf_metadata_info, pdf_bytes)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except Exception as e:
        raise HTTPException(400, f"PDF konnte nicht gelesen werden: {e!s}") from e

    safe_name = (file.filename or "dokument.pdf").rsplit("/", 1)[-1]
    return {"filename": safe_name, **info}

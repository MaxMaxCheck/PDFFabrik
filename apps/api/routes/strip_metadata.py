import asyncio
import re
from urllib.parse import quote

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from lib.pdf_strip_metadata import MAX_STRIP_BYTES, strip_pdf_metadata_only

router = APIRouter()


@router.post("/tools/strip-metadata")
async def strip_metadata(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise HTTPException(400, "PDF ist zu groß (max. 80 MB).")

    try:
        out = await asyncio.to_thread(strip_pdf_metadata_only, pdf_bytes)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except Exception as e:
        raise HTTPException(400, f"PDF konnte nicht verarbeitet werden: {e!s}") from e

    safe = (file.filename or "dokument").rsplit("/", 1)[-1]
    if not safe.lower().endswith(".pdf"):
        safe = f"{safe}.pdf"
    base = safe[:-4] if safe.lower().endswith(".pdf") else safe
    base = re.sub(r'[\r\n"]+', "", base)[:180] or "dokument"
    download_name = f"{base}-ohne-metadaten.pdf"
    # ASCII-Fallback + RFC 5987 für Umlaute im Dateinamen
    content_disp = (
        f'attachment; filename="bereinigt-ohne-metadaten.pdf"; '
        f"filename*=UTF-8''{quote(download_name)}"
    )

    return Response(
        content=out,
        media_type="application/pdf",
        headers={"Content-Disposition": content_disp},
    )

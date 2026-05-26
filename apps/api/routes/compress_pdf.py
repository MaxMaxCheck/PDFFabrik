import asyncio
import io
import re
from urllib.parse import quote

import fitz
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from lib.pdf_strip_metadata import MAX_STRIP_BYTES

router = APIRouter()


_MIN_RECOMPRESS_PIXELS = 1024  # tiny icons skip re-encoding


def _recompress_images(doc: fitz.Document, image_quality: int) -> None:
    seen: set[int] = set()
    for page in doc:
        for img in page.get_images(full=True):
            xref = img[0]
            if xref in seen:
                continue
            seen.add(xref)
            try:
                pix = fitz.Pixmap(doc, xref)
                if pix.width * pix.height < _MIN_RECOMPRESS_PIXELS:
                    continue
                # strip alpha before JPEG encode
                if pix.alpha:
                    pix = fitz.Pixmap(pix, 0)
                # ensure RGB (not CMYK etc.)
                if pix.colorspace and pix.colorspace.n > 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                jpeg = pix.tobytes("jpeg", jpg_quality=image_quality)
                # only replace when the new JPEG is actually smaller
                if len(jpeg) < len(doc.xref_stream(xref)):
                    doc.update_stream(xref, jpeg)
                    doc.xref_set_key(xref, "Filter", "/DCTDecode")
                    doc.xref_set_key(xref, "ColorSpace", "/DeviceRGB")
                    doc.xref_set_key(xref, "BitsPerComponent", "8")
                    doc.xref_set_key(xref, "Width", str(pix.width))
                    doc.xref_set_key(xref, "Height", str(pix.height))
            except Exception:
                pass


def _compress_sync(pdf_bytes: bytes, image_quality: int = 72) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        _recompress_images(doc, image_quality)
        buf = io.BytesIO()
        doc.save(
            buf,
            garbage=4,
            deflate=True,
            deflate_fonts=True,
            clean=True,
        )
        return buf.getvalue()
    finally:
        doc.close()


@router.post("/tools/compress-pdf")
async def compress_pdf(
    file: UploadFile = File(...),
    image_quality: int = Form(72),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise HTTPException(400, "PDF ist zu groß (max. 80 MB).")

    quality = max(20, min(95, image_quality))
    try:
        out = await asyncio.to_thread(_compress_sync, pdf_bytes, quality)
    except Exception as e:
        raise HTTPException(500, f"Komprimierung fehlgeschlagen: {e!s}") from e

    safe = (file.filename or "dokument").rsplit("/", 1)[-1]
    base = safe[:-4] if safe.lower().endswith(".pdf") else safe
    base = re.sub(r'[\r\n"]+', "", base)[:180] or "dokument"
    download_name = f"{base}-komprimiert.pdf"
    content_disp = (
        f'attachment; filename="komprimiert.pdf"; '
        f"filename*=UTF-8''{quote(download_name)}"
    )

    return Response(
        content=out,
        media_type="application/pdf",
        headers={
            "Content-Disposition": content_disp,
            "X-Original-Size": str(len(pdf_bytes)),
            "X-Compressed-Size": str(len(out)),
            "Access-Control-Expose-Headers": "X-Original-Size, X-Compressed-Size",
        },
    )

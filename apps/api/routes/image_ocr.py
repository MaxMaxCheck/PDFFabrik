import asyncio

from fastapi import APIRouter, File, HTTPException, UploadFile

from lib.image_ocr import extract_text_from_image_bytes

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/extract-image-text")
async def extract_image_text(
    file: UploadFile = File(...),
    language: str | None = None,
):
    image_bytes = await file.read()
    try:
        return await asyncio.to_thread(
            extract_text_from_image_bytes,
            image_bytes,
            content_type=file.content_type or "",
            filename=file.filename or "image",
            language=language,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except RuntimeError as e:
        raise HTTPException(503, str(e)) from e

import asyncio
import json
import uuid

import redis
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from rq import Queue

from lib.redis_client import get_redis
from lib.settings import JOBS_DIR, QUEUE_NAME

router = APIRouter()


def _write_anonymize_job_files(job_id: str, pdf_bytes: bytes, meta: dict) -> None:
    """Sync I/O — darf nicht in der asyncio-Event-Loop laufen (große PDFs)."""
    base = JOBS_DIR / job_id
    base.mkdir(parents=True, exist_ok=True)
    (base / "input.pdf").write_bytes(pdf_bytes)
    (base / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False),
        encoding="utf-8",
    )


@router.post("/anonymize")
async def anonymize(
    file: UploadFile = File(...),
    detections: str = Form(...),
    choices: str = Form(...),
    ocr_used: str = Form("false"),
    output_mode: str = Form("layout"),
    active_categories: str = Form("[]"),
):
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")

    try:
        dets: list[dict] = json.loads(detections)
        chcs: dict[str, str] = json.loads(choices)
        cats_raw = json.loads(active_categories)
    except json.JSONDecodeError:
        raise HTTPException(400, "Ungültiges JSON.")

    cats = [c for c in cats_raw if isinstance(c, str)] if isinstance(cats_raw, list) else []

    try:
        r = get_redis()
        await asyncio.to_thread(r.ping)
    except redis.ConnectionError as e:
        raise HTTPException(
            503,
            f"Redis nicht erreichbar ({e!s}). Bitte Redis starten und env REDIS_URL prüfen.",
        ) from e

    job_id = str(uuid.uuid4())
    meta = {
        "kind": "anonymize",
        "detections": dets,
        "choices": chcs,
        "active_categories": cats,
        "ocr_used": str(ocr_used).lower() in ("1", "true", "yes"),
        "output_mode": (output_mode or "layout").strip().lower(),
    }
    await asyncio.to_thread(_write_anonymize_job_files, job_id, pdf_bytes, meta)

    q = Queue(QUEUE_NAME, connection=r)
    q.enqueue(
        "lib.job_tasks.anonymize_job_task",
        job_id,
        job_id=job_id,
        job_timeout=7200,
    )
    return JSONResponse(
        content={"job_id": job_id, "job_kind": "anonymize"},
        headers={"X-Anonymize-Mode": "job-queue"},
    )

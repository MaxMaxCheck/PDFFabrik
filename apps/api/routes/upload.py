import asyncio
import json
import uuid

import redis
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from rq import Queue

from lib.redis_client import get_redis
from lib.settings import JOBS_DIR, QUEUE_NAME

router = APIRouter()


def _write_analyze_job_files(job_id: str, pdf_bytes: bytes) -> None:
    """Sync I/O — darf nicht in der asyncio-Event-Loop laufen (große PDFs)."""
    base = JOBS_DIR / job_id
    base.mkdir(parents=True, exist_ok=True)
    (base / "input.pdf").write_bytes(pdf_bytes)
    (base / "job.json").write_text(
        json.dumps({"kind": "analyze"}),
        encoding="utf-8",
    )


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")

    try:
        r = get_redis()
        await asyncio.to_thread(r.ping)
    except redis.ConnectionError as e:
        raise HTTPException(
            503,
            f"Redis nicht erreichbar ({e!s}). Analyse läuft in Workern — Redis muss laufen.",
        ) from e

    job_id = str(uuid.uuid4())
    await asyncio.to_thread(_write_analyze_job_files, job_id, pdf_bytes)

    q = Queue(QUEUE_NAME, connection=r)
    q.enqueue(
        "lib.job_tasks.analyze_job_task",
        job_id,
        job_id=job_id,
        job_timeout=7200,
    )

    return JSONResponse(
        content={"job_id": job_id, "job_kind": "analyze"},
        headers={"X-Upload-Mode": "job-queue"},
    )

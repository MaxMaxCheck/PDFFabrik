import asyncio
import json
import uuid

import redis
from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from rq import Queue

from lib.internal_auth import normalize_owner_id
from lib.pdf_strip_metadata import MAX_STRIP_BYTES
from lib.redis_client import get_redis
from lib.settings import JOBS_DIR, QUEUE_NAME

router = APIRouter()


def _write_analyze_job_files(
    job_id: str, pdf_bytes: bytes, owner_user_id: str | None
) -> None:
    """Sync I/O — darf nicht in der asyncio-Event-Loop laufen (große PDFs)."""
    base = JOBS_DIR / job_id
    base.mkdir(parents=True, exist_ok=True)
    (base / "input.pdf").write_bytes(pdf_bytes)
    spec: dict[str, str] = {"kind": "analyze"}
    if owner_user_id:
        spec["owner_user_id"] = owner_user_id
    (base / "job.json").write_text(
        json.dumps(spec),
        encoding="utf-8",
    )


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    x_job_owner_id: str | None = Header(None, alias="X-Job-Owner-Id"),
):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Nur PDF-Dateien werden unterstützt.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "Leere Datei.")
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise HTTPException(413, "PDF ist zu groß.")

    owner_user_id = normalize_owner_id(x_job_owner_id)
    if not owner_user_id:
        raise HTTPException(401, "Nicht autorisiert")

    try:
        r = get_redis()
        await asyncio.to_thread(r.ping)
    except redis.ConnectionError as e:
        raise HTTPException(
            503,
            f"Redis nicht erreichbar ({e!s}). Analyse läuft in Workern — Redis muss laufen.",
        ) from e

    job_id = str(uuid.uuid4())
    await asyncio.to_thread(_write_analyze_job_files, job_id, pdf_bytes, owner_user_id)

    q = Queue(QUEUE_NAME, connection=r)
    q.enqueue(
        "lib.job_tasks.analyze_job_task",
        job_id,
        job_id=job_id,
        job_timeout=7200,
        meta={"owner_user_id": owner_user_id, "job_kind": "analyze"},
    )

    return JSONResponse(
        content={"job_id": job_id, "job_kind": "analyze"},
        headers={"X-Upload-Mode": "job-queue"},
    )

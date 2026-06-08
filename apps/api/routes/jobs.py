import json

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse
from rq.exceptions import NoSuchJobError
from rq.job import Job, JobStatus

from lib.internal_auth import assert_job_owner_access
from lib.redis_client import get_redis
from lib.settings import JOBS_DIR

router = APIRouter()


def _api_status(job: Job) -> str:
    s = job.get_status()
    if s in (JobStatus.QUEUED, JobStatus.CREATED, JobStatus.DEFERRED, JobStatus.SCHEDULED):
        return "queued"
    if s == JobStatus.STARTED:
        return "started"
    if s == JobStatus.FINISHED:
        return "finished"
    if s == JobStatus.FAILED:
        return "failed"
    return s.value


def _infer_job_kind(job_id: str) -> str | None:
    base = JOBS_DIR / job_id
    jf = base / "job.json"
    if jf.is_file():
        try:
            return json.loads(jf.read_text(encoding="utf-8")).get("kind")
        except (json.JSONDecodeError, OSError):
            return "analyze"
    mf = base / "meta.json"
    if mf.is_file():
        try:
            return json.loads(mf.read_text(encoding="utf-8")).get("kind", "anonymize")
        except (json.JSONDecodeError, OSError):
            return "anonymize"
    return None


@router.get("/jobs/{job_id}")
def get_job(
    job_id: str,
    x_job_owner_id: str | None = Header(None, alias="X-Job-Owner-Id"),
):
    assert_job_owner_access(job_id, x_job_owner_id)
    try:
        job = Job.fetch(job_id, connection=get_redis())
        job.refresh()
    except NoSuchJobError:
        raise HTTPException(404, "Job unbekannt")

    out_pdf = JOBS_DIR / job_id / "output.pdf"
    result_json = JOBS_DIR / job_id / "result.json"
    meta = job.meta or {}
    err: str | None = None
    if job.get_status() == JobStatus.FAILED and job.exc_info:
        err = job.exc_info[:4000]

    job_kind = meta.get("job_kind") or _infer_job_kind(job_id)

    payload: dict = {
        "id": job_id,
        "job_kind": job_kind,
        "status": _api_status(job),
        "step": meta.get("step"),
        "progress": meta.get("progress", 0),
        "error": err,
        "download_ready": out_pdf.is_file() and job.get_status() == JobStatus.FINISHED,
    }

    # Fertige Analyse (Presidio) — Ergebnis liegt in result.json
    if (
        job.get_status() == JobStatus.FINISHED
        and result_json.is_file()
        and (job_kind == "analyze" or job_kind is None)
    ):
        try:
            payload["upload_result"] = json.loads(result_json.read_text(encoding="utf-8"))
            payload["job_kind"] = "analyze"
        except (json.JSONDecodeError, OSError) as e:
            payload["upload_result_error"] = str(e)[:300]

    return payload


@router.get("/jobs/{job_id}/download")
def download_job(
    job_id: str,
    x_job_owner_id: str | None = Header(None, alias="X-Job-Owner-Id"),
):
    assert_job_owner_access(job_id, x_job_owner_id)
    try:
        job = Job.fetch(job_id, connection=get_redis())
        job.refresh()
    except NoSuchJobError:
        raise HTTPException(404, "Job unbekannt")

    if job.get_status() != JobStatus.FINISHED:
        raise HTTPException(400, "Job noch nicht fertig")

    path = JOBS_DIR / job_id / "output.pdf"
    if not path.is_file():
        raise HTTPException(404, "Ausgabe-Datei fehlt (nur bei Anonymisieren)")

    return FileResponse(
        path,
        filename="anonymisiert.pdf",
        media_type="application/pdf",
    )

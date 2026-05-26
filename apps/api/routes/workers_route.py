"""GET /workers – Queue + RQ-Worker-Übersicht (läuft alles noch?)."""
import redis
from fastapi import APIRouter, HTTPException
from rq import Queue, Worker
from rq.registry import FailedJobRegistry, FinishedJobRegistry, StartedJobRegistry

from lib.redis_client import get_redis
from lib.settings import JOB_MAX_AGE_HOURS, QUEUE_NAME

router = APIRouter()


@router.get("/workers")
def workers_overview():
    try:
        r = get_redis()
        r.ping()
    except redis.ConnectionError as e:
        raise HTTPException(
            503,
            f"Redis nicht erreichbar: {e!s}",
        ) from e

    q = Queue(QUEUE_NAME, connection=r)
    started = StartedJobRegistry(queue=q)
    failed = FailedJobRegistry(queue=q)
    finished = FinishedJobRegistry(queue=q)

    worker_infos = []
    for w in Worker.all(connection=r):
        jid = w.get_current_job_id()
        worker_infos.append(
            {
                "name": w.name,
                "state": w.get_state(),
                "current_job_id": jid,
                "queues": w.queue_names(),
            }
        )

    queued_ids = q.job_ids[:40]
    running_ids = started.get_job_ids(0, 40, cleanup=False)
    failed_ids = failed.get_job_ids(0, 20, cleanup=False)

    return {
        "redis_ok": True,
        "queue": QUEUE_NAME,
        "queued_jobs": len(q),
        "queued_job_ids": queued_ids,
        "running_jobs": len(started),
        "running_job_ids": running_ids,
        "failed_jobs": len(failed),
        "failed_job_ids": failed_ids,
        "finished_jobs_retained": len(finished),
        "workers": worker_infos,
        "worker_count": len(worker_infos),
        "job_max_age_hours": JOB_MAX_AGE_HOURS,
    }

"""Internes Gateway-Token (Next.js → FastAPI) und Job-Ownership."""

from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import HTTPException, Request

from lib.settings import JOBS_DIR

INTERNAL_TOKEN_HEADER = "x-pdf-internal-token"
JOB_OWNER_HEADER = "x-job-owner-id"


def internal_token_configured() -> bool:
    return bool(os.environ.get("PDF_INTERNAL_SERVICE_TOKEN", "").strip())


def verify_internal_request(request: Request) -> None:
    """Lehnt Anfragen ohne gültiges internes Token ab (wenn konfiguriert)."""
    expected = os.environ.get("PDF_INTERNAL_SERVICE_TOKEN", "").strip()
    if not expected:
        return
    got = (request.headers.get(INTERNAL_TOKEN_HEADER) or "").strip()
    if got != expected:
        raise HTTPException(403, "Nicht autorisiert")


def read_job_owner(job_id: str) -> str | None:
    base = JOBS_DIR / job_id
    for name in ("job.json", "meta.json"):
        path = base / name
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            owner = data.get("owner_user_id")
            if isinstance(owner, str) and owner.strip():
                return owner.strip()
        except (json.JSONDecodeError, OSError):
            continue
    return None


def normalize_owner_id(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 128:
        return None
    return cleaned


def assert_job_owner_access(job_id: str, request_owner: str | None) -> None:
    owner = read_job_owner(job_id)
    if not owner:
        raise HTTPException(403, "Kein Zugriff auf diesen Job")
    normalized = normalize_owner_id(request_owner)
    if not normalized or normalized != owner:
        raise HTTPException(403, "Kein Zugriff auf diesen Job")

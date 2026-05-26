"""Alte Job-Verzeichnisse unter JOBS_DIR entfernen."""
from __future__ import annotations

import logging
import shutil
import time
from pathlib import Path

from lib.settings import JOB_MAX_AGE_HOURS, JOBS_DIR

logger = logging.getLogger(__name__)


def cleanup_old_jobs() -> int:
    """
    Löscht Unterordner von JOBS_DIR, deren mtime älter als JOB_MAX_AGE_HOURS ist.
    Rückgabe: Anzahl gelöschter Verzeichnisse.
    """
    if JOB_MAX_AGE_HOURS <= 0:
        return 0

    if not JOBS_DIR.is_dir():
        return 0

    cutoff = time.time() - JOB_MAX_AGE_HOURS * 3600
    removed = 0
    for p in JOBS_DIR.iterdir():
        if not p.is_dir():
            continue
        try:
            if p.stat().st_mtime < cutoff:
                shutil.rmtree(p, ignore_errors=True)
                removed += 1
        except OSError as e:
            logger.warning("Job-Cleanup: %s — %s", p, e)
    if removed:
        logger.info("Job-Cleanup: %s alte Job-Ordner entfernt", removed)
    return removed

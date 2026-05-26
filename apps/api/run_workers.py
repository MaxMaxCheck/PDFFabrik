#!/usr/bin/env python3
"""
Startet mehrere RQ-Worker für dieselbe Warteschlange (Standard: WORKER_COUNT=3).
Von apps/api aus:  PYTHONPATH=. .venv/bin/python run_workers.py
Redis muss laufen (siehe REDIS_URL).
"""
from __future__ import annotations

import multiprocessing as mp
import os
import sys

API_ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(API_ROOT)
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)


def run_one(_idx: int) -> None:
    import os
    import sys

    # spawn-Worker: eigenes sys.path (sonst „No module named lib“)
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)
    if root not in sys.path:
        sys.path.insert(0, root)

    import redis
    from rq import Worker

    from lib.settings import QUEUE_NAME, REDIS_URL

    conn = redis.from_url(REDIS_URL, decode_responses=False)
    w = Worker([QUEUE_NAME], connection=conn, name=f"pdf-{os.getpid()}")
    w.work(with_scheduler=False)


def main() -> None:
    n = int(os.environ.get("WORKER_COUNT", "3"))
    ctx = mp.get_context("spawn")
    procs = [ctx.Process(target=run_one, args=(i,)) for i in range(n)]
    for p in procs:
        p.start()
    for p in procs:
        p.join()


if __name__ == "__main__":
    main()

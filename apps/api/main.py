import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.upload import router as upload_router
from routes.anonymize import router as anonymize_router
from routes.jobs import router as jobs_router
from routes.workers_route import router as workers_router
from routes.strip_metadata import router as strip_metadata_router
from routes.read_metadata import router as read_metadata_router
from routes.extract_text import router as extract_text_router
from routes.image_ocr import router as image_ocr_router
from routes.redact_json import router as redact_json_router
from routes.compress_pdf import router as compress_pdf_router
from routes.detect import router as detect_router

from lib.detect import warmup_models
from lib.job_cleanup import cleanup_old_jobs
from lib.settings import JOBS_DIR, JOB_CLEANUP_INTERVAL_SEC, cors_allow_origins

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        await asyncio.to_thread(warmup_models)
        logger.info("Startup: Presidio + GLiNER geladen")
    except Exception as e:
        logger.warning("Startup model warm-up: %s", e)
    try:
        n = await asyncio.to_thread(cleanup_old_jobs)
        if n:
            logger.info("Startup: %s alte Job-Ordner aufgeräumt", n)
    except Exception as e:
        logger.warning("Startup Job-Cleanup: %s", e)

    async def _cleanup_loop() -> None:
        while True:
            await asyncio.sleep(max(60, JOB_CLEANUP_INTERVAL_SEC))
            try:
                await asyncio.to_thread(cleanup_old_jobs)
            except Exception as e:
                logger.warning("Job-Cleanup: %s", e)

    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="PDFFabrik API", version="2.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

api_v1 = APIRouter(prefix="/v1")


@api_v1.get("/health")
def health():
    return {"status": "ok"}


api_v1.include_router(upload_router)
api_v1.include_router(anonymize_router)
api_v1.include_router(jobs_router)
api_v1.include_router(workers_router)
api_v1.include_router(strip_metadata_router)
api_v1.include_router(read_metadata_router)
api_v1.include_router(extract_text_router)
api_v1.include_router(image_ocr_router)
api_v1.include_router(redact_json_router)
api_v1.include_router(compress_pdf_router)
api_v1.include_router(detect_router)

app.include_router(api_v1)


@app.get("/")
def root():
    return {
        "name": "PDFFabrik API",
        "version": "2.1.0",
        "stack": "FastAPI + Presidio + PyMuPDF",
        "current_api_prefix": "/v1",
        "routes": [
            "POST /v1/upload",
            "POST /v1/anonymize",
            "POST /v1/tools/strip-metadata",
            "POST /v1/tools/read-metadata",
            "POST /v1/tools/extract-text",
            "POST /v1/tools/extract-image-text",
            "POST /v1/tools/compress-pdf",
            "POST /v1/pdf-redact-json",
            "POST /v1/detect",
            "GET /v1/jobs/{id}",
            "GET /v1/jobs/{id}/download",
            "GET /v1/workers",
            "GET /v1/health",
        ],
        "hints": {
            "ocr": "Tesseract installieren (z. B. brew install tesseract tesseract-lang)",
            "dashboard": "Web: /dashboard (Queue-Polling)",
        },
    }

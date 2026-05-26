import os
from pathlib import Path


def cors_allow_origins() -> list[str]:
    """
    Browser-Origin (Next.js) darf von FastAPI abweichen: localhost vs 127.0.0.1 vs [::1],
    anderer Port oder LAN-IP. Zusätzlich: PDF_API_CORS_ORIGINS (kommagetrennt).
    """
    out: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://[::1]:3001",
    ]
    extra = os.environ.get("PDF_API_CORS_ORIGINS", "")
    for part in extra.split(","):
        p = part.strip().rstrip("/")
        if p and p not in out:
            out.append(p)
    return out


REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
# Eine Queue für Analyse- und Anonymisierungs-Jobs → Worker können beides abarbeiten & skalieren
QUEUE_NAME = os.environ.get("RQ_QUEUE_NAME", "pdf_jobs")

# Absolute oder relativ zum api-Verzeichnis (cwd beim Start)
_jobs = os.environ.get("JOBS_DIR", "data/jobs")
JOBS_DIR = Path(_jobs).resolve()

# Presidio-Pattern-Erkennung: Fenster mit Überlappung
# Eher kleinere Fenster = mehr Chunks, dafür parallel in Threads (s. PII_PRESIDIO_MAX_WORKERS)
PII_CHUNK_CHARS = max(3000, int(os.environ.get("PII_CHUNK_CHARS", "8000")))
_po = int(os.environ.get("PII_CHUNK_OVERLAP", "360"))
PII_CHUNK_OVERLAP = min(_po, PII_CHUNK_CHARS // 2)

# Parallele Presidio-Chunk-Läufe (ThreadPool; bei seltenen Fehlern/Deadlocks → 1 setzen)
_cpu = int(os.cpu_count() or 2)
PII_PRESIDIO_MAX_WORKERS = max(
    1,
    min(8, int(os.environ.get("PII_PRESIDIO_MAX_WORKERS", str(min(4, _cpu))))),
)

# GLiNER NER-Modell (lokal, kein API-Key)
# Alternativen: "urchade/gliner_large-v2.1", "knowledgator/gliner-multitask-large-v0.5"
GLINER_MODEL = os.environ.get("GLINER_MODEL", "urchade/gliner_multi_pii-v1")
GLINER_THRESHOLD = float(os.environ.get("GLINER_THRESHOLD", "0.15"))
# ~512 Token ≈ 1.5–2.5k Zeichen; zu klein = unnötig viele Forward-Passes (seriell, teuer)
GLINER_CHUNK_CHARS = max(1000, int(os.environ.get("GLINER_CHUNK_CHARS", "2000")))
GLINER_OVERLAP = max(0, int(os.environ.get("GLINER_OVERLAP", "180")))
# ONNX Runtime ist auf CPU 2–3× schneller als PyTorch; fällt auf PyTorch zurück wenn nicht verfügbar
GLINER_USE_ONNX = os.environ.get("GLINER_USE_ONNX", "true").lower() not in ("0", "false", "no")

# Job-Verzeichnisse nach dieser Zeit löschen (Stunden)
JOB_MAX_AGE_HOURS = float(os.environ.get("JOB_MAX_AGE_HOURS", "48"))
JOB_CLEANUP_INTERVAL_SEC = int(os.environ.get("JOB_CLEANUP_INTERVAL_SEC", "600"))

# Tesseract über PyMuPDF (System: tesseract + Sprachpakete, z. B. tesseract-ocr-deu).
# Wird nur genutzt, wenn der PDF praktisch keinen Textlayer hat (s. extract_for_analysis).
# Echte Text-PDFs: kein Tesseract, nur Volltext-Extraktion.
OCR_ENABLED = os.environ.get("OCR_ENABLED", "true").lower() not in ("0", "false", "no")
OCR_DPI = int(os.environ.get("OCR_DPI", "200"))
OCR_LANGUAGE = os.environ.get("OCR_LANGUAGE", "deu+eng")
OCR_MAX_PAGES = int(os.environ.get("OCR_MAX_PAGES", "250"))

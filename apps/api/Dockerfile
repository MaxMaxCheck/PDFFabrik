# PDFFabrik API + gleiches Image für RQ-Worker
FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    tesseract-ocr \
    tesseract-ocr-deu \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt .

# CPU-only PyTorch zuerst installieren, damit gliner nicht die GPU-Variante zieht (~2 GB)
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt \
    && python -m spacy download de_core_news_md

# GLiNER-Modell beim Build-Schritt cachen (kein Download zur Laufzeit)
# ONNX-Version vorhalten falls verfügbar (2–3× schneller auf CPU)
ENV HF_HOME=/app/.hf_cache
RUN python -c "from gliner import GLiNER; GLiNER.from_pretrained('urchade/gliner_multi_pii-v1')"
RUN python -c "from gliner import GLiNER; GLiNER.from_pretrained('urchade/gliner_multi_pii-v1', load_onnx_model=True)" \
    || echo "GLiNER ONNX nicht verfügbar, PyTorch wird verwendet"

COPY apps/api .

ENV PYTHONPATH=/app
ENV JOBS_DIR=/data/jobs

RUN mkdir -p /data/jobs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3001/v1/health >/dev/null || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]

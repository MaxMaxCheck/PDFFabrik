"""RQ-Jobs: laufen nur in Worker-Prozessen (PyMuPDF + Presidio CPU-lastig)."""
from __future__ import annotations

import json
from pathlib import Path

from rq import get_current_job

from lib.anonymize_core import anonymize_pdf_to_bytes, anonymize_rebuilt_text_pdf_to_bytes
from lib.pdf_extract import extract_for_analysis
from lib.settings import JOBS_DIR

_MAX_TEXT_RESPONSE = 120_000


def _job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def analyze_job_task(job_id: str) -> str:
    """
    PDF-Analyse: PyMuPDF-Text + Presidio. Schreibt result.json.
    """
    job = get_current_job()
    base = _job_dir(job_id)
    spec_path = base / "job.json"
    pdf_path = base / "input.pdf"

    if not spec_path.is_file() or not pdf_path.is_file():
        raise FileNotFoundError("job.json oder input.pdf fehlt")

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    if spec.get("kind") != "analyze":
        raise ValueError("Job ist kein analyze-Job")

    pdf_bytes = pdf_path.read_bytes()

    def progress(step: str, pct: int) -> None:
        if job:
            job.meta = {
                "step": step,
                "progress": pct,
                "job_kind": "analyze",
            }
            job.save_meta()

    progress("PDF einlesen …", 8)
    text, _ranges, has_text, ocr_used, ocr_hint = extract_for_analysis(pdf_bytes)

    if not has_text:
        out = {
            "kind": "analyze",
            "text": "",
            "text_truncated": False,
            "hasSelectableText": False,
            "ocrUsed": ocr_used,
            "detections": [],
            "message": ocr_hint
            or "Kein auswertbarer Text (weder Textlayer noch OCR).",
        }
        (base / "result.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
        progress("Fertig", 100)
        return "analyze:done"

    from lib.detect import detect_pii

    progress(
        "Presidio / SpaCy … (Text aus OCR)" if ocr_used else "Presidio / SpaCy …",
        35,
    )
    detections = detect_pii(text, progress=progress)

    truncated = len(text) > _MAX_TEXT_RESPONSE
    out_text = text[:_MAX_TEXT_RESPONSE] if truncated else text

    out = {
        "kind": "analyze",
        "text": out_text,
        "text_truncated": truncated,
        "hasSelectableText": True,
        "ocrUsed": ocr_used,
        "detections": detections,
    }
    (base / "result.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    progress("Fertig", 100)
    return "analyze:done"


def anonymize_job_task(job_id: str) -> str:
    """
    Anonymisierung: input.pdf + meta.json → output.pdf
    """
    job = get_current_job()
    base = _job_dir(job_id)
    pdf_path = base / "input.pdf"
    meta_path = base / "meta.json"
    out_path = base / "output.pdf"

    if not pdf_path.is_file() or not meta_path.is_file():
        raise FileNotFoundError("Job-Dateien fehlen")

    pdf_bytes = pdf_path.read_bytes()
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    if meta.get("kind") != "anonymize":
        raise ValueError("Job ist kein anonymize-Job")

    dets = meta["detections"]
    choices = meta["choices"]
    ocr_used = bool(meta.get("ocr_used", False))
    output_mode = str(meta.get("output_mode", "layout") or "layout").strip().lower()
    active_categories_raw = meta.get("active_categories")
    active_categories = (
        {str(c) for c in active_categories_raw}
        if isinstance(active_categories_raw, list)
        else None
    )

    def on_progress(step: str, progress_pct: int) -> None:
        if job:
            job.meta = {
                "step": step,
                "progress": progress_pct,
                "job_kind": "anonymize",
            }
            job.save_meta()

    if output_mode in ("text_only", "text", "plain", "simple"):
        out_bytes = anonymize_rebuilt_text_pdf_to_bytes(
            pdf_bytes,
            dets,
            choices,
            on_progress=on_progress,
            ocr_used=ocr_used,
            active_categories=active_categories,
        )
    else:
        out_bytes = anonymize_pdf_to_bytes(
            pdf_bytes,
            dets,
            choices,
            on_progress=on_progress,
            ocr_used=ocr_used,
            active_categories=active_categories,
        )
    out_path.write_bytes(out_bytes)
    return str(out_path)

from __future__ import annotations

import csv
import os
import re
import subprocess
import tempfile
from pathlib import Path

from lib.settings import OCR_LANGUAGE

ALLOWED_IMAGE_TYPES: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/tiff": ".tif",
    "image/bmp": ".bmp",
}

MAX_IMAGE_OCR_BYTES = 20 * 1024 * 1024
OCR_MIN_WORD_CONFIDENCE = float(os.environ.get("OCR_MIN_WORD_CONFIDENCE", "45"))

_TSV_HEADER_RE = re.compile(
    r"^level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\b"
)
_EMBEDDED_TSV_WORD_RE = re.compile(
    r"(?P<prefix>\S*?)5\s+"
    r"\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+"
    r"\d+\s+\d+\s+\d+\s+\d+\s+"
    r"-?\d+(?:\.\d+)?\s+"
    r"(?P<word>\S+)"
)


def _parse_confidence(value: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return -1.0


def _is_short_alpha_noise_line(words: list[str]) -> bool:
    if not words:
        return True
    joined = "".join(words)
    if not joined.isalpha():
        return False
    return all(len(w) <= 2 for w in words)


def _text_from_tsv(tsv: str, *, min_confidence: float) -> str:
    lines: dict[tuple[int, int, int, int], list[tuple[int, str]]] = {}
    reader = csv.DictReader(tsv.splitlines(), delimiter="\t")
    for row in reader:
        if row.get("level") != "5":
            continue
        word = (row.get("text") or "").strip()
        if not word:
            continue
        conf = _parse_confidence(row.get("conf", ""))
        if conf < min_confidence:
            continue

        key = (
            int(row.get("block_num") or 0),
            int(row.get("par_num") or 0),
            int(row.get("line_num") or 0),
            int(row.get("word_num") or 0),
        )
        line_key = key[:3]
        lines.setdefault(line_key, []).append((key[3], word))

    out: list[str] = []
    for key in sorted(lines):
        words = [w for _idx, w in sorted(lines[key])]
        if _is_short_alpha_noise_line(words):
            continue
        out.append(" ".join(words))
    return "\n".join(out).strip()


def _clean_raw_ocr_text(text: str) -> str:
    cleaned_lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or _TSV_HEADER_RE.match(line):
            continue

        # Falls eine TSV-Zeile in Plaintext geraten ist:
        # "Machine5 1 1 1 7 2 233 252 102 24 92.2 Learning" -> "Machine Learning"
        line = _EMBEDDED_TSV_WORD_RE.sub(
            lambda m: f"{m.group('prefix')} {m.group('word')}".strip(),
            line,
        )

        parts = line.split("\t")
        if len(parts) >= 12:
            conf = _parse_confidence(parts[10])
            if parts[0] == "5" and conf >= OCR_MIN_WORD_CONFIDENCE:
                cleaned_lines.append(parts[11].strip())
            continue

        cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


def extract_text_from_image_bytes(
    image_bytes: bytes,
    *,
    content_type: str,
    filename: str = "image",
    language: str | None = None,
) -> dict[str, object]:
    if not image_bytes:
        raise ValueError("Leere Datei.")
    if len(image_bytes) > MAX_IMAGE_OCR_BYTES:
        raise ValueError("Bild ist zu groß. Maximal 20 MB werden unterstützt.")

    mime = (content_type or "").split(";", 1)[0].strip().lower()
    suffix = ALLOWED_IMAGE_TYPES.get(mime)
    if not suffix:
        raise ValueError("Nur PNG, JPG, WEBP, TIFF und BMP werden unterstützt.")

    lang = (language or OCR_LANGUAGE or "deu+eng").strip() or "deu+eng"

    with tempfile.TemporaryDirectory(prefix="pdf-anonym-image-ocr-") as tmp:
        input_path = Path(tmp) / f"input{suffix}"
        input_path.write_bytes(image_bytes)

        cmd = [
            "tesseract",
            str(input_path),
            "stdout",
            "-l",
            lang,
            "--psm",
            "6",
            "tsv",
        ]
        try:
            proc = subprocess.run(
                cmd,
                check=False,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except FileNotFoundError as e:
            raise RuntimeError(
                "Tesseract ist nicht installiert oder nicht im PATH."
            ) from e
        except subprocess.TimeoutExpired as e:
            raise RuntimeError("OCR lief in ein Timeout.") from e

    stderr = (proc.stderr or "").strip()
    if proc.returncode != 0:
        raise RuntimeError(stderr or "Tesseract konnte das Bild nicht lesen.")

    raw_text = proc.stdout or ""
    text = _text_from_tsv(raw_text, min_confidence=OCR_MIN_WORD_CONFIDENCE)
    if not text:
        text = _clean_raw_ocr_text(raw_text)
    return {
        "filename": filename or "image",
        "content_type": mime,
        "language": lang,
        "text": text,
        "has_text": bool(text),
        "warning": stderr or None,
    }

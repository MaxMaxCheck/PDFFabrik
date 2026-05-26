"""
PII-Erkennung — drei Schichten, alle lokal:

  1. Presidio  — pattern-basiert: E-Mail, IBAN, Telefon, Datum, Kennzeichen, VIN, PLZ, Straße
  2. GLiNER    — NER: Personennamen + Adressen (mehrsprachig, hohe Qualität, langsam auf CPU)
     Alternativ: spaCy de_core_news_md NER (schnell, ~100× schneller als GLiNER, etwas weniger präzise)
  3. Heuristik — Formularfelder (form_fields.py), Inline-Adressen, Vers./Schaden-Nr.

detect_pii()      → volle Pipeline mit GLiNER (Queue-Jobs, hohe Qualität)
detect_pii_fast() → Presidio + spaCy NER + Heuristiken, kein GLiNER (Echtzeit-Endpunkte)
"""
from __future__ import annotations

import re
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

from gliner import GLiNER
from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider

from lib.detection_rules import (
    PRESIDIO_SCORE_THRESHOLD,
    is_acceptable_detection,
    labeled_number_matches,
)
from lib.form_fields import extract_form_field_detections
from lib.settings import (
    GLINER_CHUNK_CHARS,
    GLINER_MODEL,
    GLINER_OVERLAP,
    GLINER_THRESHOLD,
    GLINER_USE_ONNX,
    PII_CHUNK_CHARS,
    PII_CHUNK_OVERLAP,
    PII_PRESIDIO_MAX_WORKERS,
)

# ─── Presidio: nur Pattern-Recognizer, kein SpaCy NER ────────────────────────
_PRESIDIO_ENTITY_MAP: dict[str, str] = {
    "EMAIL_ADDRESS":      "email",
    "PHONE_NUMBER":       "phone",
    "IBAN_CODE":          "iban",
    "DATE_TIME":          "date",
    "DE_LICENSE_PLATE":   "license_plate",
    "DE_POSTAL_CODE":     "address",
    "DE_STREET_ADDRESS":  "address",
    "VIN":                "vin",
}

# ─── GLiNER: NER-Labels → interne Kategorien ─────────────────────────────────
_GLINER_LABEL_MAP: dict[str, str] = {
    "person":         "name",
    "organization":   "name",   # Firmenname in Empfängeradresse (z. B. "Württembergische Versicherung")
    "location":       "address",
    "street address": "address",
}
_GLINER_LABELS = list(_GLINER_LABEL_MAP.keys())

_INLINE_ADDRESS_RE = re.compile(
    r"\b\d{1,4}[a-z]?\s*,\s*\d{5}\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+"
    r"(?:\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+)?\b"
)


def _pat(entity: str, name: str, pattern: str, score: float) -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity=entity,
        supported_language="de",
        patterns=[Pattern(name, pattern, score)],
    )


@lru_cache(maxsize=1)
def _build_analyzer() -> AnalyzerEngine:
    """
    Presidio nur mit Pattern-Recognizern.
    SpaCy dient ausschließlich als NLP-Engine für Tokenisierung/Kontext —
    NER übernimmt GLiNER.
    """
    nlp_config = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "de", "model_name": "de_core_news_md"}],
    }
    nlp_engine = NlpEngineProvider(nlp_configuration=nlp_config).create_engine()
    registry = RecognizerRegistry(recognizers=[], supported_languages=["de"])

    registry.add_recognizer(
        _pat("EMAIL_ADDRESS", "email",
             r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", 0.9)
    )
    registry.add_recognizer(
        _pat("IBAN_CODE", "iban",
             r"\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{0,2}\b",
             0.95)
    )
    registry.add_recognizer(
        _pat("PHONE_NUMBER", "de_phone",
             r"(?:\+49|0049|0)[\s/\-.]*(?:\(?\d{2,5}\)?[\s/\-.]*)?\d{3,}[\s/\-.]*\d{2,}(?:[\s/\-.]*\d{2,4})?",
             0.75)
    )
    registry.add_recognizer(
        _pat("PHONE_NUMBER", "de_phone_slash",
             r"\b0\d{2,4}\s*/\s*\d{2,}(?:[\s/\-.]\d{2,6})*\b", 0.72)
    )
    # Mobil: 015x / 016x / 017x — separates Muster da Vorwahl kürzer
    registry.add_recognizer(
        _pat("PHONE_NUMBER", "de_phone_mobile",
             r"(?:\+49\s?|0)1[5-7]\d[\s/\-]?\d{3,4}[\s/\-]?\d{3,4}", 0.76)
    )
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="DE_STREET_ADDRESS",
            supported_language="de",
            patterns=[
                # "Hamburger Straße 15" — Suffix als eigenes Wort
                Pattern(
                    "de_street_suffix_word",
                    r"\b[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+(?:\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+)*"
                    r"\s+(?:Straße|Str\.|Weg|Platz|Allee|Ring|Gasse|Damm|Ufer)"
                    r"\s+\d{1,4}[a-z]?\b",
                    0.84,
                ),
                # "Baringstraße 6", "Jägerstr. 26" — Kompositum (deutscher Normalfall)
                Pattern(
                    "de_street_compound",
                    r"\b[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+"
                    r"(?:straße|strasse|str\.|gasse|weg|platz|allee|ring|damm|ufer|berg|steig|graben|pfad)"
                    r"\s+\d{1,4}[a-z]?\b",
                    0.86,
                ),
            ],
        )
    )
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="DATE_TIME",
            supported_language="de",
            patterns=[
                # Strikte Validierung von Tag (01-31) und Monat (01-12) verhindert
                # Fehlmatches auf Versionsnummern ("1.2.24") und Paragraphen ("§ 3.2.1")
                Pattern("de_date_num",
                        r"\b(?:0[1-9]|[12]\d|3[01])\.(?:0[1-9]|1[0-2])\.\d{4}\b", 0.85),
                Pattern("iso_date",        r"\b\d{4}-\d{2}-\d{2}\b", 0.82),
                Pattern("de_date_written",
                        r"\b\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|"
                        r"August|September|Oktober|November|Dezember)\s+\d{4}\b", 0.9),
            ],
        )
    )
    registry.add_recognizer(
        _pat("DE_LICENSE_PLATE", "de_plate",
             r"\b[A-ZÄÖÜ]{1,3}[\s\-][A-Z]{1,2}[\s]?\d{1,4}[HE]?\b", 0.9)
    )
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="VIN",
            supported_language="de",
            patterns=[
                Pattern("vin_compact",
                        r"(?i)\b[A-HJ-NPR-Z0-9]{17}\b", 0.92),
                Pattern("vin_spaced_33353",
                        r"(?i)\b[A-HJ-NPR-Z0-9]{3}(?:[\s\-]+[A-HJ-NPR-Z0-9]{3}){2}"
                        r"[\s\-]+[A-HJ-NPR-Z0-9]{5}[\s\-]+[A-HJ-NPR-Z0-9]{3}\b", 0.9),
                Pattern("vin_spaced_368",
                        r"(?i)\b[A-HJ-NPR-Z0-9]{3}[\s\-]+[A-HJ-NPR-Z0-9]{6}"
                        r"[\s\-]+[A-HJ-NPR-Z0-9]{8}\b", 0.9),
            ],
        )
    )
    registry.add_recognizer(
        _pat("DE_POSTAL_CODE", "de_plz",
             r"\b\d{5}\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+(?:\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+)?\b",
             0.85)
    )

    return AnalyzerEngine(
        nlp_engine=nlp_engine,
        registry=registry,
        supported_languages=["de"],
    )


@lru_cache(maxsize=1)
def _build_gliner() -> GLiNER:
    """
    Lädt das GLiNER-Modell einmalig; gecacht für Worker-Lifetime.
    Versucht ONNX Runtime (2–3× schneller auf CPU); fällt auf PyTorch zurück wenn nicht verfügbar.
    """
    import os
    import torch
    # Alle verfügbaren Kerne nutzen (wichtig auf M1/ARM in Docker)
    n_threads = max(1, int(os.environ.get("OMP_NUM_THREADS", "0")) or (os.cpu_count() or 2))
    torch.set_num_threads(n_threads)

    if GLINER_USE_ONNX:
        try:
            return GLiNER.from_pretrained(GLINER_MODEL, load_onnx_model=True)
        except Exception:
            pass  # ONNX-Dateien nicht verfügbar → PyTorch-Fallback

    return GLiNER.from_pretrained(GLINER_MODEL)


@lru_cache(maxsize=1)
def _build_spacy_nlp():
    """
    Lädt de_core_news_md nur mit NER-Pipeline (ohne Parser/Tagger) — ~100× schneller als GLiNER.
    Bereits als Abhängigkeit vorhanden (Presidio nutzt dasselbe Modell).
    """
    import spacy
    return spacy.load("de_core_news_md", disable=["tagger", "morphologizer", "parser", "lemmatizer"])


_SPACY_LABEL_MAP: dict[str, str] = {
    "PER":  "name",
    "ORG":  "name",
    "LOC":  "address",
    "GPE":  "address",
}


def _detect_with_spacy_ner(text: str) -> list[dict]:
    nlp = _build_spacy_nlp()
    doc = nlp(text)
    detections: list[dict] = []
    for ent in doc.ents:
        category = _SPACY_LABEL_MAP.get(ent.label_)
        if not category:
            continue
        value = ent.text.strip()
        if not value:
            continue
        sc = 0.70
        if not is_acceptable_detection(category, value, sc):
            continue
        detections.append(_make_detection(category, value, ent.start_char, ent.end_char, sc))
    return detections


# ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

def _chunk_spans(total_len: int, chunk: int, overlap: int) -> list[tuple[int, int]]:
    if total_len <= chunk:
        return [(0, total_len)]
    spans: list[tuple[int, int]] = []
    pos = 0
    while pos < total_len:
        end = min(pos + chunk, total_len)
        spans.append((pos, end))
        if end >= total_len:
            break
        pos = max(0, end - overlap)
    return spans


def _deduplicate(detections: list[dict]) -> list[dict]:
    sorted_dets = sorted(
        detections,
        key=lambda d: (d["score"], d["end"] - d["start"]),
        reverse=True,
    )
    result: list[dict] = []
    for det in sorted_dets:
        if not any(det["start"] < r["end"] and det["end"] > r["start"] for r in result):
            result.append(det)
    return sorted(result, key=lambda d: d["start"])


def _make_detection(category: str, value: str, start: int, end: int, score: float) -> dict:
    return {
        "id":       str(uuid.uuid4()),
        "category": category,
        "value":    value,
        "start":    start,
        "end":      end,
        "score":    score,
    }


# ─── Schicht 1: Presidio Pattern-Recognizer ──────────────────────────────────

def _detect_with_presidio(
    analyzer: AnalyzerEngine, full_text: str, fragment: str, base_offset: int
) -> list[dict]:
    results = analyzer.analyze(
        text=fragment,
        language="de",
        entities=list(_PRESIDIO_ENTITY_MAP.keys()),
        score_threshold=PRESIDIO_SCORE_THRESHOLD,
    )
    detections: list[dict] = []
    for r in results:
        category = _PRESIDIO_ENTITY_MAP.get(r.entity_type)
        if not category:
            continue
        abs_start = base_offset + r.start
        abs_end   = base_offset + r.end
        value = full_text[abs_start:abs_end].strip()
        if not value:
            continue
        sc = round(r.score, 2)
        if not is_acceptable_detection(category, value, sc):
            continue
        detections.append(_make_detection(category, value, abs_start, abs_end, sc))
    return detections


# ─── Schicht 2: GLiNER NER ────────────────────────────────────────────────────

def _detect_with_gliner_batch(
    model: GLiNER, full_text: str, spans: list[tuple[int, int]]
) -> list[dict]:
    """Alle Chunks in einem batch_predict_entities-Aufruf — statt N serieller Forward-Passes."""
    if not spans:
        return []
    fragments = [full_text[s:e] for s, e in spans]
    all_entities = model.batch_predict_entities(fragments, _GLINER_LABELS, threshold=GLINER_THRESHOLD)
    detections: list[dict] = []
    for entities, (base_offset, _) in zip(all_entities, spans):
        for ent in entities:
            category = _GLINER_LABEL_MAP.get(ent["label"].lower())
            if not category:
                continue
            abs_start = base_offset + ent["start"]
            abs_end   = base_offset + ent["end"]
            value = full_text[abs_start:abs_end].strip()
            if not value:
                continue
            sc = round(float(ent["score"]), 2)
            if not is_acceptable_detection(category, value, sc):
                continue
            detections.append(_make_detection(category, value, abs_start, abs_end, sc))
    return detections


# ─── Schicht 3: Heuristiken ───────────────────────────────────────────────────

def _detect_inline_addresses(text: str) -> list[dict]:
    detections: list[dict] = []
    offset = 0
    for raw_line in text.splitlines(keepends=True):
        line = raw_line.strip()
        if 12 <= len(line) <= 180 and "," in line and _INLINE_ADDRESS_RE.search(line):
            start = offset + raw_line.find(line)
            detections.append(
                _make_detection("address", line, start, start + len(line), 0.93)
            )
        offset += len(raw_line)
    return detections


def _detect_labeled_numbers(text: str) -> list[dict]:
    return [
        _make_detection(category, value, start, end, 0.96)
        for category, value, start, end, _fs, _fe in labeled_number_matches(text)
    ]


# ─── Warm-up ─────────────────────────────────────────────────────────────────

def warmup_models() -> None:
    """Modelle vorladen damit der erste Request nicht kalt startet."""
    _build_analyzer()
    _build_spacy_nlp()
    _build_gliner()


# ─── Schneller Einstiegspunkt (kein GLiNER) ───────────────────────────────────

def detect_pii_fast(text: str) -> list[dict]:
    """
    Presidio + spaCy NER + Heuristiken — kein GLiNER.
    Für Echtzeit-Endpunkte (/pdf-redact-json): ~3–5 s statt ~50 s auf CPU.
    Erkennt Patterns (IBAN, E-Mail, Telefon, Datum …) und Named Entities (Namen, Orte)
    via spaCy de_core_news_md. Etwas weniger präzise als GLiNER bei Freitext-Namen.
    """
    analyzer = _build_analyzer()
    presidio_spans = _chunk_spans(len(text), PII_CHUNK_CHARS, PII_CHUNK_OVERLAP)

    def _run_presidio() -> list[dict]:
        result: list[dict] = []
        if len(presidio_spans) <= 1 or PII_PRESIDIO_MAX_WORKERS <= 1:
            for s, e in presidio_spans:
                result.extend(_detect_with_presidio(analyzer, text, text[s:e], s))
        else:
            workers = min(PII_PRESIDIO_MAX_WORKERS, len(presidio_spans))
            with ThreadPoolExecutor(max_workers=workers) as pool:
                futures = {
                    pool.submit(_detect_with_presidio, analyzer, text, text[s:e], s): (s, e)
                    for s, e in presidio_spans
                }
                for fut in as_completed(futures):
                    result.extend(fut.result())
        return result

    with ThreadPoolExecutor(max_workers=2) as pool:
        presidio_future = pool.submit(_run_presidio)
        spacy_future    = pool.submit(_detect_with_spacy_ner, text)
        merged = presidio_future.result() + spacy_future.result()

    merged.extend(_detect_inline_addresses(text))
    merged.extend(_detect_labeled_numbers(text))
    merged.extend(extract_form_field_detections(text))

    return _deduplicate(merged)


# ─── Haupt-Einstiegspunkt ─────────────────────────────────────────────────────

def detect_pii(
    text: str,
    progress: Callable[[str, int], None] | None = None,
) -> list[dict]:
    """
    Führt alle drei Erkennungsschichten aus und dedupliziert das Ergebnis.
    Progress-Callbacks: 35–94 % (wird von job_tasks ober/unterhalb belegt).

    Presidio (parallel, PII_PRESIDIO_MAX_WORKERS Threads) und GLiNER (ein Batch-Call
    statt N serieller Forward-Passes) laufen gleichzeitig in je einem Thread.
    """
    analyzer = _build_analyzer()
    gliner   = _build_gliner()

    presidio_spans = _chunk_spans(len(text), PII_CHUNK_CHARS, PII_CHUNK_OVERLAP)
    gliner_spans   = _chunk_spans(len(text), GLINER_CHUNK_CHARS, GLINER_OVERLAP)

    if progress:
        progress("Presidio / GLiNER …", 35)

    def _run_presidio() -> list[dict]:
        result: list[dict] = []
        if len(presidio_spans) <= 1 or PII_PRESIDIO_MAX_WORKERS <= 1:
            for s, e in presidio_spans:
                result.extend(_detect_with_presidio(analyzer, text, text[s:e], s))
        else:
            workers = min(PII_PRESIDIO_MAX_WORKERS, len(presidio_spans))
            with ThreadPoolExecutor(max_workers=workers) as pool:
                futures = {
                    pool.submit(_detect_with_presidio, analyzer, text, text[s:e], s): (s, e)
                    for s, e in presidio_spans
                }
                for fut in as_completed(futures):
                    result.extend(fut.result())
        return result

    with ThreadPoolExecutor(max_workers=2) as pool:
        presidio_future = pool.submit(_run_presidio)
        gliner_future   = pool.submit(_detect_with_gliner_batch, gliner, text, gliner_spans)
        presidio_dets   = presidio_future.result()
        gliner_dets     = gliner_future.result()

    if progress:
        progress("Heuristiken …", 90)

    merged = presidio_dets + gliner_dets
    merged.extend(_detect_inline_addresses(text))
    merged.extend(_detect_labeled_numbers(text))
    merged.extend(extract_form_field_detections(text))

    if progress:
        progress("Fertig", 94)

    return _deduplicate(merged)

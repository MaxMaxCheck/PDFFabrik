"""
Formularfeld-Erkennung: Label → Kategorie-Mapping.

Erweiterung: einen Eintrag in FIELD_CATEGORY hinzufügen.
Der Schlüssel ist der normalisierte Label (Kleinbuchstaben, Umlaute aufgelöst,
alle Nicht-Alphanumerika entfernt).

Erkennt zwei Layouts:
  • Gleiche Zeile: "Vers.-Nehmer:  Resit Gündogan"
  • Nächste Zeile: "Vers.-Nehmer:\n  Resit Gündogan"  (falls Bucket-Grenze dazwischen)
"""
from __future__ import annotations

import re
import uuid

_NORM_UMLAUT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})
_NORM_STRIP = re.compile(r"[^a-z0-9]")


def _norm(label: str) -> str:
    return _NORM_STRIP.sub("", label.lower().translate(_NORM_UMLAUT))


# ─── Erweiterbares Mapping ────────────────────────────────────────────────────
FIELD_CATEGORY: dict[str, str] = {
    # Namen
    "versnehmer":           "name",
    "versicherungsnehmer":  "name",
    "betreff":              "name",
    "halter":               "name",
    "fahrzeughalter":       "name",
    "zulassungsinhaber":    "name",
    "eigentuemer":          "name",
    "fahrer":               "name",
    "geschaedigter":        "name",
    "geschaedigte":         "name",
    "kaeufer":              "name",
    "verkaeufer":           "name",
    "besichtigtvon":        "name",
    "besichtigungvon":      "name",
    "aufgenommenvon":       "name",
    "erstelltvon":          "name",
    "bearbeiter":           "name",
    "sachbearbeiter":       "name",
    "gutachter":            "name",
    # Adressen
    "besort":               "address",
    "besichtigungsort":     "address",
    "wohnort":              "address",
    "anschrift":            "address",
    "adresse":              "address",
    "wohnanschrift":        "address",
}

_VALUE_BLOCKLIST: frozenset[str] = frozenset({
    "sachverstaendiger", "sachverstaendige", "versicherung",
    "versicherungsnehmer", "unbekannt", "keine", "keine angabe",
    "kaskoschaden", "haftpflichtschaden",
})

_LABEL_CHARS = r"[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9.\-/()\s]{1,50}?"

# "Label: Wert" auf derselben Zeile
_SAME_LINE_RE = re.compile(
    rf"^(?P<label>{_LABEL_CHARS})\s*:\s*(?P<value>\S.{{1,300}})$",
    re.MULTILINE,
)
# "Label:" allein (Wert auf nächster Zeile)
_LABEL_ONLY_RE = re.compile(
    rf"^(?P<label>{_LABEL_CHARS})\s*:[ \t]*$",
    re.MULTILINE,
)


def _make(category: str, value: str, start: int, end: int, score: float) -> dict:
    return {
        "id":       str(uuid.uuid4()),
        "category": category,
        "value":    value,
        "start":    start,
        "end":      end,
        "score":    score,
    }


def extract_form_field_detections(text: str) -> list[dict]:
    """
    Durchsucht den (layout-aware extrahierten) Text nach Label:Wert-Paaren
    und erzeugt PII-Detektionen für bekannte Felder.
    Erkennt Wert sowohl auf gleicher Zeile als auch auf der nächsten.
    """
    results: list[dict] = []
    seen_spans: list[tuple[int, int]] = []

    def _add(det: dict) -> None:
        s, e = det["start"], det["end"]
        for ps, pe in seen_spans:
            if s < pe and e > ps:
                return
        seen_spans.append((s, e))
        results.append(det)

    # ── Pass 1: Label und Wert auf derselben Zeile ──────────────────────────
    for m in _SAME_LINE_RE.finditer(text):
        label_raw = m.group("label").strip()
        category = FIELD_CATEGORY.get(_norm(label_raw))
        if not category:
            continue
        value = m.group("value").strip()
        if len(value) < 2 or _norm(value) in _VALUE_BLOCKLIST:
            continue
        _add(_make(category, value, m.start("value"), m.end("value"), 0.95))

    # ── Pass 2: Label allein, Wert auf nächster Zeile ───────────────────────
    # Nötig wenn Bucket-Grenze Label und Wert trennt (z. B. y=300 vs y=313)
    lines = text.splitlines(keepends=True)
    line_offsets: list[int] = []
    off = 0
    for line in lines:
        line_offsets.append(off)
        off += len(line)

    for i, line in enumerate(lines):
        stripped = line.rstrip("\n\r")
        m = _LABEL_ONLY_RE.match(stripped)
        if not m:
            continue
        label_raw = m.group("label").strip()
        category = FIELD_CATEGORY.get(_norm(label_raw))
        if not category:
            continue
        if i + 1 >= len(lines):
            continue
        next_line = lines[i + 1].rstrip("\n\r").strip()
        if len(next_line) < 2 or _norm(next_line) in _VALUE_BLOCKLIST:
            continue
        nl_start = lines[i + 1].find(next_line)
        if nl_start < 0:
            continue
        abs_start = line_offsets[i + 1] + nl_start
        abs_end   = abs_start + len(next_line)
        _add(_make(category, next_line, abs_start, abs_end, 0.92))

    return results

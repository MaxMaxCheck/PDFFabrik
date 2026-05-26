"""Gemeinsame Regeln: zu kurze / zu dubiose Fundstellen verwerfen — sonst schwärzt
`page.search_for()` z. B. einzelne Buchstaben überall im PDF."""

from __future__ import annotations

import os
import re
import unicodedata

# Presidio analyzer (höher = weniger Rauschen, ggf. echte Treffer weniger)
PRESIDIO_SCORE_THRESHOLD = float(os.environ.get("PRESIDIO_SCORE_THRESHOLD", "0.46"))

# Mindest-Länge des *Werts* pro Kategorie (nach strip)
_MIN_LEN: dict[str, int] = {
    "name": 3,
    "address": 4,
    "email": 7,
    "phone": 9,
    "iban": 18,
    "date": 6,
    "license_plate": 6,
    "vin": 17,
    "insurance_number": 5,
    "claim_number": 5,
}

# Häufige deutsche Funktionswörter, die SpaCy gelegentlich als PERSON/LOC taggt
_JUNK_NAME_ADDRESS: frozenset[str] = frozenset(
    {
        "der",
        "die",
        "das",
        "und",
        "bei",
        "von",
        "mit",
        "für",
        "ist",
        "im",
        "in",
        "an",
        "am",
        "zu",
        "auf",
        "als",
        "nicht",
        "auch",
        "sich",
        "wird",
        "werden",
        "nach",
        "aus",
        "über",
        "oder",
        "nur",
        "noch",
    }
)

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
_PHONE_CHARS_RE = re.compile(r"^[\d\s\-+()./]{8,}$")
_DATEISH_RE = re.compile(r"\d")
_PAGE_COUNTER_RE = re.compile(r"^seite\s+\d+\s+von\s*\d+$", re.IGNORECASE)
_INSURANCE_NUMBER_CONTEXT_RE = re.compile(
    r"\b(?:Vers(?:icherungs)?\.?\s*-?\s*Nr\.?|Versicherungsnummer)\s*:?\s*(?P<value>[A-Z0-9][A-Z0-9/-]{4,}[A-Z0-9])",
    re.IGNORECASE,
)
_CLAIM_NUMBER_CONTEXT_RE = re.compile(
    r"\b(?:(?:Schaden|Schadens?|Schad)\s*-?\s*Nr\.?|Schadensnummer|Schadennummer)\s*:?\s*(?P<value>[A-Z0-9][A-Z0-9/-]{4,}[A-Z0-9])",
    re.IGNORECASE,
)
_EQUIPMENT_CODE_LINE_RE = re.compile(r"^\d{5}\s+\S+")
_TECHNICAL_EQUIPMENT_WORD_RE = re.compile(
    r"\b("
    r"antrieb|schlupf|regelung|bremse|bremsscheib|frontantrieb|fahrassistenz|"
    r"klimaanlage|airbag|sitze|sitz|lenkrad|reif|felg|scheinwerfer|"
    r"parkbremse|ablagefach|polsterung|steckdose|licht|spiegel|"
    r"fenster|fahrwerk|motor|getriebe|multifunktion|gurt"
    r")",
    re.IGNORECASE,
)
_REPORT_SECTION_WORD_RE = re.compile(
    r"\b("
    r"kaskogesichtspunkt(?:e|en)?|schadenhergang|auftrag|"
    r"schadenbild|kalkulationserläuterungen|kalkulationsgrundlagen|"
    r"anwesenheit|besichtigung|gutachten|fahrzeugbesichtigung|"
    r"kalkulation|kosten|reparaturweg|reparatur|reparaturkosten|wiederherstellung|"
    r"berücksichtigung|beschädigungen|instandsetzung|"
    r"verkehrs|betriebssicherheit|sachverständige|sachverständigen|"
    r"anspruchstellerfahrzeug(?:es)?|versicherungsnehmerfahrzeug(?:es)?|"
    r"zusammenfassung|fahrzeuginformation|fahrzeugdaten|fahrzeugbeschreibung"
    r")\b",
    re.IGNORECASE,
)

# KFZ-Hersteller: werden von GLiNER korrekt als Organisation erkannt,
# sind aber in Schadensgutachten keine zu schwärzenden PII.
_CAR_MAKE_RE = re.compile(
    r"^(?:VW|Volkswagen|BMW|Mercedes(?:-Benz)?|Audi|Opel|Ford|Renault|Peugeot|"
    r"Toyota|Skoda|Škoda|SEAT|Seat|Kia|Hyundai|Fiat|Honda|Mazda|Nissan|"
    r"Volvo|Porsche|Daimler|Smart|Tesla|Alfa(?:\s*Romeo)?|Citro[eë]n|"
    r"Dacia|Mitsubishi|Subaru|Suzuki|Jaguar|MINI|Mini|Stellantis|"
    r"Lamborghini|Ferrari|Maserati|Bentley|Lexus|Infiniti|Chrysler|"
    r"Jeep|Dodge|Chevrolet|Cadillac|Lancia|DS\s+Automobiles)"
    r"(?:[-\s].+)?$",
    re.IGNORECASE,
)
# Motorkennzeichnungen wie "2.0 TDI", "1.6 TSI" → sicher kein Personenname
_CAR_ENGINE_RE = re.compile(
    r"\b(?:TDI|TSI|TFSI|GDI|MPI|CDI|HDi|dCi|GTI|GTE|TGI|TGDi|SDI|"
    r"EcoBoost|BlueHDI|MHEV|PHEV|Diesel|Benzin|Hybrid)\b",
    re.IGNORECASE,
)


def _looks_like_vehicle_equipment_code(value: str) -> bool:
    """
    Fahrzeuglisten nutzen oft 5-stellige Optionscodes wie
    "70303 Antriebs-Schlupfregelung (ASR)". Das sieht unserem PLZ-Recognizer
    ähnlich, ist aber keine Adresse.
    """
    v = value.strip()
    if not _EQUIPMENT_CODE_LINE_RE.match(v):
        return False
    rest = v[6:].strip()
    if "-" in rest or "(" in rest or "/" in rest:
        return True
    return bool(_TECHNICAL_EQUIPMENT_WORD_RE.search(rest))


def _looks_like_report_boilerplate(value: str) -> bool:
    v = re.sub(r"\s+", " ", value.strip())
    return bool(_PAGE_COUNTER_RE.match(v) or _REPORT_SECTION_WORD_RE.search(v))


def min_len_for_category(category: str) -> int:
    return _MIN_LEN.get(category, 4)


def labeled_number_matches(text: str) -> list[tuple[str, str, int, int, int, int]]:
    """
    Gibt Kontexttreffer als (category, value, value_start, value_end, full_start, full_end)
    zurück. full_* umfasst Label + Wert und wird als Schutzbereich genutzt, wenn
    diese Kategorie nicht aktiv ist.
    """
    out: list[tuple[str, str, int, int, int, int]] = []
    for category, regex in (
        ("insurance_number", _INSURANCE_NUMBER_CONTEXT_RE),
        ("claim_number", _CLAIM_NUMBER_CONTEXT_RE),
    ):
        for match in regex.finditer(text):
            value = match.group("value")
            if not value:
                continue
            out.append(
                (
                    category,
                    value,
                    match.start("value"),
                    match.end("value"),
                    match.start(),
                    match.end(),
                )
            )
    return out


def is_acceptable_detection(category: str, value: str, score: float) -> bool:
    """Filter für API-Liste nach Presidio (reduziert False Positives)."""
    v = (value or "").strip()
    if not v:
        return False

    need = min_len_for_category(category)
    if len(v) < need:
        return False

    if _looks_like_vehicle_equipment_code(v):
        return False

    if category in ("name", "address"):
        if _looks_like_report_boilerplate(v):
            return False
        low = v.lower()
        if len(v) <= 10 and low in _JUNK_NAME_ADDRESS:
            return False
        if category == "name" and len(v) in (3, 4) and score < 0.8:
            return False
        if category == "address" and len(v) <= 5 and score < 0.72:
            return False
        if category == "name" and (_CAR_MAKE_RE.match(v) or _CAR_ENGINE_RE.search(v)):
            return False

    if category == "email" and not _EMAIL_RE.match(v):
        return False

    if category == "phone":
        if not _PHONE_CHARS_RE.match(v):
            return False
        digits = sum(c.isdigit() for c in v)
        if digits < 6:
            return False

    if category == "iban":
        compact = re.sub(r"\s+", "", v)
        if len(compact) < 15 or not re.match(r"^[A-Z]{2}\d{2}", compact):
            return False
        if compact.startswith("DE") and len(compact) == 22:
            # ISO 7064 Mod 97-10 Prüfsumme für DE-IBANs
            rearranged = compact[4:] + compact[:4]
            numeric = "".join(
                str(ord(ch) - ord("A") + 10) if ch.isalpha() else ch
                for ch in rearranged
            )
            if int(numeric) % 97 != 1:
                return False

    if category == "date":
        if not _DATEISH_RE.search(v):
            return False

    if category == "license_plate":
        if not re.search(r"[A-ZÄÖÜ0-9]{2,}", v.upper()):
            return False

    if category == "vin":
        compact = re.sub(r"[\s\-]+", "", v.upper())
        if len(compact) != 17 or not re.match(r"^[A-HJ-NPR-Z0-9]{17}$", compact):
            return False
        if sum(c.isdigit() for c in compact) < 3:
            return False

    if category in ("insurance_number", "claim_number"):
        if not re.match(r"^[A-Z0-9][A-Z0-9/-]{4,}[A-Z0-9]$", v.upper()):
            return False
        if sum(c.isdigit() for c in v) < 3:
            return False

    return True


# PyMuPDF: search_for(substr) trifft ALLE Vorkommen — bei kurzen Strings Katastrophe
MIN_PDF_SUBSTRING_LEN = int(os.environ.get("MIN_PDF_SUBSTRING_LEN", "3"))
# Wenn ein kurzer String >so oft vorkommt, ist er praktisch nie ein echtes PII
MAX_RECT_MATCHES_SHORT_VALUE = int(os.environ.get("MAX_RECT_MATCHES_SHORT_VALUE", "12"))

# PyMuPDF: Redaction-Rechteck vergrößern (Pixelränder, Kerning-Lücken, Unterstreichungen)
REDACT_RECT_INFLATE_PT = float(os.environ.get("REDACT_RECT_INFLATE_PT", "2.5"))


def redaction_search_needles(value: str, category: str) -> list[str]:
    """
    Mehrere Suchstrings für page.search_for — PDF kann Whitespace anders codieren
    als der aus get_text() gebaute Analysestring.
    """
    raw = (value or "").strip()
    out: list[str] = []
    seen: set[str] = set()

    def add(s: str) -> None:
        t = s.strip()
        if len(t) >= 2 and t not in seen:
            seen.add(t)
            out.append(t)

    add(raw)
    if not raw:
        return out

    # Unicode-Normalisierung: PDFs kodieren Umlaute manchmal als Basiszeichen +
    # kombinierendes Diakritikum (NFD), Python-Strings sind meist NFC-prekomponiert.
    add(unicodedata.normalize("NFC", raw))
    add(unicodedata.normalize("NFD", raw))

    collapsed = re.sub(r"[ \t\r\f\v]+", " ", raw)
    add(collapsed)

    if category == "iban":
        compact = re.sub(r"\s+", "", raw).upper()
        add(compact)

    if category in ("phone", "vin", "license_plate", "date"):
        nospace = re.sub(r"\s+", "", raw)
        add(nospace)

    if category == "phone":
        # „05131 / 4487“ vs „05131/4487“
        relaxed = re.sub(r"\s*([/])\s*", r"\1", collapsed)
        add(relaxed)

    return out


def is_safe_pdf_search_value(category: str, value: str) -> bool:
    """Vor page.search_for: zu kurz / zu riskant → nichts schwärzen."""
    v = (value or "").strip()
    if len(v) < MIN_PDF_SUBSTRING_LEN:
        return False
    # Zusätzlich Kategorie-Minimum (kann über MIN_PDF_SUBSTRING_LEN liegen)
    if len(v) < min_len_for_category(category):
        return False
    return True


def should_cap_rects(value: str, rect_count: int) -> bool:
    """True = zu viele Treffer für kurzen String → vermutlich Substring-Nepp, skippen."""
    v = (value or "").strip()
    if rect_count <= MAX_RECT_MATCHES_SHORT_VALUE:
        return False
    if len(v) >= 12:
        return False
    # langer Suchstring → viele Treffer eher OK (gleicher Text mehrfach); kurzer nicht
    return True

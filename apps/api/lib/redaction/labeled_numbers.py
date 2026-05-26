from __future__ import annotations

import re

import fitz

from lib.detection_rules import labeled_number_matches

from lib.redaction.geometry import _padded_rect, _vertical_overlap
from lib.redaction.search import _overlaps


def _compact_labeled_number(value: str) -> str:
    return re.sub(r"[^A-Z0-9/-]+", "", value.upper())


def _compact_label(value: str) -> str:
    return re.sub(r"[^a-zäöüß]+", "", value.lower())


def _label_re_for_labeled_number(category: str) -> re.Pattern[str] | None:
    if category == "insurance_number":
        return re.compile(
            r"^(?:Vers(?:icherungs)?\.?\s*-?\s*Nr\.?|Versicherungsnummer):?$",
            re.IGNORECASE,
        )
    if category == "claim_number":
        return re.compile(
            r"^(?:(?:Schaden|Schadens?|Schad)\s*-?\s*Nr\.?|Schadensnummer|Schadennummer):?$",
            re.IGNORECASE,
        )
    return None


def _is_labeled_number_label(category: str, value: str) -> bool:
    label = _compact_label(value)
    if category == "insurance_number":
        return label in {"versnr", "versicherungsnr", "versicherungsnummer"}
    if category == "claim_number":
        return label in {"schadennr", "schadensnr", "schadnummer", "schadensnummer"}
    return False


def _looks_like_labeled_number_token(text: str) -> bool:
    token = _compact_labeled_number(text)
    return len(token) >= 2 and any(ch.isdigit() for ch in token)


def _labeled_number_rects_on_page(
    page: fitz.Page,
    category: str,
    value: str,
) -> list[fitz.Rect]:
    label_re = _label_re_for_labeled_number(category)
    if label_re is None:
        return []

    target = _compact_labeled_number(value)
    if not target:
        return []

    try:
        words = page.get_text("words")
    except Exception:
        return []

    lines: dict[tuple[int, int], list[tuple[float, float, float, float, str]]] = {}
    for item in words:
        if len(item) < 7:
            continue
        x0, y0, x1, y1, text, block_no, line_no = item[:7]
        lines.setdefault((int(block_no), int(line_no)), []).append(
            (float(x0), float(y0), float(x1), float(y1), str(text))
        )

    rects: list[fitz.Rect] = []
    for line_words in lines.values():
        ordered = sorted(line_words, key=lambda w: w[0])
        for label_idx, word in enumerate(ordered):
            if not label_re.match(word[4].strip()):
                continue

            collected = ""
            picked: list[fitz.Rect] = []
            for candidate in ordered[label_idx + 1 :]:
                token = _compact_labeled_number(candidate[4])
                if not token:
                    continue
                next_value = collected + token
                if not target.startswith(next_value):
                    break
                collected = next_value
                picked.append(fitz.Rect(candidate[:4]))
                if collected == target:
                    rects.extend(picked)
                    return rects
    return rects


def _labeled_number_rects_by_layout(
    page: fitz.Page,
    category: str,
    *,
    include_label: bool = False,
) -> list[fitz.Rect]:
    label_re = _label_re_for_labeled_number(category)
    if label_re is None:
        return []

    try:
        raw_words = page.get_text("words")
    except Exception:
        return []

    words: list[tuple[float, float, float, float, str]] = []
    for item in raw_words:
        if len(item) < 7:
            continue
        x0, y0, x1, y1, text, block_no, line_no = item[:7]
        words.append((float(x0), float(y0), float(x1), float(y1), str(text)))
    words.sort(key=lambda w: (round(w[1], 1), w[0]))

    rects: list[fitz.Rect] = []
    for label_idx, _word in enumerate(words):
        label_end_idx = -1
        for end_idx in range(label_idx, min(label_idx + 4, len(words))):
            joined = "".join(w[4] for w in words[label_idx : end_idx + 1])
            if label_re.match(joined.strip()) or _is_labeled_number_label(category, joined):
                label_end_idx = end_idx
                break
        if label_end_idx < 0:
            continue

        label_rect = fitz.Rect(words[label_idx][:4])
        for label_word in words[label_idx + 1 : label_end_idx + 1]:
            label_rect |= fitz.Rect(label_word[:4])
        if include_label:
            rects.append(label_rect)

        for candidate in words:
            candidate_rect = fitz.Rect(candidate[:4])
            if candidate_rect.x0 < label_rect.x1 - 1:
                continue
            y_overlap = _vertical_overlap(label_rect, candidate_rect)
            if y_overlap / max(1.0, min(label_rect.height, candidate_rect.height)) < 0.45:
                continue
            if not _looks_like_labeled_number_token(candidate[4]):
                continue
            rects.append(candidate_rect)
    return rects


def _protected_labeled_number_rects(
    page: fitz.Page,
    active_categories: set[str] | None,
) -> list[fitz.Rect]:
    if active_categories is None:
        return []
    rects: list[fitz.Rect] = []
    for category in ("insurance_number", "claim_number"):
        # Labels wie "Schaden-Nr.:" und "Vers.-Nr.:" bleiben immer sichtbar.
        rects.extend(
            _padded_rect(r, page)
            for r in _labeled_number_rects_by_layout(page, category, include_label=True)
        )
        if category == "insurance_number":
            label_needles = ("Vers.-Nr.", "Vers.-Nr", "Versicherungsnummer")
        else:
            label_needles = ("Schaden-Nr.", "Schaden-Nr", "Schadens-Nr.", "Schadensnummer")
        for needle in label_needles:
            try:
                rects.extend(_padded_rect(r, page) for r in page.search_for(needle, quads=False))
            except Exception:
                pass

        if category in active_categories:
            continue
        rects.extend(
            _padded_rect(r, page)
            for r in _labeled_number_rects_by_layout(page, category, include_label=False)
        )
    return rects


def _add_forced_labeled_number_redactions(
    page: fitz.Page,
    active_categories: set[str] | None,
) -> None:
    if not active_categories:
        return
    for category in ("insurance_number", "claim_number"):
        if category not in active_categories:
            continue
        for rect in _labeled_number_rects_by_layout(page, category):
            pr = _padded_rect(rect, page)
            if not pr.is_empty:
                page.add_redact_annot(pr, fill=(0, 0, 0))


def _filter_protected_labeled_numbers(
    active: list[dict],
    full_text: str,
    active_categories: set[str] | None,
) -> list[dict]:
    if active_categories is None:
        return active

    protected = [
        (full_start, full_end)
        for category, _value, _value_start, _value_end, full_start, full_end in labeled_number_matches(full_text)
        if category not in active_categories
    ]
    if not protected:
        return active

    filtered: list[dict] = []
    for det in active:
        try:
            start = int(det["start"])
            end = int(det["end"])
        except (KeyError, TypeError, ValueError):
            filtered.append(det)
            continue
        if any(_overlaps(start, end, ps, pe) for ps, pe in protected):
            continue
        filtered.append(det)
    return filtered

from __future__ import annotations

import re

import fitz

from lib.detection_rules import REDACT_RECT_INFLATE_PT


def _padded_rect(rect: fitz.Rect, page: fitz.Page) -> fitz.Rect:
    pad = REDACT_RECT_INFLATE_PT
    r = fitz.Rect(rect)
    r = fitz.Rect(r.x0 - pad, r.y0 - pad, r.x1 + pad, r.y1 + pad)
    return r & page.rect


def _vertical_overlap(a: fitz.Rect, b: fitz.Rect) -> float:
    return max(0.0, min(a.y1, b.y1) - max(a.y0, b.y0))


def _should_expand_to_text_line(category: str, value: str) -> bool:
    if category != "address":
        return False
    v = (value or "").strip()
    if len(v) < 8:
        return False
    return bool(re.search(r"\d|,", v))


def _text_line_rect_for_match(page: fitz.Page, rect: fitz.Rect) -> fitz.Rect | None:
    try:
        data = page.get_text("dict")
    except Exception:
        return None

    best: tuple[float, fitz.Rect] | None = None
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            bbox = line.get("bbox")
            if not bbox:
                continue
            lr = fitz.Rect(bbox)
            if lr.is_empty:
                continue
            y_overlap = _vertical_overlap(rect, lr)
            if y_overlap <= 0:
                continue
            min_height = max(1.0, min(rect.height, lr.height))
            if y_overlap / min_height < 0.45:
                continue
            if rect.x1 < lr.x0 - 2 or rect.x0 > lr.x1 + 2:
                continue
            score = y_overlap * max(1.0, min(rect.x1, lr.x1) - max(rect.x0, lr.x0))
            if best is None or score > best[0]:
                best = (score, lr)
    return best[1] if best else None


def _redaction_rect(rect: fitz.Rect, page: fitz.Page, category: str, value: str) -> fitz.Rect:
    target = fitz.Rect(rect)
    if _should_expand_to_text_line(category, value):
        line_rect = _text_line_rect_for_match(page, rect)
        if line_rect is not None:
            # Union: Zeilen-BBox verbreitern, aber keine Anteile verlieren, die
            # schon über search_for + Erweiterung drin sind (z. B. Ortsname
            # „…ve“ + „r“ in zweiter PDF-Zeile — line_rect wäre nur Zeile 1).
            target = fitz.Rect(line_rect) | fitz.Rect(rect)
    return _padded_rect(target, page)


def _line_words_by_visual_row(
    page: fitz.Page,
) -> list[list[tuple[float, float, float, float, str]]]:
    try:
        raw_words = page.get_text("words")
    except Exception:
        return []

    words: list[tuple[float, float, float, float, str]] = []
    for item in raw_words:
        if len(item) < 5:
            continue
        x0, y0, x1, y1, text = item[:5]
        words.append((float(x0), float(y0), float(x1), float(y1), str(text)))
    words.sort(key=lambda w: (w[1], w[0]))

    rows: list[list[tuple[float, float, float, float, str]]] = []
    for word in words:
        wr = fitz.Rect(word[:4])
        for row in rows:
            rr = fitz.Rect(row[0][:4])
            if _vertical_overlap(wr, rr) / max(1.0, min(wr.height, rr.height)) >= 0.55:
                row.append(word)
                break
        else:
            rows.append([word])

    for row in rows:
        row.sort(key=lambda w: w[0])
    return rows


def _rects_overlap(a: fitz.Rect, b: fitz.Rect) -> bool:
    return a.x0 < b.x1 and a.x1 > b.x0 and a.y0 < b.y1 and a.y1 > b.y0


# Kerning / getrennte Glyphen: nächstes Wort noch zur selben Zeile zählen
_EXPAND_SAME_LINE_MAX_GAP_PT = 8.0


def _expand_address_wrap_tail(expanded: fitz.Rect, page_words: list) -> fitz.Rect:
    """
    Adresszeilen: letzte Buchstaben stehen in einer zweiten PDF-Zeile unter dem
    rechten Rand (kein vertikaler Overlap mit dem Lauf davor) — z. B. Hannove + r.
    Sehr kurze Wörter in einem schmalen Band direkt unter expanded.y1 übernehmen.
    """
    line_h = max(expanded.height, 8.0)
    tail_x0 = expanded.x1 - max(40.0, expanded.width * 0.2)
    band_y0 = expanded.y1 - 2.0
    band_y1 = expanded.y1 + line_h * 1.5
    out = fitz.Rect(expanded)
    for w in page_words:
        if len(w) < 5:
            continue
        wx0, wy0, wx1, wy1 = float(w[0]), float(w[1]), float(w[2]), float(w[3])
        wt = str(w[4]).strip()
        if not 1 <= len(wt) <= 4:
            continue
        if wy0 < band_y0 or wy0 > band_y1:
            continue
        if wx1 < tail_x0 - 1:
            continue
        if wx0 > expanded.x1 + 30:
            continue
        out |= fitz.Rect(wx0, wy0, wx1, wy1)
    return out


def _expand_areas_to_word_ends(
    areas: list[fitz.Rect],
    page_words: list,
    *,
    category: str = "",
) -> list[fitz.Rect]:
    """
    PDFs sometimes store a single visual word in separate text runs, e.g.
    'Hannove' + 'r' as two PDF content-stream entries with no whitespace.
    search_for() may return a rect that ends at 'Hannove', leaving 'r' visible.
    For each found rect, extend it rightward to cover any PDF word that starts
    at or within a few pt of the rect's right edge on the same visual line.
    """
    if not areas or not page_words:
        return areas
    results: list[fitz.Rect] = []
    gap = _EXPAND_SAME_LINE_MAX_GAP_PT
    for rect in areas:
        expanded = fitz.Rect(rect)
        changed = True
        while changed:
            changed = False
            for w in page_words:
                if len(w) < 5:
                    continue
                wx0, wy0, wx1, wy1 = float(w[0]), float(w[1]), float(w[2]), float(w[3])
                if wx1 <= expanded.x1:
                    continue
                # Word must start inside or just past the current right edge
                if wx0 < expanded.x0 - 1 or wx0 > expanded.x1 + gap:
                    continue
                wr = fitz.Rect(wx0, wy0, wx1, wy1)
                ov = _vertical_overlap(expanded, wr)
                if ov / max(1.0, min(expanded.height, wr.height)) < 0.4:
                    continue
                expanded = fitz.Rect(
                    expanded.x0,
                    min(expanded.y0, wy0),
                    wx1,
                    max(expanded.y1, wy1),
                )
                changed = True
        if category == "address":
            expanded = _expand_address_wrap_tail(expanded, page_words)
        results.append(expanded)
    return results

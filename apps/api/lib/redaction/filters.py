"""Layout-Hilfen für künftige Filter (aus vormals monolithischer anonymize_core übernommen)."""

from __future__ import annotations

import fitz

from lib.redaction.geometry import _line_words_by_visual_row
from lib.redaction.labeled_numbers import _compact_label


def _is_policyholder_label(value: str) -> bool:
    return _compact_label(value) in {"versnehmer", "versicherungsnehmer"}


def _multi_line_value_label_kind(value: str) -> str | None:
    label = _compact_label(value)
    if label in {
        "versnehmer",
        "versicherungsnehmer",
    }:
        return "policyholder"
    if label in {"besort", "besichtigungsort"}:
        return "inspection_place"
    return None


def _looks_like_recipient_company_row(row: list[tuple[float, float, float, float, str]]) -> bool:
    text = " ".join(w[4] for w in row)
    low = text.lower()
    return (
        "versicherung" in low
        or "gmbh" in low
        or "ag" in low.split()
        or "kraftschaden" in low
    )


def _recipient_address_block_rects(page: fitz.Page) -> list[fitz.Rect]:
    rows = _line_words_by_visual_row(page)
    rects: list[fitz.Rect] = []
    for row_idx, row in enumerate(rows):
        if not _looks_like_recipient_company_row(row):
            continue
        row_rect = fitz.Rect(row[0][:4])
        for w in row[1:]:
            row_rect |= fitz.Rect(w[:4])
        if row_rect.x0 > page.rect.width * 0.55:
            continue

        block = fitz.Rect(row_rect)
        for next_row in rows[row_idx + 1 : row_idx + 5]:
            next_rect = fitz.Rect(next_row[0][:4])
            for w in next_row[1:]:
                next_rect |= fitz.Rect(w[:4])
            if next_rect.y0 - block.y1 > row_rect.height * 1.6:
                break
            if next_rect.x0 < row_rect.x0 - 12 or next_rect.x0 > row_rect.x0 + 45:
                break
            block |= next_rect
            if any(ch.isdigit() for w in next_row for ch in w[4]):
                break
        rects.append(block)
    return rects


def _policyholder_value_rects(page: fitz.Page) -> list[fitz.Rect]:
    rows = _line_words_by_visual_row(page)
    rects: list[fitz.Rect] = []
    for row_idx, row in enumerate(rows):
        label_rect: fitz.Rect | None = None
        label_kind: str | None = None
        for start_idx in range(len(row)):
            for end_idx in range(start_idx, min(start_idx + 4, len(row))):
                joined = "".join(w[4] for w in row[start_idx : end_idx + 1])
                kind = _multi_line_value_label_kind(joined)
                if kind is not None:
                    label_kind = kind
                    label_rect = fitz.Rect(row[start_idx][:4])
                    for label_word in row[start_idx + 1 : end_idx + 1]:
                        label_rect |= fitz.Rect(label_word[:4])
                    break
            if label_rect is not None:
                break
        if label_rect is None:
            continue

        value_left = label_rect.x1 + 1
        value_min_x: float | None = None
        value_row_rects: list[fitz.Rect] = []
        for candidate in row:
            if candidate[0] >= value_left:
                cr = fitz.Rect(candidate[:4])
                rects.append(cr)
                value_row_rects.append(cr)
                value_min_x = cr.x0 if value_min_x is None else min(value_min_x, cr.x0)

        first_value_left = value_min_x if value_min_x is not None else value_left
        line_height = max(8.0, label_rect.height)
        if label_kind == "inspection_place":
            rects.append(
                fitz.Rect(
                    first_value_left,
                    label_rect.y0 - 1.0,
                    min(page.rect.x1, first_value_left + 210.0),
                    min(page.rect.y1, label_rect.y1 + line_height * 3.8),
                )
            )

        for next_row in rows[row_idx + 1 : row_idx + 4]:
            if any(
                _compact_label(w[4]).endswith("nr")
                or _compact_label(w[4])
                in {
                    "auftraggeber",
                    "besort",
                    "schaddatum",
                    "auftrdatum",
                    "besdatum",
                    "besichtigtvon",
                    "zusammenfassung",
                    "amtkennz",
                    "fahrzeugart",
                    "fabrikat",
                    "typ",
                }
                for w in next_row
            ):
                break
            row_rect = fitz.Rect(next_row[0][:4])
            for w in next_row[1:]:
                row_rect |= fitz.Rect(w[:4])
            if row_rect.x0 < value_left - 8:
                break
            value_row_rects.append(row_rect)
            rects.append(
                fitz.Rect(row_rect.x0, row_rect.y0, min(page.rect.x1, row_rect.x1 + 120.0), row_rect.y1)
            )
            for candidate in next_row:
                cr = fitz.Rect(candidate[:4])
                rects.append(cr)
                value_min_x = cr.x0 if value_min_x is None else min(value_min_x, cr.x0)

        if value_row_rects:
            block = fitz.Rect(value_row_rects[0])
            for row_rect in value_row_rects[1:]:
                block |= row_rect
            left = value_min_x if value_min_x is not None else block.x0
            right = min(page.rect.x1, block.x1 + 120.0)
            rects.append(fitz.Rect(left, block.y0, right, block.y1))
    return rects

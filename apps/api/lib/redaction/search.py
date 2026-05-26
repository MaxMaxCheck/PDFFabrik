from __future__ import annotations

from lib.detection_rules import redaction_search_needles
from lib.pdf_extract import char_slice_on_page, pages_touching_range


def _target_page_indices(
    det: dict,
    page_ranges: list[tuple[int, int]],
    n_pages: int,
) -> frozenset[int]:
    try:
        s = int(det["start"])
        e = int(det["end"])
    except (KeyError, TypeError, ValueError):
        return frozenset(range(n_pages))
    if e <= s or s < 0:
        return frozenset(range(n_pages))
    pages = pages_touching_range(s, e, page_ranges)
    return frozenset(pages if pages else range(n_pages))


def _overlaps(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and a_end > b_start


def _needles_for_detection_on_page(
    det: dict,
    full_text: str,
    page_idx: int,
    page_ranges: list[tuple[int, int]],
) -> list[str]:
    cat = str(det.get("category", ""))
    value = str(det.get("value", ""))
    variants = redaction_search_needles(value, cat)
    frag = ""
    try:
        s, e = int(det["start"]), int(det["end"])
        frag = char_slice_on_page(full_text, s, e, page_idx, page_ranges)
    except (KeyError, TypeError, ValueError):
        pass

    ordered: list[str] = []
    seen: set[str] = set()
    for n in ([frag] if frag else []) + variants:
        t = n.strip()
        if len(t) >= 2 and t not in seen:
            seen.add(t)
            ordered.append(t)
    return ordered

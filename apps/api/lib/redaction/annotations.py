from __future__ import annotations

from collections.abc import Callable

import fitz

from lib.detection_rules import is_safe_pdf_search_value, should_cap_rects

from lib.redaction.geometry import (
    _expand_areas_to_word_ends,
    _redaction_rect,
    _rects_overlap,
)
from lib.redaction.labeled_numbers import (
    _add_forced_labeled_number_redactions,
    _filter_protected_labeled_numbers,
    _labeled_number_rects_on_page,
    _protected_labeled_number_rects,
)
from lib.redaction.placeholders import PLACEHOLDERS
from lib.redaction.search import _needles_for_detection_on_page, _target_page_indices


def _add_redactions_on_page(
    page: fitz.Page,
    page_idx: int,
    scoped_active: list[tuple[dict, frozenset[int]]],
    choices: dict[str, str],
    full_text: str,
    page_ranges: list[tuple[int, int]],
    textpage: fitz.TextPage | None,
    active_categories: set[str] | None,
    page_words: list | None = None,
) -> None:
    _add_forced_labeled_number_redactions(page, active_categories)
    protected_rects = _protected_labeled_number_rects(page, active_categories)

    for det, page_ok in scoped_active:
        if page_idx not in page_ok:
            continue
        action = choices[det["id"]]
        cat = str(det.get("category", ""))
        for needle in _needles_for_detection_on_page(det, full_text, page_idx, page_ranges):
            if not is_safe_pdf_search_value(cat, needle):
                continue
            if cat in ("insurance_number", "claim_number"):
                areas = _labeled_number_rects_on_page(page, cat, needle)
            elif textpage is not None:
                areas = page.search_for(needle, quads=False, textpage=textpage)
            else:
                areas = page.search_for(needle, quads=False)
            areas = _expand_areas_to_word_ends(areas, page_words or [], category=cat)
            if should_cap_rects(needle, len(areas)):
                continue
            for rect in areas:
                pr = _redaction_rect(rect, page, cat, needle)
                if pr.is_empty:
                    continue
                if any(_rects_overlap(pr, protected) for protected in protected_rects):
                    continue
                if action == "redact":
                    page.add_redact_annot(pr, fill=(0, 0, 0))
                else:
                    label = PLACEHOLDERS.get(cat, "[REDACTED]")
                    page.add_redact_annot(
                        pr,
                        text=label,
                        fontname="Helv",
                        fontsize=min(pr.height * 0.75, 9),
                        fill=(0.93, 0.93, 0.93),
                        text_color=(0.25, 0.25, 0.25),
                    )


def apply_redaction_annotations(
    doc: fitz.Document,
    active: list[dict],
    choices: dict[str, str],
    full_text: str,
    page_ranges: list[tuple[int, int]],
    textpages: list[fitz.TextPage | None] | None = None,
    on_page_done: Callable[[int, int], None] | None = None,
    active_categories: set[str] | None = None,
) -> None:
    """Pro Seite: Treffer-Annotationen setzen und apply_redactions — Inhalt wirklich entfernen."""
    choice_categories = {
        str(d.get("category", ""))
        for d in active
        if str(choices.get(d.get("id"), "ignore")) not in ("ignore", "")
    }
    if choice_categories:
        active_categories = set(active_categories or set()) | choice_categories
    active = _filter_protected_labeled_numbers(active, full_text, active_categories)
    n_pages = len(page_ranges)
    scoped_active = [
        (d, _target_page_indices(d, page_ranges, n_pages)) for d in active
    ]
    for page_idx, page in enumerate(doc):
        tp = textpages[page_idx] if textpages and page_idx < len(textpages) else None
        try:
            pw = page.get_text("words")
        except Exception:
            pw = []
        _add_redactions_on_page(
            page,
            page_idx,
            scoped_active,
            choices,
            full_text,
            page_ranges,
            tp,
            active_categories,
            page_words=pw,
        )
        # TODO: For OCR/image-based PDFs, verify whether `PDF_REDACT_IMAGE_PIXELS` is needed
        # so visible text inside scanned page images is actually removed.
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
        if on_page_done is not None:
            on_page_done(page_idx, n_pages)

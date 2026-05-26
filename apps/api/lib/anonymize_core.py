"""Reine PyMuPDF-Anonymisierung (Bytes → Bytes), für RQ-Worker."""

from lib.redaction.annotations import apply_redaction_annotations
from lib.redaction.anonymizer import anonymize_pdf_to_bytes
from lib.redaction.text_rebuild import anonymize_rebuilt_text_pdf_to_bytes

__all__ = [
    "anonymize_pdf_to_bytes",
    "anonymize_rebuilt_text_pdf_to_bytes",
    "apply_redaction_annotations",
]

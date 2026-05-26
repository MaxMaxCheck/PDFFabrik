"""Nur Metadaten (/Info, XMP) entfernen — sichtbarer Seiteninhalt bleibt unverändert."""

import fitz  # PyMuPDF

# Sinnvolle Obergrenze pro Request (Abwehr riesiger Uploads)
MAX_STRIP_BYTES = 80 * 1024 * 1024  # 80 MiB


def strip_pdf_metadata_only(pdf_bytes: bytes) -> bytes:
    """
    Entfernt Standard-Metadaten und eingebettete XML-Metadaten.
    Keine JavaScript-/Link-Entfernung, kein Entfernen von Text (inkl. unsichtbarem OCR-Layer).
    """
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise ValueError("PDF ist zu groß (max. 80 MB).")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if doc.needs_pass:
            raise ValueError("Passwortgeschützte PDFs werden nicht unterstützt.")

        doc.scrub(
            attached_files=False,
            clean_pages=False,
            embedded_files=False,
            hidden_text=False,
            javascript=False,
            metadata=True,
            redactions=False,
            redact_images=0,
            remove_links=False,
            reset_fields=False,
            reset_responses=False,
            thumbnails=False,
            xml_metadata=True,
        )
        return doc.tobytes(garbage=4, clean=False, deflate=True)
    finally:
        doc.close()

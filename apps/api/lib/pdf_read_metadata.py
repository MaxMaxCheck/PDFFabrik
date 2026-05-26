"""PDF-Metadaten (Dokumentinfo + XMP) auslesen — ohne Seiteninhalt zu verändern."""

import fitz  # PyMuPDF

from lib.pdf_strip_metadata import MAX_STRIP_BYTES


def read_pdf_metadata_info(pdf_bytes: bytes) -> dict:
    """Liefert Standard-Metadaten, XMP-XML (falls vorhanden) und Grundinfos zum Dokument."""
    if len(pdf_bytes) > MAX_STRIP_BYTES:
        raise ValueError("PDF ist zu groß (max. 80 MB).")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if doc.needs_pass:
            raise ValueError("Passwortgeschützte PDFs werden nicht unterstützt.")

        raw = doc.metadata
        standard: dict[str, str | None] = {}
        for key, val in raw.items():
            if val is None or val == "":
                standard[key] = None
            else:
                standard[key] = str(val)

        xmp = (doc.get_xml_metadata() or "").strip()

        return {
            "page_count": int(doc.page_count),
            "is_encrypted": bool(doc.is_encrypted),
            "standard": standard,
            "xmp": xmp if xmp else None,
        }
    finally:
        doc.close()

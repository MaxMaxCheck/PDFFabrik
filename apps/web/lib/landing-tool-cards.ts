export const LANDING_TOOL_CARDS = [
  {
    href: "/pdf-redact",
    title: "PDF Schwärzen",
    description: "Namen, Adressen & mehr erkennen — mit Vorschau vor dem Export.",
    icon: "A",
    accent: "bg-sky-600",
  },
  {
    href: "/pdf-redact-json",
    title: "PDF Schwärzen (nur Text)",
    description: "Textbasierte Schwärzung für digitale PDFs ohne Scan.",
    icon: "T",
    accent: "bg-slate-600",
  },
  {
    href: "/text-aus-bild",
    title: "Text aus Bild",
    description: "OCR für gescannte Seiten — Grundlage für die Analyse.",
    icon: "OCR",
    accent: "bg-emerald-600",
  },
  {
    href: "/meta-daten-anzeigen",
    title: "PDF-Metadaten anzeigen",
    description: "Autor, Titel, XMP & Co. auf einen Blick prüfen.",
    icon: "i",
    accent: "bg-amber-600",
  },
  {
    href: "/meta-daten-loeschen",
    title: "PDF-Metadaten löschen",
    description: "Metadaten entfernen — sichtbarer Inhalt bleibt unverändert.",
    icon: "×",
    accent: "bg-rose-600",
  },
  {
    href: "/compress-pdf",
    title: "PDF komprimieren",
    description: "Kleinere Dateien für Versand und Archivierung.",
    icon: "Z",
    accent: "bg-violet-600",
  },
] as const

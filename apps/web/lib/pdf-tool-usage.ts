export type PdfToolKind =
  | "anonymize_full"
  | "anonymize_text"
  | "metadata_view"
  | "metadata_strip"
  | "api_analyze"

/** Labels für Admin-Tabelle & Startseite (de) */
export const PDF_TOOL_LABELS: Record<PdfToolKind, string> = {
  anonymize_full: "Anonymisieren (Voll)",
  anonymize_text: "Nur Text",
  metadata_view: "Metadaten anzeigen",
  metadata_strip: "Metadaten löschen",
  api_analyze: "API (PDF-Analyse)",
}

const VALID_TOOLS: PdfToolKind[] = [
  "anonymize_full",
  "anonymize_text",
  "metadata_view",
  "metadata_strip",
  "api_analyze",
]

export function isPdfToolKind(x: string): x is PdfToolKind {
  return (VALID_TOOLS as string[]).includes(x)
}

/** Nur mit Pro (oder Admin); kein Free-Tageslimit mehr. */
export const PRO_ONLY_PDF_TOOLS: PdfToolKind[] = [
  "anonymize_full",
  "anonymize_text",
]

export function isProOnlyPdfTool(tool: PdfToolKind): boolean {
  return PRO_ONLY_PDF_TOOLS.includes(tool)
}

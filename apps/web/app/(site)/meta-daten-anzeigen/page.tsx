import { MetaViewTool } from "./meta-view-tool"

export const metadata = {
  title: "Metadaten anzeigen (PDF)",
  description:
    "PDF-Metadaten (Autor, Titel, XMP) einsehen, ohne Inhalt zu verändern. Lokale Analyse über die API.",
}

export default function MetaDatenAnzeigenPage() {
  return <MetaViewTool />
}

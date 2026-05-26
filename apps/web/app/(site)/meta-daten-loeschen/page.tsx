import { MetaStripTool } from "./meta-strip-tool"

export const metadata = {
  title: "Metadaten löschen (PDF)",
  description:
    "PDF hochladen: Metadaten entfernen, ohne sichtbaren Text zu verändern. Keine Schwärzung — nur /Info- und XMP-Daten.",
}

export default function MetaDatenLoeschenPage() {
  return <MetaStripTool />
}

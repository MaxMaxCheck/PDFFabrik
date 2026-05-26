import { CompressPdfTool } from "./compress-pdf-tool"

export const metadata = {
  title: "PDF komprimieren",
  description:
    "PDF hochladen und komprimieren: Streams, Bilder und Schriften werden mit Deflate komprimiert, ungenutzte Objekte entfernt.",
}

export default function CompressPdfPage() {
  return <CompressPdfTool />
}

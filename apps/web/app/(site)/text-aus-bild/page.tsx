import type { Metadata } from "next"
import { ImageTextTool } from "./text-image-tool"

export const metadata: Metadata = {
  title: "Text aus Bild erkennen",
  description:
    "OCR für Bilder: lade PNG, JPG, WEBP, TIFF oder BMP hoch und extrahiere Text per Tesseract.",
}

export default function TextAusBildPage() {
  return <ImageTextTool />
}

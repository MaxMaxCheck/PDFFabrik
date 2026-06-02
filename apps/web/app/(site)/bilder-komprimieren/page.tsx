import { BilderKomprimierenTool } from "./bilder-komprimieren-tool"

export const metadata = {
  title: "Bilder komprimieren",
  description:
    "Bilder (JPG, PNG, WebP, BMP) direkt im Browser komprimieren und sofort herunterladen – auch als ZIP bei mehreren Dateien.",
}

export default function BilderKomprimierenPage() {
  return <BilderKomprimierenTool />
}

import type { ComponentProps } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FileZipIcon,
  Home01Icon,
  LayoutTwoRowIcon,
  News01Icon,
  RemoveSquareIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

export type SiteNavItem = {
  href: string
  label: string
  icon: ComponentProps<typeof HugeiconsIcon>["icon"]
  match: (p: string) => boolean
}

/** Schmale Leiste: Start + Kern-PDF-Werkzeuge */
export const SITE_MAIN_NAV: SiteNavItem[] = [
  { href: "/", label: "Start", icon: Home01Icon, match: (p) => p === "/" },
  {
    href: "/pdf-redact",
    label: "PDF Schwärzen",
    icon: LayoutTwoRowIcon,
    match: (p) =>
      p === "/pdf-redact" ||
      (p.startsWith("/pdf-redact/") && !p.startsWith("/pdf-redact-json")),
  },
  {
    href: "/pdf-redact-json",
    label: "PDF Schwärzen (Text Only)",
    icon: Settings02Icon,
    match: (p) => p.startsWith("/pdf-redact-json"),
  },
]

/** Nach dem Separator: Metadaten löschen + Komprimieren */
export const SITE_TOOL_NAV: SiteNavItem[] = [
  {
    href: "/meta-daten-loeschen",
    label: "Metadaten löschen",
    icon: RemoveSquareIcon,
    match: (p) => p.startsWith("/meta-daten-loeschen"),
  },
  {
    href: "/compress-pdf",
    label: "PDF komprimieren",
    icon: FileZipIcon,
    match: (p) => p.startsWith("/compress-pdf"),
  },
  {
    href: "/blog",
    label: "Blog",
    icon: News01Icon,
    match: (p) => p.startsWith("/blog"),
  },
]

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

export type SiteNavGroup = {
  id: string
  label: string
  icon: ComponentProps<typeof HugeiconsIcon>["icon"]
  items: SiteNavItem[]
  match: (p: string) => boolean
}

export const SITE_HOME_NAV: SiteNavItem[] = [
  { href: "/", label: "Start", icon: Home01Icon, match: (p) => p === "/" },
]

export const SITE_PDF_TOOL_NAV: SiteNavItem[] = [
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
  {
    href: "/meta-daten-loeschen",
    label: "PDF Metadaten löschen",
    icon: RemoveSquareIcon,
    match: (p) => p.startsWith("/meta-daten-loeschen"),
  },
  {
    href: "/compress-pdf",
    label: "PDF komprimieren",
    icon: FileZipIcon,
    match: (p) => p.startsWith("/compress-pdf"),
  },
]

export const SITE_IMAGE_TOOL_NAV: SiteNavItem[] = [
  {
    href: "/bilder-komprimieren",
    label: "Bilder komprimieren",
    icon: FileZipIcon,
    match: (p) => p.startsWith("/bilder-komprimieren"),
  },
]

export const SITE_BLOG_NAV: SiteNavItem[] = [
  {
    href: "/blog",
    label: "Blog",
    icon: News01Icon,
    match: (p) => p.startsWith("/blog"),
  },
]

export const SITE_PDF_NAV_GROUP: SiteNavGroup = {
  id: "pdf",
  label: "PDF",
  icon: LayoutTwoRowIcon,
  items: SITE_PDF_TOOL_NAV,
  match: (p) => SITE_PDF_TOOL_NAV.some((item) => item.match(p)),
}

export const SITE_IMAGE_NAV_GROUP: SiteNavGroup = {
  id: "bilder",
  label: "Bilder",
  icon: FileZipIcon,
  items: SITE_IMAGE_TOOL_NAV,
  match: (p) => SITE_IMAGE_TOOL_NAV.some((item) => item.match(p)),
}

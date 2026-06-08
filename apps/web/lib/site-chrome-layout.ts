/** Gemeinsame Top-Leiste: Header (rechts) und Menüzeile (schmale Rail) müssen bündig abschließen. */
export const SITE_CHROME_TOP_BAR_CLASS =
  "h-12 min-h-12 max-h-12 shrink-0 border-b border-sidebar-border/80"

/** Volle Höhe unter dem Header — Mobile: feste Viewport-Höhe, Desktop: innerer Scroll-Container. */
export const SITE_CHROME_PAGE_ROOT_CLASS =
  "flex max-h-full min-h-0 flex-col overflow-hidden max-lg:h-[calc(100dvh-3rem)] lg:h-full"

/** Milchglas: 75 % Deckkraft, Blur, dezente Inset-Linie oben */
export const SITE_CHROME_TOP_BAR_SURFACE =
  "bg-sidebar/75 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/60"

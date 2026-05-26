/**
 * True, wenn `href` dieselbe Route wie `pathname` meint (Trailing Slash ignoriert).
 * Genutzt, damit ein erneuter Klick auf die aktive Sidebar die Seite wirklich neu lädt.
 */
export function isSameSiteNavDestination(pathname: string, href: string): boolean {
  const norm = (p: string) => {
    const t = (p || "/").trim()
    if (t === "/") return "/"
    return t.replace(/\/+$/, "") || "/"
  }
  return norm(pathname) === norm(href)
}

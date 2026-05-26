import type { PdfToolKind } from "./pdf-tool-usage"

/**
 * Zählt einen Vorgang in der DB (nur wenn Nutzer angemeldet; sonst no-op / 401).
 * Fehler werden still ignoriert, damit PDF-Flows nicht brechen.
 */
export function recordPdfToolUsage(tool: PdfToolKind): void {
  if (typeof window === "undefined") return
  void (async () => {
    try {
      const res = await fetch("/api/v1/usage/pdf-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool }),
        credentials: "include",
      })
      if (!res.ok) return
    } catch {
      /* offline / abgebrochen */
    }
  })()
}

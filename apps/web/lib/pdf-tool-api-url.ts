/**
 * Basis-URL der FastAPI (PyMuPDF) — immer die „echte“ URL (für Node/Server, Rewrites, Docs).
 */
export function pdfToolApiBase(): string {
  return (
    process.env.PDF_TOOL_API_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:3001"
  ).replace(/\/$/, "")
}

/** Versionierte API (alle Routen außer Root-Info unter diesem Präfix). */
export const PDF_TOOL_API_V1_PREFIX = "/v1"

/**
 * V1-Base: Im **Browser** (Standard) zuerst same-origin, damit `fetch` ohne Cross-Origin
 * zur FastAPI läuft (Next rewrites in `next.config.mjs` → `PDF_TOOL_API` / `NEXT_PUBLIC_API_URL`).
 * `NEXT_PUBLIC_PDF_API_SAME_ORIGIN=0` erzwingt die direkte API-URL — dann muss CORS in FastAPI passen
 * (s. `PDF_API_CORS_ORIGINS` / Standardliste).
 * Auf dem **Server** (kein `window`) immer die direkte URL.
 */
export function pdfToolApiV1Base(): string {
  const direct = `${pdfToolApiBase()}${PDF_TOOL_API_V1_PREFIX}`

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_PDF_API_SAME_ORIGIN !== "0") {
    return "/api/pdf-proxy/v1"
  }
  return direct
}

/**
 * `/v1/...` als `URL` (für `searchParams`); same-origin Pfade bekommen `window.location.origin` als Base.
 * Nur für Aufrufer, die unbedingt `URL` brauchen; `fetch\`\${pdfToolApiV1Base()}/…\`` reicht meist.
 */
export function pdfToolV1Url(suffix: string): URL {
  const base = pdfToolApiV1Base()
  const full = `${base.replace(/\/$/, "")}/${suffix.replace(/^\//, "")}`
  if (full.startsWith("http")) {
    return new URL(full)
  }
  if (typeof window !== "undefined" && globalThis.location?.origin) {
    return new URL(full, globalThis.location.origin)
  }
  return new URL(full, "http://127.0.0.1:3000")
}

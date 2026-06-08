/** Server-only: gemeinsames Token zwischen Next.js und FastAPI (nicht im Browser). */
export function getPdfInternalServiceToken(): string | undefined {
  const token = process.env.PDF_INTERNAL_SERVICE_TOKEN?.trim()
  return token || undefined
}

export function pdfInternalFetchHeaders(options?: {
  userId?: string | null
  extra?: HeadersInit
}): Headers {
  const headers = new Headers(options?.extra)
  const token = getPdfInternalServiceToken()
  if (token) {
    headers.set("X-PdfInternal-Token", token)
  }
  const userId = options?.userId?.trim()
  if (userId) {
    headers.set("X-Job-Owner-Id", userId)
  }
  return headers
}

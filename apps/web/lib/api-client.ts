import { pdfToolApiV1Base, pdfToolV1Url } from "./pdf-tool-api-url"
import type { PdfToolKind } from "./pdf-tool-usage"

export type DetectionAction = "redact" | "replace" | "ignore"

export interface Detection {
  id: string
  category: string
  value: string
  start: number
  end: number
  score?: number
}

export interface UploadResponse {
  text: string
  /** true, wenn der Text im Response gekürzt wurde (Riesen-PDFs) */
  text_truncated?: boolean
  hasSelectableText: boolean
  /** Text stammt aus Tesseract-OCR (Scan-PDF) */
  ocrUsed?: boolean
  detections: Detection[]
  message?: string
}

// Pro Aufruf: Im Browser ggf. same-origin Proxy (`/api/pdf-proxy/v1` via Next rewrites).

function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const d = body as { detail?: unknown; error?: unknown }
    if (typeof d.detail === "string") return d.detail
    if (typeof d.error === "string") return d.error
  }
  return fallback
}

/**
 * Ältere APIs haben POST /upload synchron beantwortet (komplettes Analyse-JSON, kein job_id).
 * Solange die nötigen Felder da sind, können wir ohne Polling weitermachen.
 */
function tryLegacySyncUploadResponse(data: unknown): UploadResponse | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (typeof d.text !== "string" || !Array.isArray(d.detections)) return null

  return {
    text: d.text,
    text_truncated: typeof d.text_truncated === "boolean" ? d.text_truncated : undefined,
    hasSelectableText:
      typeof d.hasSelectableText === "boolean"
        ? d.hasSelectableText
        : d.text.length > 0,
    detections: d.detections as Detection[],
    message: typeof d.message === "string" ? d.message : undefined,
    ocrUsed: typeof d.ocrUsed === "boolean" ? d.ocrUsed : undefined,
  }
}

/** Große PDFs: btoa in Stücken, kein Spread über Millionen Bytes */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function uploadPdf(
  file: File,
  tool: PdfToolKind,
  onProgress?: (step: string, progress: number) => void
): Promise<UploadResponse> {
  const form = new FormData()
  form.append("file", file)
  const uploadUrl = pdfToolV1Url("upload")
  uploadUrl.searchParams.set("tool", tool)

  const res = await fetch(uploadUrl.toString(), {
    method: "POST",
    body: form,
  })

  const bodyText = await res.text()
  let data: unknown = null
  try {
    data = bodyText ? JSON.parse(bodyText) : null
  } catch {
    throw new Error("Ungültige Antwort beim Upload.")
  }

  if (!res.ok) {
    throw new Error(apiErrorMessage(data, "Upload fehlgeschlagen"))
  }

  const queued = data && typeof data === "object" ? (data as { job_id?: unknown }).job_id : null
  if (typeof queued === "string" && queued.length > 0) {
    const jobId = queued

    for (;;) {
      await new Promise((r) => setTimeout(r, 400))
      const st = await fetch(`${pdfToolApiV1Base()}/jobs/${jobId}`)
      if (!st.ok) {
        throw new Error("Job-Status konnte nicht gelesen werden")
      }
      const j = (await st.json()) as {
        status: string
        step?: string
        progress?: number
        error?: string | null
        upload_result?: UploadResponse
        upload_result_error?: string
      }
      onProgress?.(j.step ?? "Analyse …", j.progress ?? 0)
      if (j.status === "finished" && j.upload_result) {
        return j.upload_result
      }
      if (j.status === "finished" && j.upload_result_error) {
        throw new Error(`Analyse-Ergebnis unlesbar: ${j.upload_result_error}`)
      }
      if (j.status === "finished" && !j.upload_result) {
        throw new Error(
          "Analyse als fertig gemeldet, aber ohne Ergebnis-JSON – Worker prüfen (docker compose logs worker).",
        )
      }
      if (j.status === "failed") {
        throw new Error(j.error ?? "Analyse fehlgeschlagen")
      }
    }
  }

  const legacy = tryLegacySyncUploadResponse(data)
  if (legacy) {
    onProgress?.("Analyse abgeschlossen", 100)
    return legacy
  }

  throw new Error(
    "Upload: Die API antwortete weder mit job_id (Queue) noch mit einem vollständigen Analyse-JSON " +
      "(text + detections). Typischerweise läuft noch eine alte API ohne Redis/RQ oder " +
      "NEXT_PUBLIC_API_URL zeigt auf den falschen Dienst. " +
      `Antwort-Anfang: ${bodyText.slice(0, 240)}`,
  )
}

export interface WorkersOverview {
  redis_ok: boolean
  queue: string
  queued_jobs: number
  queued_job_ids: string[]
  running_jobs: number
  running_job_ids: string[]
  failed_jobs: number
  failed_job_ids: string[]
  finished_jobs_retained: number
  workers: Array<{
    name: string
    state: string
    current_job_id: string | null
    queues: string[]
  }>
  worker_count: number
  job_max_age_hours: number
}

export async function fetchWorkersOverview(): Promise<WorkersOverview> {
  const res = await fetch(`${pdfToolApiV1Base()}/workers`)
  const bodyText = await res.text()
  let data: unknown = null
  try {
    data = bodyText ? JSON.parse(bodyText) : null
  } catch {
    throw new Error("Ungültige JSON-Antwort von /workers")
  }
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, "Worker-Status nicht verfügbar"))
  }
  return data as WorkersOverview
}

export type AnonymizeOutputMode = "layout" | "text_only"

export async function anonymizePdf(
  file: File,
  detections: Detection[],
  choices: Record<string, DetectionAction>,
  onProgress?: (step: string, progress: number) => void,
  options?: { ocrUsed?: boolean; outputMode?: AnonymizeOutputMode; activeCategories?: string[] }
): Promise<{ pdf: string }> {
  const form = new FormData()
  form.append("file", file)
  form.append("detections", JSON.stringify(detections))
  form.append("choices", JSON.stringify(choices))
  form.append("ocr_used", options?.ocrUsed === true ? "true" : "false")
  form.append("output_mode", options?.outputMode === "text_only" ? "text_only" : "layout")
  form.append("active_categories", JSON.stringify(options?.activeCategories ?? []))

  const res = await fetch(`${pdfToolApiV1Base()}/anonymize`, {
    method: "POST",
    body: form,
  })

  const bodyText = await res.text()
  let data: unknown = null
  try {
    data = bodyText ? JSON.parse(bodyText) : null
  } catch {
    throw new Error(
      res.ok
        ? "Ungültige JSON-Antwort von der API (Anonymisieren)."
        : "Ungültige Fehler-Antwort von der API.",
    )
  }

  if (!res.ok) {
    throw new Error(apiErrorMessage(data, "Anonymisierung konnte nicht gestartet werden"))
  }

  const payload = data && typeof data === "object" ? (data as { job_id?: unknown; pdf?: unknown }) : null

  // Legacy: manche Setups liefern noch direkt base64-PDF (ohne Redis/Queue) – dann gibt es kein job_id.
  if (payload && typeof payload.pdf === "string") {
    onProgress?.("Fertig", 100)
    return { pdf: payload.pdf }
  }

  const job_id = payload && typeof payload.job_id === "string" ? payload.job_id : null

  if (!job_id) {
    const mode = res.headers.get("X-Anonymize-Mode")
    throw new Error(
      `Erwartet JSON mit job_id (Queue). ` +
        (mode ? `Header: ${mode}. ` : "") +
        `Antwort-Anfang: ${bodyText.slice(0, 180)} … ` +
        `Hinweis: API neu startieren (nur eine Instanz auf Port 3001, redis + Worker „bun run worker“).`,
    )
  }

  for (;;) {
    await new Promise((r) => setTimeout(r, 400))
    const st = await fetch(`${pdfToolApiV1Base()}/jobs/${job_id}`)
    if (!st.ok) {
      throw new Error("Job-Status konnte nicht gelesen werden")
    }
    const j = (await st.json()) as {
      status: string
      step?: string
      progress?: number
      error?: string | null
    }
    onProgress?.(j.step ?? "Warte in der Warteschlange …", j.progress ?? 0)
    if (j.status === "finished") break
    if (j.status === "failed") {
      throw new Error(j.error ?? "Anonymisierung fehlgeschlagen")
    }
  }

  const dl = await fetch(`${pdfToolApiV1Base()}/jobs/${job_id}/download`)
  if (!dl.ok) {
    const err = await dl.json().catch(() => ({}))
    throw new Error(apiErrorMessage(err, "Download der PDF fehlgeschlagen"))
  }
  const buf = await dl.arrayBuffer()
  return { pdf: arrayBufferToBase64(buf) }
}

export function downloadBase64Pdf(base64: string, filename = "anonymisiert.pdf") {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function base64PdfObjectUrl(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: "application/pdf" })
  return URL.createObjectURL(blob)
}

export interface PdfMetadataInfoResponse {
  filename: string
  page_count: number
  is_encrypted: boolean
  standard: Record<string, string | null>
  xmp: string | null
}

/**
 * Liest Dokument-Metadaten (PDF /Info + XMP) und Basisinfos, ohne Inhalt zu verändern.
 */
export async function readPdfMetadataInfo(file: File): Promise<PdfMetadataInfoResponse> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${pdfToolApiV1Base()}/tools/read-metadata`, {
    method: "POST",
    body: form,
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error("Ungültige Antwort von der API (Metadaten).")
  }
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, "Metadaten konnten nicht gelesen werden."))
  }
  return data as PdfMetadataInfoResponse
}

export interface ImageTextResponse {
  filename: string
  content_type: string
  language: string
  text: string
  has_text: boolean
  warning?: string | null
}

function cleanImageOcrText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((rawLine) => {
      let line = rawLine.trim()
      if (!line) return ""
      if (
        /^level\s+page_num\s+block_num\s+par_num\s+line_num\s+word_num\s+left\s+top\s+width\s+height\s+conf\s+text\b/.test(
          line
        )
      ) {
        return ""
      }

      const tsvColumns = line.split(/\t+/)
      if (
        tsvColumns.length >= 12 &&
        tsvColumns[0] === "5" &&
        Number.isFinite(Number(tsvColumns[10]))
      ) {
        return tsvColumns.slice(11).join(" ").trim()
      }

      line = line.replace(
        /(\S*?)5\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+-?\d+(?:\.\d+)?\s+(\S+)/g,
        (_match, prefix: string, word: string) =>
          `${prefix ? `${prefix} ` : ""}${word}`.trim()
      )

      return line
    })
    .filter(Boolean)
    .join("\n")
    .trim()
}

export async function extractImageText(
  file: File,
  language = "deu+eng"
): Promise<ImageTextResponse> {
  const form = new FormData()
  form.append("file", file)
  const url = pdfToolV1Url("tools/extract-image-text")
  if (language.trim()) {
    url.searchParams.set("language", language.trim())
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    body: form,
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error("Ungültige Antwort von der API (Bild-OCR).")
  }
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, "Text konnte nicht erkannt werden."))
  }
  const payload = data as ImageTextResponse
  const cleanedText = cleanImageOcrText(payload.text ?? "")
  return {
    ...payload,
    text: cleanedText,
    has_text: cleanedText.length > 0,
  }
}

/**
 * Löscht nur Metadaten (/Info, XMP), nicht den sichtbaren Text. Liefert die bereinigte PDF als Blob.
 */
export async function stripPdfMetadata(file: File): Promise<Blob> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${pdfToolApiV1Base()}/tools/strip-metadata`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      /* ignore */
    }
    throw new Error(apiErrorMessage(data, "Metadaten konnten nicht entfernt werden."))
  }
  return res.blob()
}

export interface CompressResult {
  blob: Blob
  originalSize: number
  compressedSize: number
}

export async function compressPdf(file: File, imageQuality = 72): Promise<CompressResult> {
  const form = new FormData()
  form.append("file", file)
  form.append("image_quality", String(Math.round(imageQuality)))
  /** Gleiche Origin wie die App — kein Cross-Origin-Fetch zur FastAPI im Browser. */
  const res = await fetch("/api/v1/tools/compress-pdf", {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      /* ignore */
    }
    throw new Error(apiErrorMessage(data, "Komprimierung fehlgeschlagen."))
  }
  const blob = await res.blob()
  const originalSize = parseInt(res.headers.get("X-Original-Size") ?? "0", 10)
  const compressedSize = parseInt(res.headers.get("X-Compressed-Size") ?? "0", 10)
  return { blob, originalSize: originalSize || file.size, compressedSize: compressedSize || blob.size }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

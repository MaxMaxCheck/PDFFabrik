import {
  getApiTokenPepper,
  parseApiKeyParts,
  parseBearerApiKey,
  verifyApiToken,
} from "@/lib/api-token"
import {
  resolveKeyCategories,
  resolveKeyMode,
} from "@/lib/integration-categories"
import { logApiKeyUsage } from "@/lib/log-api-key-usage"
import { pdfInternalFetchHeaders } from "@/lib/pdf-internal"
import { pdfToolApiBase } from "@/lib/pdf-tool-api-url"
import { prisma } from "@workspace/prisma"
import { NextResponse } from "next/server"

export const maxDuration = 300

function integrationCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin")
  const raw = process.env.INTEGRATION_CORS_ORIGINS?.trim()
  if (!origin || !raw) return {}
  const allowedOrigins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const allowAnyOrigin = allowedOrigins.includes("*")
  if (!allowAnyOrigin && !allowedOrigins.includes(origin)) return {}

  return {
    "Access-Control-Allow-Origin": allowAnyOrigin ? "*" : origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    ...(!allowAnyOrigin ? { Vary: "Origin" } : {}),
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: integrationCorsHeaders(request) })
}

/**
 * Authentifiziert per API-Schlüssel und gibt anonymisierten Fließtext als JSON zurück.
 * Proxy zu FastAPI `POST /v1/pdf-redact-json`.
 */
export async function POST(request: Request) {
  const cors = integrationCorsHeaders(request)
  const jsonErr = (body: object, status: number) =>
    NextResponse.json(body, { status, headers: cors })

  try {
    getApiTokenPepper()
  } catch {
    return jsonErr({ error: "API-Schlüssel sind auf diesem Server nicht konfiguriert." }, 503)
  }

  const bearer = parseBearerApiKey(request.headers.get("authorization"))
  if (!bearer) {
    return jsonErr(
      { error: "Authorization: Bearer pdffabrik_sk_… erforderlich." },
      401,
    )
  }

  const parts = parseApiKeyParts(bearer)
  if (!parts) {
    return jsonErr({ error: "Ungültiges API-Schlüssel-Format." }, 401)
  }

  const row = await prisma.apiKey.findUnique({ where: { id: parts.id } })
  if (!row || !verifyApiToken(bearer, row.tokenHash)) {
    return jsonErr({ error: "Ungültiger API-Schlüssel." }, 401)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonErr({ error: "Ungültige multipart/form-data." }, 400)
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return jsonErr({ error: "Feld «file» (PDF) erforderlich." }, 400)
  }

  const integrationClient =
    request.headers.get("x-integration-client")?.trim() || "unknown"
  const integrationSource =
    request.headers.get("x-integration-source")?.trim() || "unknown"
  const keyLabel = row.name?.trim() || row.id.slice(0, 8)

  console.info(
    `[integration/pdf-redact-json] request client=${integrationClient} source=${integrationSource} key=${keyLabel} file=${file.name} size=${file.size}`,
  )

  const keyCategories = resolveKeyCategories(row.defaultCategories)
  const keyMode = resolveKeyMode(row.defaultMode)

  const categories =
    typeof form.get("categories") === "string"
      ? String(form.get("categories"))
      : JSON.stringify(keyCategories)
  const mode =
    typeof form.get("mode") === "string"
      ? String(form.get("mode"))
      : keyMode

  const base = `${pdfToolApiBase()}/v1`
  const upstream = new FormData()
  upstream.append("file", file, file.name || "dokument.pdf")
  upstream.append("categories", categories)
  upstream.append("mode", mode)

  let res: Response
  try {
    res = await fetch(`${base}/pdf-redact-json`, {
      method: "POST",
      headers: pdfInternalFetchHeaders(),
      body: upstream,
    })
  } catch (e) {
    console.error("[integrations/pdf-redact-json] upstream fetch failed", e)
    return jsonErr(
      {
        error: `PDF-API nicht erreichbar (${base}).`,
      },
      502,
    )
  }

  const bodyText = await res.text()
  if (!res.ok) {
    let detail = `Anonymisierung fehlgeschlagen (HTTP ${res.status}).`
    try {
      const j = JSON.parse(bodyText) as { detail?: unknown; error?: unknown }
      if (typeof j.detail === "string") detail = j.detail
      if (typeof j.error === "string") detail = j.error
    } catch {
      if (bodyText?.trim()) detail = bodyText.slice(0, 500)
    }
    console.error(
      `[integration/pdf-redact-json] failed client=${integrationClient} source=${integrationSource} key=${keyLabel} file=${file.name} status=${res.status} detail=${detail}`,
    )
    return jsonErr({ error: detail }, res.status >= 400 ? res.status : 502)
  }

  void prisma.apiKey
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  logApiKeyUsage(row.id, row.userId, "pdf-redact-json")

  let detections = 0
  let textChars = 0
  try {
    const payload = JSON.parse(bodyText) as {
      detections_count?: number
      text?: string
    }
    detections = payload.detections_count ?? 0
    textChars = payload.text?.length ?? 0
  } catch {
    // ignore parse for logging
  }

  console.info(
    `[integration/pdf-redact-json] ok client=${integrationClient} source=${integrationSource} key=${keyLabel} file=${file.name} detections=${detections} textChars=${textChars}`,
  )

  void prisma.userPdfToolStat
    .upsert({
      where: { userId_tool: { userId: row.userId, tool: "api_analyze" } },
      create: { userId: row.userId, tool: "api_analyze", count: 1 },
      update: { count: { increment: 1 } },
    })
    .catch(() => {})

  return new NextResponse(bodyText, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors,
    },
  })
}

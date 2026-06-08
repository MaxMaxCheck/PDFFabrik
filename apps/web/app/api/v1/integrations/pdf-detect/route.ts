import {
  getApiTokenPepper,
  parseApiKeyParts,
  parseBearerApiKey,
  verifyApiToken,
} from "@/lib/api-token"
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
 * Authentifiziert per API-Schlüssel (Dashboard → API-Schlüssel).
 * PDF-Analyse wie Web-Upload, optional Kategorien: ?categories=name,claim_number,schadennummer
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

  const url = new URL(request.url)
  const categories = url.searchParams.get("categories")

  const base = `${pdfToolApiBase()}/v1`
  const upstream = new FormData()
  upstream.append("file", file, file.name || "dokument.pdf")

  const detectUrl = new URL(`${base}/detect`)
  if (categories?.trim()) {
    detectUrl.searchParams.set("categories", categories.trim())
  }

  let res: Response
  try {
    res = await fetch(detectUrl.toString(), {
      method: "POST",
      headers: pdfInternalFetchHeaders(),
      body: upstream,
    })
  } catch (e) {
    console.error("[integrations/pdf-detect] upstream fetch failed", e)
    return jsonErr(
      {
        error: `PDF-API nicht erreichbar (${base}).`,
      },
      502,
    )
  }

  const bodyText = await res.text()
  if (!res.ok) {
    let detail = `Analyse fehlgeschlagen (HTTP ${res.status}).`
    try {
      const j = JSON.parse(bodyText) as { detail?: unknown }
      if (typeof j.detail === "string") detail = j.detail
    } catch {
      if (bodyText?.trim()) detail = bodyText.slice(0, 500)
    }
    return jsonErr({ error: detail }, res.status >= 400 ? res.status : 502)
  }

  void prisma.apiKey
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  logApiKeyUsage(row.id, row.userId, "pdf-detect")

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

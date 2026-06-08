import {
  authorizePdfToolUsage,
  requirePdfApiSession,
} from "@/lib/authorize-pdf-api"
import { pdfInternalFetchHeaders } from "@/lib/pdf-internal"
import { pdfToolApiBase } from "@/lib/pdf-tool-api-url"
import { getAppSession, isAdmin } from "@/lib/get-session"
import { isPdfToolKind, type PdfToolKind } from "@/lib/pdf-tool-usage"
import { NextResponse } from "next/server"

const REDACT_TOOLS: PdfToolKind[] = ["anonymize_full", "anonymize_text"]

/** Nur über /api/v1/integrations/* mit API-Schlüssel — nicht über den Browser-Proxy. */
const INTEGRATION_ONLY_HEADS = new Set(["detect", "pdf-redact-json"])

const TOOL_PATH_KIND: Record<string, PdfToolKind> = {
  "tools/read-metadata": "metadata_view",
  "tools/strip-metadata": "metadata_strip",
}

function pathKey(segments: string[]): string {
  return segments.join("/")
}

function isRedactUpstreamPath(segments: string[]): boolean {
  const head = segments[0]
  return head === "upload" || head === "anonymize" || head === "jobs"
}

function isAdminUpstreamPath(segments: string[]): boolean {
  return segments[0] === "workers"
}

function isHealthPath(segments: string[]): boolean {
  return segments.length === 1 && segments[0] === "health"
}

function isToolPath(segments: string[]): boolean {
  return segments[0] === "tools" && segments.length >= 2
}

function copyProxyResponseHeaders(source: Headers): Headers {
  const target = new Headers()
  for (const name of ["content-type", "content-disposition", "x-anonymize-mode"]) {
    const value = source.get(name)
    if (value) target.set(name, value)
  }
  return target
}

function forwardRequestHeaders(
  source: Headers,
  userId?: string,
  options?: { includeContentType?: boolean },
): Headers {
  const contentType = source.get("content-type")
  return pdfInternalFetchHeaders({
    userId,
    extra:
      options?.includeContentType !== false && contentType
        ? { "content-type": contentType }
        : undefined,
  })
}

type ProxyAuthResult =
  | { ok: true; userId?: string }
  | { ok: false; response: NextResponse }

async function authorizePdfProxy(
  req: Request,
  segments: string[],
): Promise<ProxyAuthResult> {
  if (segments.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ detail: "Unbekannter API-Pfad." }, { status: 404 }),
    }
  }

  const head = segments[0]!
  if (INTEGRATION_ONLY_HEADS.has(head)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          detail:
            "Dieser Endpunkt ist nur über die Integrations-API mit API-Schlüssel verfügbar.",
        },
        { status: 403 },
      ),
    }
  }

  if (isHealthPath(segments)) {
    if (req.method === "GET") return { ok: true }
    return {
      ok: false,
      response: NextResponse.json({ detail: "Methode nicht erlaubt." }, { status: 405 }),
    }
  }

  if (isAdminUpstreamPath(segments)) {
    const session = await getAppSession()
    if (!session || !isAdmin(session.user)) {
      return {
        ok: false,
        response: NextResponse.json({ detail: "Nicht autorisiert." }, { status: 403 }),
      }
    }
    return { ok: true }
  }

  if (isRedactUpstreamPath(segments)) {
    const sessionAuth = await requirePdfApiSession()
    if (!sessionAuth.ok) return sessionAuth

    if (segments[0] === "upload" && req.method === "POST") {
      const { searchParams } = new URL(req.url)
      const tool = searchParams.get("tool")
      if (!tool || !isPdfToolKind(tool) || !REDACT_TOOLS.includes(tool)) {
        return {
          ok: false,
          response: NextResponse.json({ detail: "Ungültiges PDF-Tool." }, { status: 400 }),
        }
      }

      const toolAuth = await authorizePdfToolUsage(sessionAuth.userId, tool, {
        consume: true,
      })
      if (!toolAuth.ok) return toolAuth
    }

    return { ok: true, userId: sessionAuth.userId }
  }

  if (isToolPath(segments)) {
    if (req.method !== "POST") {
      return {
        ok: false,
        response: NextResponse.json({ detail: "Methode nicht erlaubt." }, { status: 405 }),
      }
    }

    const sessionAuth = await requirePdfApiSession()
    if (!sessionAuth.ok) return sessionAuth

    const kind = TOOL_PATH_KIND[pathKey(segments)]
    if (kind) {
      const toolAuth = await authorizePdfToolUsage(sessionAuth.userId, kind, {
        consume: true,
      })
      if (!toolAuth.ok) return toolAuth
    }

    return { ok: true, userId: sessionAuth.userId }
  }

  return {
    ok: false,
    response: NextResponse.json({ detail: "Unbekannter API-Pfad." }, { status: 404 }),
  }
}

type UpstreamBody = {
  body?: BodyInit
  /** false when FormData was rebuilt — fetch must set a fresh multipart boundary */
  includeContentType: boolean
}

async function readUpstreamBody(req: Request): Promise<UpstreamBody> {
  if (req.method === "GET" || req.method === "HEAD") {
    return { includeContentType: true }
  }

  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("multipart/form-data")) {
    // Stream through unchanged so the original boundary stays valid upstream.
    if (req.body) {
      return { body: req.body, includeContentType: true }
    }

    try {
      const incoming = await req.formData()
      const upstreamBody = new FormData()
      for (const [key, value] of incoming.entries()) {
        upstreamBody.append(key, value)
      }
      return { body: upstreamBody, includeContentType: false }
    } catch (error) {
      console.error("[pdf-proxy] multipart parse failed", error)
      throw new Error("MULTIPART_PARSE_FAILED")
    }
  }

  return { body: req.body ?? undefined, includeContentType: true }
}

export async function handlePdfProxyRequest(
  req: Request,
  pathSegments: string[] | undefined,
): Promise<Response> {
  const segments = pathSegments ?? []
  const authz = await authorizePdfProxy(req, segments)
  if (!authz.ok) return authz.response

  const upstreamPath = segments.join("/")
  const upstreamUrl = new URL(`${pdfToolApiBase()}/v1/${upstreamPath}`)
  upstreamUrl.search = new URL(req.url).search

  let upstreamBody: UpstreamBody
  try {
    upstreamBody = await readUpstreamBody(req)
  } catch (error) {
    if (error instanceof Error && error.message === "MULTIPART_PARSE_FAILED") {
      return NextResponse.json({ detail: "Ungültige Formulardaten." }, { status: 400 })
    }
    throw error
  }

  const { body, includeContentType } = upstreamBody
  const init: RequestInit = {
    method: req.method,
    headers: forwardRequestHeaders(req.headers, authz.userId, { includeContentType }),
    body,
  }
  if (body instanceof ReadableStream) {
    ;(init as RequestInit & { duplex: "half" }).duplex = "half"
  }

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl.toString(), init)
  } catch (error) {
    console.error("[pdf-proxy] upstream fetch failed", error)
    return NextResponse.json(
      { detail: "PDF-Dienst vorübergehend nicht erreichbar." },
      { status: 502 },
    )
  }

  const payload = await upstream.arrayBuffer()
  return new Response(payload, {
    status: upstream.status,
    headers: copyProxyResponseHeaders(upstream.headers),
  })
}

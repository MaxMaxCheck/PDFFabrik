import {
  consumePdfToolDailyAccess,
  getCurrentSessionUserId,
  getPdfToolAccessMessage,
} from "@/lib/pdf-tool-access"
import { pdfToolApiBase } from "@/lib/pdf-tool-api-url"
import { getAppSession, isAdmin } from "@/lib/get-session"
import { isPdfToolKind, type PdfToolKind } from "@/lib/pdf-tool-usage"
import { NextResponse } from "next/server"

const REDACT_TOOLS: PdfToolKind[] = ["anonymize_full", "anonymize_text"]

function isRedactUpstreamPath(segments: string[]): boolean {
  const head = segments[0]
  return head === "upload" || head === "anonymize" || head === "jobs"
}

function isAdminUpstreamPath(segments: string[]): boolean {
  return segments[0] === "workers"
}

function copyProxyResponseHeaders(source: Headers): Headers {
  const target = new Headers()
  for (const name of ["content-type", "content-disposition", "x-anonymize-mode"]) {
    const value = source.get(name)
    if (value) target.set(name, value)
  }
  return target
}

function forwardRequestHeaders(source: Headers): Headers {
  const target = new Headers()
  const contentType = source.get("content-type")
  if (contentType) target.set("content-type", contentType)
  return target
}

async function authorizePdfProxy(
  req: Request,
  segments: string[]
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
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

  if (!isRedactUpstreamPath(segments)) {
    return { ok: true }
  }

  const userId = await getCurrentSessionUserId()
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          detail:
            "Bitte melde dich an oder registriere dich, um dieses PDF-Tool zu nutzen.",
        },
        { status: 401 }
      ),
    }
  }

  if (segments[0] === "upload" && req.method === "POST") {
    const { searchParams } = new URL(req.url)
    const tool = searchParams.get("tool")
    if (!tool || !isPdfToolKind(tool) || !REDACT_TOOLS.includes(tool)) {
      return {
        ok: false,
        response: NextResponse.json({ detail: "Ungültiges PDF-Tool." }, { status: 400 }),
      }
    }

    const access = await consumePdfToolDailyAccess(userId, tool)
    if (!access.canUse && !access.isUnlimited) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            detail:
              getPdfToolAccessMessage(access) ??
              "Dieses PDF-Tool ist heute nicht mehr verfügbar.",
          },
          { status: 403 }
        ),
      }
    }
  }

  return { ok: true }
}

async function readUpstreamBody(req: Request): Promise<BodyInit | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined

  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("multipart/form-data")) {
    const incoming = await req.formData()
    const upstreamBody = new FormData()
    for (const [key, value] of incoming.entries()) {
      upstreamBody.append(key, value)
    }
    return upstreamBody
  }

  if (req.body) return req.body
  return undefined
}

export async function handlePdfProxyRequest(
  req: Request,
  pathSegments: string[] | undefined
): Promise<Response> {
  const segments = pathSegments ?? []
  const authz = await authorizePdfProxy(req, segments)
  if (!authz.ok) return authz.response

  const upstreamPath = segments.join("/")
  const upstreamUrl = new URL(`${pdfToolApiBase()}/v1/${upstreamPath}`)
  upstreamUrl.search = new URL(req.url).search

  const body = await readUpstreamBody(req)
  const init: RequestInit = {
    method: req.method,
    headers: forwardRequestHeaders(req.headers),
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
      { status: 502 }
    )
  }

  const payload = await upstream.arrayBuffer()
  return new Response(payload, {
    status: upstream.status,
    headers: copyProxyResponseHeaders(upstream.headers),
  })
}

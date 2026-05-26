import {
  consumePdfToolDailyAccess,
  getCurrentSessionUserId,
  getPdfToolAccessMessage,
} from "@/lib/pdf-tool-access"
import { pdfToolApiBase } from "@/lib/pdf-tool-api-url"
import { isPdfToolKind } from "@/lib/pdf-tool-usage"
import { NextResponse } from "next/server"

function copyProxyHeaders(source: Headers): Headers {
  const target = new Headers()
  const contentType = source.get("content-type")
  if (contentType) {
    target.set("content-type", contentType)
  }
  const contentDisposition = source.get("content-disposition")
  if (contentDisposition) {
    target.set("content-disposition", contentDisposition)
  }
  return target
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const tool = searchParams.get("tool")

  if (!tool || !isPdfToolKind(tool)) {
    return NextResponse.json({ detail: "Ungültiges PDF-Tool." }, { status: 400 })
  }

  const userId = await getCurrentSessionUserId()
  if (!userId) {
    return NextResponse.json(
      {
        detail:
          "Bitte melde dich an oder registriere dich, um dieses PDF-Tool zu nutzen.",
      },
      { status: 401 }
    )
  }

  const access = await consumePdfToolDailyAccess(userId, tool)
  if (!access.canUse && !access.isUnlimited) {
    return NextResponse.json(
      {
        detail:
          getPdfToolAccessMessage(access) ??
          "Dieses PDF-Tool ist heute nicht mehr verfuegbar.",
      },
      { status: 403 }
    )
  }

  const incoming = await req.formData()
  const upstreamBody = new FormData()
  for (const [key, value] of incoming.entries()) {
    upstreamBody.append(key, value)
  }

  const upstream = await fetch(`${pdfToolApiBase()}/v1/upload`, {
    method: "POST",
    body: upstreamBody,
  })

  const payload = await upstream.arrayBuffer()

  return new Response(payload, {
    status: upstream.status,
    headers: copyProxyHeaders(upstream.headers),
  })
}

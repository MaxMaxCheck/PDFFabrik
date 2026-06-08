import { requirePdfApiSession } from "@/lib/authorize-pdf-api"
import { pdfInternalFetchHeaders } from "@/lib/pdf-internal"
import { pdfToolApiBase } from "@/lib/pdf-tool-api-url"
import { NextResponse } from "next/server"

export const maxDuration = 300

/**
 * Proxy zu FastAPI `POST /v1/tools/compress-pdf` — vermeidet Browser-CORS zwischen
 * Next-Origin und 127.0.0.1:3001 und liefert klare 502, wenn die API down ist.
 */
export async function POST(req: Request) {
  const auth = await requirePdfApiSession()
  if (!auth.ok) return auth.response

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ detail: "Ungültige Formulardaten." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ detail: "Keine PDF-Datei." }, { status: 400 })
  }

  const base = `${pdfToolApiBase()}/v1`
  const upstream = new FormData()
  upstream.append("file", file, file.name || "dokument.pdf")
  const quality = form.get("image_quality")
  if (quality != null) upstream.append("image_quality", String(quality))

  let res: Response
  try {
    res = await fetch(`${base}/tools/compress-pdf`, {
      method: "POST",
      headers: pdfInternalFetchHeaders({ userId: auth.userId }),
      body: upstream,
    })
  } catch (e) {
    console.error("[api/v1/tools/compress-pdf] upstream fetch failed", e)
    return NextResponse.json(
      { detail: "PDF-Dienst vorübergehend nicht erreichbar." },
      { status: 502 },
    )
  }

  if (!res.ok) {
    const text = await res.text()
    let detail = `Komprimierung fehlgeschlagen (HTTP ${res.status}).`
    try {
      const j = JSON.parse(text) as { detail?: unknown }
      if (typeof j.detail === "string") detail = j.detail
    } catch {
      if (text?.trim()) detail = text.slice(0, 400)
    }
    return NextResponse.json({ detail }, { status: res.status >= 400 ? res.status : 502 })
  }

  const buf = await res.arrayBuffer()
  const headers = new Headers()
  headers.set("Content-Type", "application/pdf")
  const orig = res.headers.get("X-Original-Size")
  const comp = res.headers.get("X-Compressed-Size")
  if (orig) headers.set("X-Original-Size", orig)
  if (comp) headers.set("X-Compressed-Size", comp)

  return new NextResponse(buf, { status: 200, headers })
}

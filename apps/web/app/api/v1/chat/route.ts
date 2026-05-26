import { OllamaRequestError, ollamaGenerate } from "@/lib/ollama-server"
import { pdfToolApiV1Base } from "@/lib/pdf-tool-api-url"
import { auth } from "@workspace/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export const maxDuration = 300

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_PDF_TEXT_CHARS = 100_000

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
])

class ChatRouteError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ChatRouteError"
    this.status = status
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64")
}

async function extractPdfTextViaToolApi(file: File): Promise<string> {
  const base = pdfToolApiV1Base()
  const form = new FormData()
  form.append("file", file, file.name || "dokument.pdf")
  const res = await fetch(`${base}/tools/extract-text`, {
    method: "POST",
    body: form,
  })
  let data: { detail?: unknown; text?: unknown } = {}
  try {
    data = (await res.json()) as { detail?: unknown; text?: unknown }
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const detail = data?.detail
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail[0] && typeof detail[0] === "object"
          ? String((detail[0] as { msg?: string }).msg ?? res.status)
          : `PDF-Text konnte nicht gelesen werden (HTTP ${res.status}). Läuft die API auf ${base}?`
    throw new ChatRouteError(msg, res.status >= 500 ? 502 : 400)
  }
  if (typeof data.text !== "string") {
    throw new ChatRouteError("Ungültige Antwort der PDF-API.", 502)
  }
  return data.text
}

/**
 * Ollama-KI-Chat: FormData `message` (Text) + optional `file` (Bild oder PDF).
 * PDF-Text: FastAPI `POST /v1/tools/extract-text` (PyMuPDF) — kein pdf.js in Node.
 * Authentifizierung: eingeloggter Nutzer (Kosten/Ollama schützen).
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Ungültige Formulardaten" }, { status: 400 })
  }

  const message = String(form.get("message") ?? "").trim()
  const file = form.get("file")
  const hasFile = file instanceof File && file.size > 0

  if (!message && !hasFile) {
    return NextResponse.json(
      { error: "Bitte eine Nachricht eingeben oder eine Datei (PDF/Bild) anhängen." },
      { status: 400 }
    )
  }

  if (file instanceof File && file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Datei zu groß (max. ${MAX_FILE_BYTES / 1024 / 1024} MB).` },
      { status: 400 }
    )
  }

  const userInstruction =
    message ||
    "Analysiere den folgenden Inhalt und fasse die wichtigsten Punkte kurz und strukturiert auf Deutsch zusammen."

  try {
    if (file instanceof File && file.size > 0) {
      const mime = (file.type || "").toLowerCase()
      const name = (file.name || "").toLowerCase()

      if (mime === "application/pdf" || name.endsWith(".pdf")) {
        const raw = (await extractPdfTextViaToolApi(file)).trim()
        if (!raw) {
          return NextResponse.json(
            {
              error:
                "Im PDF wurde kein lesbarer Text gefunden. Gescannte PDFs ggf. zuerst mit OCR aufbereiten.",
            },
            { status: 400 }
          )
        }
        const slice =
          raw.length > MAX_PDF_TEXT_CHARS
            ? raw.slice(0, MAX_PDF_TEXT_CHARS) +
              "\n\n[… Text gekürzt, max. " +
              MAX_PDF_TEXT_CHARS +
              " Zeichen …]"
            : raw

        const prompt = `${userInstruction}

--- Extrahierter PDF-Text ---

${slice}

Antworte auf Deutsch, klar strukturiert.`

        const { response } = await ollamaGenerate({ prompt, stream: false })
        return NextResponse.json({ reply: response })
      }

      const extOkImage = /\.(jpe?g|png|gif|webp)$/i.test(name)
      if (IMAGE_MIME.has(mime) || (mime === "application/octet-stream" && extOkImage) || extOkImage) {
        const b64 = arrayBufferToBase64(await file.arrayBuffer())
        const prompt = `${userInstruction}

Beziehe das angehängte Bild in deine Antwort ein. Antworte auf Deutsch.`

        const { response } = await ollamaGenerate({
          prompt,
          stream: false,
          images: [b64],
        })
        return NextResponse.json({ reply: response })
      }

      return NextResponse.json(
        {
          error:
            "Nur PDF und Bilder (JPEG, PNG, GIF, WebP) werden unterstützt.",
        },
        { status: 400 }
      )
    }

    const { response } = await ollamaGenerate({
      prompt: userInstruction,
      stream: false,
    })
    return NextResponse.json({ reply: response })
  } catch (e) {
    if (e instanceof ChatRouteError) {
      console.error("[/api/v1/chat] chat route error", {
        status: e.status,
        message: e.message,
      })
      return NextResponse.json({ error: e.message }, { status: e.status })
    }

    if (e instanceof OllamaRequestError) {
      console.error("[/api/v1/chat] ollama upstream error", {
        status: e.status,
        message: e.message,
        upstreamBodyPreview: e.upstreamBody?.slice(0, 300),
      })
      return NextResponse.json(
        {
          error:
            e.status === 504
              ? "Ollama hat zu lange für die Antwort gebraucht (HTTP 504 Upstream Timeout). Bitte erneut versuchen oder ein schnelleres Modell wählen."
              : e.message,
        },
        { status: e.status === 504 ? 504 : 502 }
      )
    }

    const msg = e instanceof Error ? e.message : "Unbekannter Fehler"
    console.error("[/api/v1/chat] unexpected error", { message: msg })
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function GET() {
  const ready = Boolean(
    process.env.OLLAMA_BASE_URL?.trim() && process.env.OLLAMA_MODEL?.trim()
  )
  return NextResponse.json({ ready })
}

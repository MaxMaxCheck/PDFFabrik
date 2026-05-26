type OllamaGenerateBody = {
  prompt: string
  stream: false
  images?: string[]
  format?: "json"
  options?: Record<string, unknown>
  signal?: AbortSignal
}

export class OllamaRequestError extends Error {
  status: number
  upstreamBody?: string

  constructor(message: string, status: number, upstreamBody?: string) {
    super(message)
    this.name = "OllamaRequestError"
    this.status = status
    this.upstreamBody = upstreamBody
  }
}

export type OllamaGenerateResult = {
  response: string
  raw: unknown
}

/**
 * Server-only: ruft Ollama `/api/generate` auf (Basic-Auth optional).
 * `images`: rohe Base64-Strings (ohne data:-Prefix), für Vision-Modelle.
 * `format`: "json" erzwingt valides JSON ohne Markdown-Wrapper (spart Tokens).
 */
export async function ollamaGenerate(
  body: OllamaGenerateBody
): Promise<OllamaGenerateResult> {
  const base = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "")
  const model = process.env.OLLAMA_MODEL
  const apiKey = process.env.OLLAMA_API_KEY
  const authUser = process.env.OLLAMA_AUTH_USER ?? "maxcheck_user"

  if (!base || !model) {
    throw new Error(
      "OLLAMA_BASE_URL und OLLAMA_MODEL müssen in der Server-Umgebung gesetzt sein."
    )
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (apiKey) {
    const token = Buffer.from(`${authUser}:${apiKey}`, "utf8").toString(
      "base64"
    )
    headers.Authorization = `Basic ${token}`
  }

  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      prompt: body.prompt,
      stream: body.stream,
      think: false,
      ...(body.format ? { format: body.format } : {}),
      ...(body.options ? { options: body.options } : {}),
      ...(body.images?.length ? { images: body.images } : {}),
    }),
    signal: body.signal,
  })

  const text = await res.text()

  if (!res.ok) {
    let data: unknown
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      const detail =
        text.trim().slice(0, 300) || res.statusText || `HTTP ${res.status}`
      throw new OllamaRequestError(
        `Ollama upstream antwortete mit HTTP ${res.status}: ${detail}`,
        res.status,
        text
      )
    }
    const msg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `HTTP ${res.status}`
    throw new OllamaRequestError(`Ollama: ${msg}`, res.status, text)
  }

  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new OllamaRequestError(
      `Ollama: Ungültiges JSON in Erfolgsantwort (HTTP ${res.status})`,
      res.status,
      text
    )
  }

  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as { response?: unknown }).response !== "string"
  ) {
    throw new Error("Ollama: Antwort enthält kein ‚response'-Feld (String).")
  }

  return {
    response: (data as { response: string }).response,
    raw: data,
  }
}

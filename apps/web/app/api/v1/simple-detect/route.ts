import { OllamaRequestError, ollamaGenerate } from "@/lib/ollama-server"
import { auth } from "@workspace/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

/** `false`: nur Presidio-Fundstellen, kein Ollama. Für Ollama-Nachschärfung auf `true`. */
const APP_LLM_ENHANCEMENT_ENABLED = false

const LLM_SUPPORTED_CATEGORIES = new Set(["name", "address", "date", "vin"])

// LLM ist nur ein Zusatz zur Presidio-Erkennung. Deshalb begrenzen wir die
// Arbeit hart, damit die Review nicht auf lokale Inferenz für das ganze PDF wartet.
const CHUNK_SIZE = 2_000
const CHUNK_OVERLAP = 150
const MAX_LLM_TEXT_CHARS = 8_000
const MAX_LLM_CHUNKS = 4
const MAX_PARALLEL_CHUNKS = 1
const LLM_TIMEOUT_MS = 12_000
const MAX_OCCURRENCES_PER_VALUE = 12

type Detection = {
  id: string
  category: string
  value: string
  start: number
  end: number
  score?: number
}

type LlmCandidate = {
  category?: unknown
  value?: unknown
  confidence?: unknown
}

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i
const EQUIPMENT_CODE_LINE_RE = /^\d{5}\s+\S/
const GERMAN_DATE_RE =
  /^(?:\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4})$/i
const ADDRESS_RE =
  /(?:\b\d{5}\s+[A-ZÄÖÜ][\p{L}-]+|\b[\p{L}-]+(?:straße|str\.|weg|platz|allee|ring|gasse|damm|ufer)\s+\d{1,4}[a-z]?\b)/iu
const COMPANY_SUFFIX_RE = /\b(?:gmbh|ag|kg|ohg|ug|se|e\.k\.)\b/i
const PERSON_NAME_RE = /^[A-ZÄÖÜ][\p{L}.'-]+(?:\s+[A-ZÄÖÜ][\p{L}.'-]+)+$/u
const REPORT_SECTION_WORD_RE =
  /\b(?:kaskogesichtspunkt(?:e|en)?|schadenhergang|schadenbild|kalkulationserläuterungen|kalkulationsgrundlagen|auftrag|anwesenheit|besichtigung|gutachten|fahrzeugbesichtigung|kalkulation|kosten|reparaturweg|reparatur|reparaturkosten|wiederherstellung|berücksichtigung|beschädigungen|instandsetzung|verkehrs|betriebssicherheit|sachverständige|sachverständigen|anspruchstellerfahrzeug(?:es)?|versicherungsnehmerfahrzeug(?:es)?)\b/iu

function isPlausibleLlmValue(category: string, value: string): boolean {
  const v = value.trim()
  if (v.length < 3) return false
  if (REPORT_SECTION_WORD_RE.test(v)) return false

  // Fahrzeug-Ausstattungslisten bestehen oft aus 5-stelligem Code + Beschreibung.
  // Diese Codes sind keine PII und führen im Layoutmodus zu massiven False Positives.
  if (EQUIPMENT_CODE_LINE_RE.test(v)) return false

  if (category === "vin") {
    return VIN_RE.test(v.replace(/[\s-]+/g, ""))
  }

  if (category === "date") {
    return GERMAN_DATE_RE.test(v)
  }

  if (category === "address") {
    return ADDRESS_RE.test(v)
  }

  if (category === "name") {
    if (/^\d/.test(v)) return false
    if (COMPANY_SUFFIX_RE.test(v)) return true
    return PERSON_NAME_RE.test(v)
  }

  return false
}

// Text in überlappende Chunks aufteilen
function splitIntoChunks(
  text: string
): Array<{ text: string; offset: number }> {
  const chunks: Array<{ text: string; offset: number }> = []
  const llmText = text.slice(0, MAX_LLM_TEXT_CHARS)
  let pos = 0
  while (pos < llmText.length && chunks.length < MAX_LLM_CHUNKS) {
    const end = Math.min(pos + CHUNK_SIZE, llmText.length)
    chunks.push({ text: llmText.slice(pos, end), offset: pos })
    if (end === llmText.length) break
    pos += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

function extractJsonBlock(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  const firstBracket = Math.min(
    ...[trimmed.indexOf("["), trimmed.indexOf("{")].filter((x) => x >= 0)
  )
  if (Number.isFinite(firstBracket) && firstBracket >= 0) {
    return trimmed.slice(firstBracket).trim()
  }
  return trimmed
}

function normalizeConfidence(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    if (input > 1) return Math.max(0, Math.min(1, input / 100))
    return Math.max(0, Math.min(1, input))
  }
  return 0.74
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function locateAllOccurrences(
  text: string,
  value: string
): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = []
  if (!value) return spans
  const re = new RegExp(escapeRegExp(value), "gu")
  let match: RegExpExecArray | null = null
  while ((match = re.exec(text)) && spans.length < MAX_OCCURRENCES_PER_VALUE) {
    spans.push({ start: match.index, end: match.index + value.length })
    if (match.index === re.lastIndex) re.lastIndex += 1
  }
  return spans
}

function parseCandidates(raw: string): LlmCandidate[] {
  const json = extractJsonBlock(raw)
  const parsed = JSON.parse(json) as unknown
  if (Array.isArray(parsed)) return parsed as LlmCandidate[]
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { detections?: unknown }).detections)
  ) {
    return (parsed as { detections: LlmCandidate[] }).detections
  }
  throw new Error("LLM-Antwort enthält kein JSON-Array mit detections.")
}

function mergeDetections(base: Detection[], extra: Detection[]): Detection[] {
  const seen = new Set(
    base.map((d) => `${d.category}:${d.start}:${d.end}:${d.value}`)
  )
  const out = [...base]
  for (const det of extra) {
    const key = `${det.category}:${det.start}:${det.end}:${det.value}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(det)
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end)
}

// Einen einzelnen Chunk ans LLM schicken
async function processChunk(
  chunkText: string,
  chunkOffset: number,
  fullText: string,
  llmCategories: string[],
  signal: AbortSignal
): Promise<Detection[]> {
  const prompt = `Du extrahierst sensible Textstellen aus deutschem PDF-Fließtext.

Erlaubte Kategorien: ${llmCategories.join(", ")}

Regeln:
- Gib nur Treffer zurück, die exakt als zusammenhängender Text im Dokument vorkommen.
- Erfinde nichts.
- Für VIN/Fahrgestellnummer nur echte 17-stellige FIN/VIN.
- Für Datum nur konkrete Datumsangaben wie 15.03.2024, nicht Artikelnummern oder Ausstattungscodes.
- Für Namen nur Personen-/Unternehmensnamen, wenn sie im Kontext wirklich identifizierend sind.
- Für Adresse nur konkrete Postadressen mit Straße/Hausnummer oder PLZ/Ort.
- Ignoriere Fahrzeug-Ausstattung, Optionscodes, Teilenummern, Maße und technische Merkmale.
- Antworte NUR als JSON.
- Format: {"detections":[{"category":"name|address|date|vin","value":"exakter Text aus Dokument","confidence":0.0}]}

Dokumenttext:
${chunkText}`

  const { response } = await ollamaGenerate({
    prompt,
    stream: false,
    format: "json",
    options: {
      temperature: 0,
      num_predict: 400,
    },
    signal,
  })
  const candidates = parseCandidates(response)

  const detections: Detection[] = []
  for (const item of candidates) {
    const category =
      typeof item.category === "string" ? item.category.trim() : ""
    const value = typeof item.value === "string" ? item.value.trim() : ""
    if (
      !LLM_SUPPORTED_CATEGORIES.has(category) ||
      !isPlausibleLlmValue(category, value)
    ) {
      continue
    }

    // Position im GESAMTEN Text suchen (nicht im Chunk)
    for (const span of locateAllOccurrences(fullText, value)) {
      detections.push({
        id: crypto.randomUUID(),
        category,
        value,
        start: span.start,
        end: span.end,
        score: normalizeConfidence(item.confidence),
      })
    }
  }
  return detections
}

// Chunks in Batches parallel verarbeiten
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<Detection[]>
): Promise<Detection[]> {
  const results: Detection[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((item, j) => fn(item, i + j))
    )
    results.push(...batchResults.flat())
  }
  return results
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { text?: unknown; categories?: unknown; detections?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 })
  }

  const text = typeof body.text === "string" ? body.text.trim() : ""
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((x): x is string => typeof x === "string")
    : []
  const baseDetections = Array.isArray(body.detections)
    ? (body.detections.filter((x): x is Detection =>
        Boolean(x && typeof x === "object")
      ) as Detection[])
    : []

  if (!text) {
    return NextResponse.json({ error: "Text fehlt." }, { status: 400 })
  }

  const llmCategories = categories.filter((x) =>
    LLM_SUPPORTED_CATEGORIES.has(x)
  )
  if (llmCategories.length === 0) {
    return NextResponse.json({ detections: baseDetections, llmAdded: 0 })
  }

  if (!APP_LLM_ENHANCEMENT_ENABLED) {
    return NextResponse.json({ detections: baseDetections, llmAdded: 0 })
  }

  try {
    const signal = AbortSignal.timeout(LLM_TIMEOUT_MS)
    const chunks = splitIntoChunks(text)

    // Alle Chunks parallel (in Batches) verarbeiten
    const allDetections = await processInBatches(
      chunks,
      MAX_PARALLEL_CHUNKS,
      (chunk) => processChunk(chunk.text, chunk.offset, text, llmCategories, signal)
    )

    const merged = mergeDetections(baseDetections, allDetections)

    return NextResponse.json({
      detections: merged,
      llmAdded: merged.length - baseDetections.length,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return NextResponse.json(
        {
          detections: baseDetections,
          llmAdded: 0,
          llmWarning:
            "LLM-Prüfung lief in ein Timeout. Basis-Erkennung bleibt aktiv.",
        }
      )
    }
    if (e instanceof OllamaRequestError) {
      return NextResponse.json(
        {
          detections: baseDetections,
          llmAdded: 0,
          llmWarning:
            e.status === 504
              ? "LLM-Prüfung lief in ein Timeout. Basis-Erkennung bleibt aktiv."
              : e.message,
        }
      )
    }
    const msg = e instanceof Error ? e.message : "LLM-Prüfung fehlgeschlagen."
    return NextResponse.json({
      detections: baseDetections,
      llmAdded: 0,
      llmWarning: msg,
    })
  }
}

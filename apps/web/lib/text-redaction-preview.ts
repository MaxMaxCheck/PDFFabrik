import type { Detection, DetectionAction } from "@/lib/api-client"

/** Entspricht `PLACEHOLDERS` in der API (`lib/redaction/placeholders.py`). */
const PLACEHOLDERS: Record<string, string> = {
  email: "[E-MAIL]",
  phone: "[TELEFON]",
  iban: "[IBAN]",
  date: "[DATUM]",
  license_plate: "[KENNZEICHEN]",
  vin: "[FAHRGESTELLNUMMER]",
  insurance_number: "[VERS.-NR.]",
  claim_number: "[SCHADEN-NR.]",
  name: "[NAME]",
  address: "[ADRESSE]",
}

const ARTIFACT_LINE_RE =
  /^(?:(?:\d+\s+(?:Fotos?|Bilder?)|(?:Seite|Page)\s+\d+\s+(?:von|of)\s+\d+|Seite\s+\d+)\s*)+$/i

export function cleanExtractedTextArtifacts(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  const kept = lines.filter((line) => !ARTIFACT_LINE_RE.test(line.trim()))
  const result: string[] = []
  let prevBlank = false

  for (const line of kept) {
    const blank = line.trim().length === 0
    if (blank && prevBlank) continue
    result.push(line)
    prevBlank = blank
  }

  return result.join("\n").trim()
}

/**
 * Gleiche Span-Logik wie `_apply_anonymization_spans_to_segment` (Text-Neubau-PDF),
 * für eine Live-Vorschau im Browser ohne erneuten API-Roundtrip.
 */
export function previewAnonymizedPlainText(
  fullText: string,
  detections: Detection[],
  choices: Record<string, DetectionAction>,
  activeCategories: Set<string>
): string {
  const spans: [number, number, DetectionAction, string][] = []
  for (const d of detections) {
    if (!activeCategories.has(d.category)) continue
    const act = choices[d.id]
    if (!act || act === "ignore") continue
    spans.push([d.start, d.end, act, d.category])
  }
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const n = fullText.length
  const parts: string[] = []
  let i = 0
  for (const [s0, e0, action, cat] of spans) {
    let s = Math.max(0, Math.min(s0, n))
    let e = Math.max(s, Math.min(e0, n))
    if (s < i) s = i
    if (s >= e) continue
    parts.push(fullText.slice(i, s))
    if (action === "redact") {
      parts.push("")
    } else {
      parts.push(PLACEHOLDERS[cat] ?? "[REDACTED]")
    }
    i = e
  }
  parts.push(fullText.slice(i))
  return cleanExtractedTextArtifacts(parts.join(""))
}

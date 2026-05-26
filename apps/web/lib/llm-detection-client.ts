import type { Detection } from "@/lib/api-client"
import type { Category } from "@/app/_pdf_redact_shared/category-filters"

export async function enhanceDetectionsWithLlm(
  text: string,
  categories: Set<Category>,
  detections: Detection[],
  logContext: string
): Promise<Detection[]> {
  const res = await fetch("/api/v1/simple-detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      categories: [...categories],
      detections,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    detections?: Detection[]
    error?: string
    llmWarning?: string
  }

  if (!res.ok) {
    throw new Error(data.error ?? `LLM-Prüfung fehlgeschlagen (${res.status})`)
  }

  if (data.llmWarning) {
    console.warn(`[${logContext}] LLM detection skipped`, data.llmWarning)
  }

  return Array.isArray(data.detections) ? data.detections : detections
}

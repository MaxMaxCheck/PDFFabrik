import { toast } from "sonner"

export const BATCH_COMPRESS_REPORT_FILENAME = "komprimierung-hinweise.txt"

export type BatchCompressFailure = {
  fileName: string
  reason: string
}

export function buildBatchCompressReport(
  failures: BatchCompressFailure[],
  succeeded: number,
  total: number
): string {
  const lines = [
    "PDFFabrik.de — Bilder komprimieren",
    "",
    `Ausgewählt: ${total} Datei(en)`,
    `Erfolgreich komprimiert: ${succeeded}`,
    `Übersprungen: ${failures.length}`,
    "",
  ]

  if (failures.length === 0) {
    lines.push("Alle Dateien wurden erfolgreich komprimiert.")
    return lines.join("\n")
  }

  lines.push("Übersprungene Dateien:", "")
  failures.forEach((f, index) => {
    lines.push(`${index + 1}. ${f.fileName}`)
    lines.push(`   Grund: ${f.reason}`)
    lines.push("")
  })

  return lines.join("\n").trimEnd() + "\n"
}

export function batchReportToZipBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function startBatchCompressToast(total: number): string | number {
  return toast.loading(`0 von ${total} komprimiert…`, { duration: Infinity })
}

export function updateBatchCompressToast(
  toastId: string | number,
  succeeded: number,
  failed: number,
  processed: number,
  total: number
) {
  const parts = [`${succeeded} komprimiert`]
  if (failed > 0) parts.push(`${failed} fehlerhaft`)
  toast.loading(`${parts.join(" · ")} (${processed}/${total})`, {
    id: toastId,
    duration: Infinity,
  })
}

export function finishBatchCompressToast(
  toastId: string | number,
  succeeded: number,
  failed: number,
  zipOk: boolean
) {
  if (!zipOk) {
    toast.error("Keine Bilder konnten komprimiert werden.", { id: toastId })
    return
  }
  if (failed > 0) {
    toast.success(
      `ZIP bereit — ${succeeded} komprimiert, ${failed} fehlerhaft (Details in ${BATCH_COMPRESS_REPORT_FILENAME})`,
      { id: toastId }
    )
    return
  }
  toast.success(`ZIP bereit — ${succeeded} Bilder komprimiert`, { id: toastId })
}

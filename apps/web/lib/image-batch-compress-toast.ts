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

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PdfDropzone } from "@/components/pdf-dropzone"
import {
  readPdfMetadataInfo,
  type PdfMetadataInfoResponse,
} from "@/lib/api-client"
import { markFirstPdfUpload } from "@/lib/site-prefs"
import { useSiteChromeTopLoading } from "@/components/site-chrome-top-loading"
import { Button } from "@workspace/ui/components/button"
import { SITE_CHROME_PAGE_ROOT_CLASS } from "@/lib/site-chrome-layout"
import { cn } from "@workspace/ui/lib/utils"
import { LoadingSpinner } from "@/app/_pdf_redact_shared/category-filters"
import { recordPdfToolUsage } from "@/lib/record-pdf-tool-usage"

const FIELD_ORDER = [
  "format",
  "title",
  "author",
  "subject",
  "keywords",
  "creator",
  "producer",
  "creationDate",
  "modDate",
  "trapped",
  "encryption",
] as const

const FIELD_LABEL: Record<string, string> = {
  format: "Format",
  title: "Titel",
  author: "Autor",
  subject: "Betreff",
  keywords: "Schlagwörter",
  creator: "Erstellt mit (Creator)",
  producer: "Producer",
  creationDate: "Erstellungsdatum (PDF)",
  modDate: "Änderungsdatum (PDF)",
  trapped: "Trapped",
  encryption: "Verschlüsselung (Metadaten-Feld)",
}

function displayValue(v: string | null | undefined): string {
  if (v == null || v === "") {
    return "\u2014"
  }
  return v
}

function orderedStandardEntries(standard: Record<string, string | null>) {
  const keys = new Set(Object.keys(standard))
  const out: { key: string; value: string | null }[] = []
  for (const k of FIELD_ORDER) {
    if (keys.has(k)) {
      out.push({ key: k, value: standard[k] ?? null })
      keys.delete(k)
    }
  }
  for (const k of [...keys].sort()) {
    out.push({ key: k, value: standard[k] ?? null })
  }
  return out
}

export function MetaViewTool() {
  const { setLoadingBar } = useSiteChromeTopLoading()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PdfMetadataInfoResponse | null>(null)
  const [idleFileDragOver, setIdleFileDragOver] = useState(false)

  const onFile = useCallback((f: File) => {
    setFile(f)
    setError(null)
    setData(null)
  }, [])

  const clearAll = useCallback(() => {
    setFile(null)
    setError(null)
    setData(null)
  }, [])

  const run = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await readPdfMetadataInfo(file)
      setData(res)
      markFirstPdfUpload()
      recordPdfToolUsage("metadata_view")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.")
    } finally {
      setLoading(false)
    }
  }, [file])

  const rows = useMemo(
    () => (data ? orderedStandardEntries(data.standard) : []),
    [data]
  )

  const idleHeroCtaMode = file ? "continue" : "select"
  const heroHint =
    "Nur Metadaten (Dokumentinfo, ggf. XMP) und Seitenzahl — kein KI-Scan, keine Anonymisierung."

  useEffect(() => {
    setLoadingBar({ active: loading })
  }, [loading, setLoadingBar])

  useEffect(() => {
    return () => {
      setLoadingBar({ active: false })
    }
  }, [setLoadingBar])

  return (
    <div
      className={cn(
        SITE_CHROME_PAGE_ROOT_CLASS,
        "bg-background text-foreground",
      )}
    >
      <h1 className="sr-only">Metadaten anzeigen (PDF)</h1>

      {error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive lg:px-6">
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingSpinner className="h-9 w-9 border-2 text-primary" />
          <p className="text-base font-medium text-foreground">
            Metadaten werden gelesen
          </p>
        </div>
      ) : data && !error ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
            <div className="shrink-0 border-b border-border bg-background px-3 py-2.5 sm:px-4 lg:px-6">
              <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <p className="min-w-0 text-sm font-medium text-foreground">
                  Ergebnis
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={clearAll}
                >
                  Neue Datei
                </Button>
              </div>
            </div>
            <div className="w-full min-w-0 flex-1 space-y-6 px-3 py-6 sm:px-4 lg:px-6">
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Datei
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {data.filename}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Seiten:{" "}
                  <span className="text-foreground">{data.page_count}</span>
                  {" · "}
                  Verschlüsselt (Datei):{" "}
                  <span className="text-foreground">
                    {data.is_encrypted ? "ja" : "nein"}
                  </span>
                </p>
              </div>

              <div>
                <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Dokumentinfo (/Info)
                </h2>
                <dl
                  className={cn(
                    "mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/20"
                  )}
                >
                  {rows.map(({ key, value }) => (
                    <div
                      key={key}
                      className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4 sm:px-4"
                    >
                      <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:text-sm">
                        {FIELD_LABEL[key] ?? key}
                      </dt>
                      <dd className="min-w-0 font-mono text-sm break-words text-foreground">
                        {displayValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  XMP-Metadaten
                </h2>
                {data.xmp ? (
                  <pre
                    className={cn(
                      "mt-3 max-h-[min(50vh,24rem)] overflow-auto rounded-xl border border-border",
                      "bg-muted/40 p-3 text-xs leading-relaxed text-foreground/90"
                    )}
                  >
                    {data.xmp}
                  </pre>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Kein XMP-Block vorhanden (oder leer).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-y-auto p-3 transition-colors duration-200 [scrollbar-gutter:stable]",
            idleFileDragOver && "bg-sky-200/50 dark:bg-sky-900/30"
          )}
          onDragEnter={(e) => {
            if (!e.dataTransfer.types?.includes("Files")) return
            e.preventDefault()
            setIdleFileDragOver(true)
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types?.includes("Files")) return
            e.preventDefault()
            e.dataTransfer.dropEffect = "copy"
          }}
          onDragLeave={(e) => {
            const next = e.relatedTarget as Node | null
            if (next && e.currentTarget.contains(next)) return
            setIdleFileDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIdleFileDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (!f) return
            if (f.type !== "application/pdf") {
              setError("Nur PDF-Dateien werden unterstützt.")
              return
            }
            onFile(f)
            setError(null)
          }}
        >
          <div className="relative z-[1] flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
            <div className="min-h-0 w-full flex-1">
              <PdfDropzone
                variant="hero"
                className="flex h-full min-h-0 flex-col"
                fileLabel={file?.name ?? ""}
                heroCtaMode={idleHeroCtaMode}
                onContinue={file ? () => void run() : undefined}
                heroHint={heroHint}
                onFile={onFile}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

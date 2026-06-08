"use client"

import { useCallback, useEffect, useState } from "react"
import { PdfDropzone } from "@/components/pdf-dropzone"
import { downloadBlob, stripPdfMetadata } from "@/lib/api-client"
import { markFirstPdfUpload } from "@/lib/site-prefs"
import { useSiteChromeTopLoading } from "@/components/site-chrome-top-loading"
import { Button } from "@workspace/ui/components/button"
import { SITE_CHROME_PAGE_ROOT_CLASS } from "@/lib/site-chrome-layout"
import { cn } from "@workspace/ui/lib/utils"
import { LoadingSpinner } from "@/app/_pdf_redact_shared/category-filters"
import { recordPdfToolUsage } from "@/lib/record-pdf-tool-usage"

function outFilename(name: string) {
  const m = name.trim().toLowerCase().endsWith(".pdf")
    ? name.slice(0, -4)
    : name.replace(/\.[^./]+$/, "")
  return `${m || "dokument"}-ohne-metadaten.pdf`
}

export function MetaStripTool() {
  const { setLoadingBar } = useSiteChromeTopLoading()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastOk, setLastOk] = useState(false)
  const [idleFileDragOver, setIdleFileDragOver] = useState(false)

  const onFile = useCallback((f: File) => {
    setFile(f)
    setError(null)
    setLastOk(false)
  }, [])

  const clearAll = useCallback(() => {
    setFile(null)
    setError(null)
    setLastOk(false)
  }, [])

  const run = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setLastOk(false)
    try {
      const blob = await stripPdfMetadata(file)
      downloadBlob(blob, outFilename(file.name))
      setLastOk(true)
      markFirstPdfUpload()
      recordPdfToolUsage("metadata_strip")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.")
    } finally {
      setLoading(false)
    }
  }, [file])

  const idleHeroCtaMode = file ? "continue" : "select"
  const heroHint =
    "Nur Metadaten entfernen — sichtbarer Inhalt und Layout der PDF bleiben erhalten."

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
        "bg-sidebar text-sidebar-foreground",
      )}
    >
      <h1 className="sr-only">Metadaten löschen (PDF)</h1>

      {error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive lg:px-6">
          {error}
        </div>
      )}

      {lastOk && !error && !loading && (
        <div className="shrink-0 border-b border-primary/25 bg-primary/5 px-4 py-2.5 text-sm text-foreground lg:px-6">
          Download wurde gestartet. Prüfe deinen Download-Ordner.
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
            Metadaten werden entfernt
          </p>
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
          <div
            className={cn(
              "relative z-[1] flex min-h-0 w-full min-w-0 flex-1 flex-col",
              file && "gap-4",
            )}
          >
            {file ? (
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={clearAll}
                >
                  Zurücksetzen
                </Button>
              </div>
            ) : null}
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

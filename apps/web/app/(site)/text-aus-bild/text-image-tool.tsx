"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, CloudUploadIcon } from "@hugeicons/core-free-icons"
import { extractImageText, type ImageTextResponse } from "@/lib/api-client"
import { useSiteChromeTopLoading } from "@/components/site-chrome-top-loading"
import { Button } from "@workspace/ui/components/button"
import { LoadingSpinner } from "@/app/_pdf_redact_shared/category-filters"
import { SITE_CHROME_PAGE_ROOT_CLASS } from "@/lib/site-chrome-layout"
import { cn } from "@workspace/ui/lib/utils"

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "image/bmp",
])

function isSupportedImage(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type)
}

export function ImageTextTool() {
  const { setLoadingBar } = useSiteChromeTopLoading()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<ImageTextResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const onFile = useCallback((f: File) => {
    if (!isSupportedImage(f)) {
      setError("Nur PNG, JPG, WEBP, TIFF und BMP werden unterstützt.")
      return
    }
    setError(null)
    setResult(null)
    setCopied(false)
    setFile(f)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
  }, [])

  const clearAll = useCallback(() => {
    setFile(null)
    setResult(null)
    setError(null)
    setCopied(false)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const run = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const data = await extractImageText(file)
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Texterkennung fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }, [file])

  const copyText = useCallback(async () => {
    if (!result?.text) return
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
  }, [result])

  const fileLabel = file?.name ?? ""
  const hasResult = Boolean(result)
  const extractedText = result?.text ?? ""

  const imageMeta = useMemo(() => {
    if (!file) return ""
    const mb = file.size / (1024 * 1024)
    return `${file.type || "Bild"} · ${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
  }, [file])

  useEffect(() => {
    setLoadingBar({ active: loading })
  }, [loading, setLoadingBar])

  useEffect(() => {
    return () => {
      setLoadingBar({ active: false })
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl, setLoadingBar])

  return (
    <div
      className={cn(
        SITE_CHROME_PAGE_ROOT_CLASS,
        "bg-background text-foreground",
      )}
    >
      <h1 className="sr-only">Text aus Bild erkennen</h1>

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
            Text wird erkannt
          </p>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Tesseract liest das Bild über die Backend-API.
          </p>
        </div>
      ) : hasResult ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4 lg:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {result?.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                Sprache: {result?.language}
                {result?.warning ? " · Hinweis von Tesseract vorhanden" : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={copyText}
                disabled={!extractedText}
              >
                {copied ? "Kopiert" : "Kopieren"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={clearAll}
              >
                Neues Bild
              </Button>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
            <div className="min-h-0 overflow-auto border-b border-border bg-muted/30 p-3 lg:border-r lg:border-b-0">
              {previewUrl ? (
                <div
                  className="h-full min-h-[18rem] w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${previewUrl}")` }}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-h-0 overflow-auto p-3 sm:p-4 lg:p-6">
              {extractedText ? (
                <pre className="min-h-full rounded-md border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                  {extractedText}
                </pre>
              ) : (
                <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Kein Text erkannt.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-y-auto p-3 transition-colors duration-200 [scrollbar-gutter:stable]",
            dragOver && "bg-sky-200/50 dark:bg-sky-900/30"
          )}
          onDragEnter={(e) => {
            if (!e.dataTransfer.types?.includes("Files")) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types?.includes("Files")) return
            e.preventDefault()
            e.dataTransfer.dropEffect = "copy"
          }}
          onDragLeave={(e) => {
            const next = e.relatedTarget as Node | null
            if (next && e.currentTarget.contains(next)) return
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) onFile(f)
          }}
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pb-3">
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0"
                onClick={clearAll}
              >
                Zurücksetzen
              </Button>
            ) : null}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
            <label
              className={cn(
                "flex min-h-[22rem] cursor-pointer flex-col items-center justify-center gap-5 border-2 border-dashed px-6 py-8 text-center transition-colors",
                "border-sky-400/55 bg-sky-50/95 hover:border-sky-500/70 hover:bg-sky-100/80 dark:border-sky-500/40 dark:bg-sky-950/30 dark:hover:bg-sky-950/50"
              )}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/tiff,image/bmp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0]
                  if (f) onFile(f)
                  e.currentTarget.value = ""
                }}
              />
              <HugeiconsIcon
                icon={CloudUploadIcon}
                className="size-14 text-sky-600 dark:text-sky-400"
                strokeWidth={1.25}
              />
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  {fileLabel || "Bild auswählen"}
                </p>
                {imageMeta ? (
                  <p className="text-xs text-muted-foreground">{imageMeta}</p>
                ) : (
                  <p className="text-sm text-sky-900/80 dark:text-sky-100/80">
                    PNG, JPG, WEBP, TIFF oder BMP hierher ziehen oder auswählen.
                  </p>
                )}
              </div>
              <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm dark:bg-sky-500">
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-4"
                  strokeWidth={2}
                />
                {file ? "Anderes Bild" : "Bild auswählen"}
              </div>
            </label>

            <div className="flex min-h-[22rem] flex-col overflow-hidden border border-border bg-muted/30">
              {previewUrl ? (
                <>
                  <div
                    className="min-h-0 flex-1 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url("${previewUrl}")` }}
                    aria-hidden
                  />
                  <div className="shrink-0 border-t border-border p-3">
                    <Button
                      type="button"
                      size="lg"
                      className="h-11 w-full rounded-md"
                      onClick={() => void run()}
                    >
                      Text erkennen
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  Vorschau erscheint nach der Auswahl.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { PdfDropzone } from "@/components/pdf-dropzone"
import {
  compressPdf,
  downloadBlob,
  type CompressResult,
} from "@/lib/api-client"
import { markFirstPdfUpload } from "@/lib/site-prefs"
import { useSiteChromeTopLoading } from "@/components/site-chrome-top-loading"
import { Button } from "@workspace/ui/components/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"
import { PdfRedactSidebarInset } from "@/app/_pdf_redact_shared/pdf-redact-sidebar-inset"
import { PdfScrollViewer } from "@/components/pdf-scroll-viewer"
import { cn } from "@workspace/ui/lib/utils"
import { LoadingSpinner } from "@/app/_pdf_redact_shared/category-filters"

type Step = "idle" | "selected" | "compressing" | "done"

const QUALITY_MIN = 20
const QUALITY_MAX = 95
const QUALITY_DEFAULT = 72

const PRESETS = [
  { label: "Max.", value: 45, hint: "Stärkste Komprimierung" },
  { label: "Mittel", value: 72, hint: "Ausgewogen" },
  { label: "Hoch", value: 88, hint: "Beste Qualität" },
] as const

function fmtBytes(bytes: number): string {
  if (bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function outFilename(name: string) {
  const base = name.trim().toLowerCase().endsWith(".pdf")
    ? name.slice(0, -4)
    : name.replace(/\.[^./]+$/, "")
  return `${base || "dokument"}-komprimiert.pdf`
}

export function CompressPdfTool() {
  const { setLoadingBar } = useSiteChromeTopLoading()
  const [step, setStep] = useState<Step>("idle")
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [quality, setQuality] = useState(QUALITY_DEFAULT)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [idleFileDragOver, setIdleFileDragOver] = useState(false)
  const [layoutEnter, setLayoutEnter] = useState(false)

  const showSplit = step === "selected" || step === "compressing"

  useEffect(() => {
    if (!showSplit) {
      setLayoutEnter(false)
      return
    }
    setLayoutEnter(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setLayoutEnter(true))
    })
    return () => cancelAnimationFrame(id)
  }, [showSplit])

  const onFile = useCallback((f: File) => {
    setFile(f)
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setError(null)
    setResult(null)
    setStep("selected")
  }, [])

  const clearAll = useCallback(() => {
    setFile(null)
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setError(null)
    setResult(null)
    setStep("idle")
    setQuality(QUALITY_DEFAULT)
  }, [])

  const run = useCallback(async () => {
    if (!file) return
    setStep("compressing")
    setError(null)
    try {
      const r = await compressPdf(file, quality)
      downloadBlob(r.blob, outFilename(file.name))
      setResult(r)
      setStep("done")
      markFirstPdfUpload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.")
      setStep("selected")
    }
  }, [file, quality])

  useEffect(() => {
    setLoadingBar({ active: step === "compressing" })
  }, [step, setLoadingBar])

  useEffect(
    () => () => {
      setLoadingBar({ active: false })
    },
    [setLoadingBar]
  )
  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    },
    [fileUrl]
  )

  const savings =
    result && result.originalSize > 0
      ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
      : null

  const wrapClass = cn(
    "flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground",
  )

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className={wrapClass}>
        <h1 className="sr-only">PDF komprimieren</h1>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <span className="text-4xl" aria-hidden>
              ✓
            </span>
          </div>
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold">Download gestartet</h2>
            {savings !== null && savings > 0 ? (
              <p className="mt-2 text-muted-foreground">
                {fmtBytes(result!.originalSize)} →{" "}
                {fmtBytes(result!.compressedSize)}
                <span className="ml-1.5 font-semibold text-green-600 dark:text-green-400">
                  −{savings} %
                </span>
              </p>
            ) : (
              <p className="mt-2 text-muted-foreground">
                PDF war bereits optimal komprimiert.
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button
              type="button"
              size="lg"
              onClick={() => {
                if (result)
                  downloadBlob(result.blob, outFilename(file?.name ?? ""))
              }}
            >
              Erneut herunterladen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={clearAll}
              className="min-w-48"
            >
              Neue PDF
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Split: selected + compressing ───────────────────────────────────────────
  if (showSplit) {
    return (
      <div className={wrapClass}>
        <h1 className="sr-only">PDF komprimieren</h1>
        {error && (
          <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive lg:px-6">
            {error}
          </div>
        )}
        <SidebarProvider className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-canvas">
          <div className="flex min-h-0 flex-1 overflow-x-hidden overflow-y-hidden bg-transparent lg:flex-row">
            {/* Center: PDF viewer */}
            <PdfRedactSidebarInset
              className={cn(
                "relative flex min-h-0 min-w-0 flex-[3] flex-col transition duration-300 ease-out will-change-transform lg:flex-1",
                layoutEnter
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-[0.99] opacity-0"
              )}
            >
              <div className="flex min-h-0 w-full flex-1 flex-col items-center">
                {fileUrl && (
                  <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-sidebar">
                    <PdfScrollViewer fileUrl={fileUrl} />
                    {step === "compressing" && (
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-sidebar/60 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-3">
                          <LoadingSpinner className="h-9 w-9 border-2 text-primary" />
                          <p className="text-sm font-medium">
                            PDF wird komprimiert …
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </PdfRedactSidebarInset>

            {/* Right sidebar */}
            <div
              className={cn(
                "flex h-auto min-h-0 w-full max-w-none min-w-0 shrink-0 flex-col transition duration-300 ease-out will-change-transform",
                "lg:h-full lg:max-h-none lg:w-[min(100%,260px)] lg:max-w-[280px] lg:min-w-0 lg:shrink-0 lg:self-stretch xl:w-[260px]",
                layoutEnter
                  ? "translate-x-0 translate-y-0 opacity-100"
                  : "pointer-events-none translate-x-full opacity-0 max-lg:translate-x-0 max-lg:translate-y-3"
              )}
            >
              <Sidebar
                side="right"
                collapsible="none"
                className="flex h-full min-h-0 w-full !max-w-none min-w-0 flex-col bg-transparent text-foreground"
              >
                {/* Compress button */}
                <div className="shrink-0 border-b border-sidebar-border bg-sidebar-accent p-3">
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full min-w-0 rounded-md text-base font-semibold shadow-md"
                    onClick={() => void run()}
                    disabled={step === "compressing"}
                  >
                    {step === "compressing" ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner />
                        Komprimiere …
                      </span>
                    ) : (
                      "PDF komprimieren"
                    )}
                  </Button>
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sidebar-accent">
                  <SidebarHeader className="shrink-0 gap-0 space-y-4 px-3 py-3">
                    {/* Quality section */}
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Qualität
                      </h2>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        Niedrigere Qualität → stärkere Komprimierung der Bilder
                      </p>
                    </div>

                    {/* Slider */}
                    <div className="space-y-1.5">
                      <input
                        type="range"
                        min={QUALITY_MIN}
                        max={QUALITY_MAX}
                        step={1}
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        disabled={step === "compressing"}
                        className="w-full accent-primary disabled:opacity-50"
                        aria-label="Bildqualität"
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Stärker</span>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {quality}
                        </span>
                        <span>Besser</span>
                      </div>
                    </div>

                    {/* Preset chips */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          title={p.hint}
                          onClick={() => setQuality(p.value)}
                          disabled={step === "compressing"}
                          className={cn(
                            "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
                            quality === p.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </SidebarHeader>

                  <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-hidden overflow-y-auto px-3 py-3">
                    {/* File info */}
                    <div className="space-y-1 rounded-md border border-sidebar-border bg-sidebar/60 p-3">
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        Datei
                      </p>
                      <p className="truncate text-xs font-medium text-foreground">
                        {file?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtBytes(file?.size ?? 0)}
                      </p>
                    </div>

                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={clearAll}
                        disabled={step === "compressing"}
                      >
                        Andere PDF wählen
                      </Button>
                    </div>
                  </SidebarContent>
                </div>
              </Sidebar>
            </div>
          </div>
        </SidebarProvider>
      </div>
    )
  }

  // ── Idle ────────────────────────────────────────────────────────────────────
  return (
    <div className={wrapClass}>
      <h1 className="sr-only">PDF komprimieren</h1>
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
        }}
      >
        {error && (
          <div className="mb-3 shrink-0 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="relative z-[1] flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
          <div className="min-h-0 w-full flex-1">
            <PdfDropzone
              variant="hero"
              className="flex h-full min-h-0 flex-col"
              fileLabel=""
              heroCtaMode="select"
              heroHint="PDF auswählen — danach Qualität einstellen und komprimieren."
              onFile={onFile}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

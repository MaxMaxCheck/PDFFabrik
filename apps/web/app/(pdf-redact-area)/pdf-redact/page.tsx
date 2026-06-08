"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { PdfComparisonViewer } from "@/components/pdf-comparison-viewer"
import { PdfDropzone } from "@/components/pdf-dropzone"
import { PdfThumbnailStrip } from "@/components/pdf-thumbnail-strip"
import {
  PdfScrollViewer,
  type PdfScrollViewerHandle,
} from "@/components/pdf-scroll-viewer"
import { DetectionReview } from "@/components/detection-review"
import {
  uploadPdf,
  anonymizePdf,
  base64PdfObjectUrl,
  downloadBase64Pdf,
  type DetectionAction,
  type UploadResponse,
} from "@/lib/api-client"
import { enhanceDetectionsWithLlm } from "@/lib/llm-detection-client"
import { Button } from "@workspace/ui/components/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"
import { PdfRedactSidebarInset } from "@/app/_pdf_redact_shared/pdf-redact-sidebar-inset"
import { cn } from "@workspace/ui/lib/utils"
import { useAppWorkspaceActions } from "@/components/app-workspace-actions"
import { useSiteChromeTopLoading } from "@/components/site-chrome-top-loading"
import { SITE_CHROME_PAGE_ROOT_CLASS } from "@/lib/site-chrome-layout"
import { markFirstPdfUpload } from "@/lib/site-prefs"
import { recordPdfToolUsage } from "@/lib/record-pdf-tool-usage"
import { usePdfToolAccess } from "@/hooks/use-pdf-tool-access"
import {
  ALL_CATEGORIES,
  type Category,
  CategoryFilterChips,
  CategoryFilters,
  LoadingSpinner,
} from "@/app/_pdf_redact_shared/category-filters"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type Step = "idle" | "uploading" | "review" | "anonymizing" | "done"

const CATEGORY_FILTERS_STORAGE_KEY = "pdffabrik.app.category-filters.v1"

function anonymizePreviewSignature(
  detections: UploadResponse["detections"],
  choices: Record<string, DetectionAction>,
  activeCategories: Set<Category>
) {
  return JSON.stringify({
    choices: Object.entries(choices).sort(([a], [b]) => a.localeCompare(b)),
    activeCategories: [...activeCategories].sort(),
    detections: detections.map((d) => [
      d.id,
      d.category,
      d.value,
      d.start,
      d.end,
    ]),
  })
}

export default function Page() {
  const { setLoadingBar } = useSiteChromeTopLoading()
  const { registerNewSession, setNewSessionActionVisible } =
    useAppWorkspaceActions()
  const [step, setStep] = useState<Step>("idle")
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [choices, setChoices] = useState<Record<string, DetectionAction>>({})
  const [fileName, setFileName] = useState("")
  const [lastPdf, setLastPdf] = useState<string | null>(null)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewSignature, setPreviewSignature] = useState("")
  const [previewGenerating, setPreviewGenerating] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [activePdfPage, setActivePdfPage] = useState(1)
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    () => new Set()
  )
  const [categoryFiltersHydrated, setCategoryFiltersHydrated] = useState(false)
  const idleLayoutRef = useRef<HTMLDivElement>(null)
  /** Ganzer Idle-Bereich: leichter Blauton beim Ziehen einer Datei */
  const [idleFileDragOver, setIdleFileDragOver] = useState(false)
  /** Datei schon gewählt, Filter fehlen noch — bleibt erhalten (Shake), danach „Weiter“. */
  const [pendingIdleFile, setPendingIdleFile] = useState<File | null>(null)
  /** Einstieg: linke / mittlere / rechte Spalte sliden 300ms rein */
  const [layoutEnter, setLayoutEnter] = useState(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const pdfViewerRef = useRef<PdfScrollViewerHandle>(null)
  const { access, ensureCanStart, refreshAccess } =
    usePdfToolAccess("anonymize_full")

  const idleFilterCountSuffix =
    activeCategories.size < ALL_CATEGORIES.length
      ? ` (${activeCategories.size})`
      : ""

  const handleSelectPdfPage = useCallback((page: number) => {
    setActivePdfPage(page)
    pdfViewerRef.current?.scrollToPage(page)
  }, [])

  const revokePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPreviewPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPreviewPdf(null)
    setPreviewSignature("")
    setPreviewError(null)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CATEGORY_FILTERS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) {
          const next = new Set<Category>()
          for (const c of parsed) {
            if (ALL_CATEGORIES.includes(c as Category)) {
              next.add(c as Category)
            }
          }
          setActiveCategories(next)
        }
      }
    } catch {
      /* ignore */
    }
    setCategoryFiltersHydrated(true)
  }, [])

  useEffect(() => {
    if (!categoryFiltersHydrated) return
    try {
      localStorage.setItem(
        CATEGORY_FILTERS_STORAGE_KEY,
        JSON.stringify([...activeCategories].sort())
      )
    } catch {
      /* quota */
    }
  }, [activeCategories, categoryFiltersHydrated])

  const toggleCategory = useCallback(
    (cat: Category) => {
      setActiveCategories((prev) => {
        const next = new Set(prev)
        const wasActive = next.has(cat)
        if (wasActive) {
          next.delete(cat)
        } else {
          next.add(cat)
        }

        if (uploadResult) {
          setChoices((c) => {
            const updated = { ...c }
            for (const d of uploadResult.detections) {
              if (d.category === cat) {
                updated[d.id] = wasActive ? "ignore" : "redact"
              }
            }
            return updated
          })
        }

        return next
      })
    },
    [uploadResult]
  )

  const playFilterGateShake = useCallback(() => {
    const el = idleLayoutRef.current
    if (!el) return
    el.classList.remove("app-idle-shake-run")
    void el.offsetWidth
    el.classList.add("app-idle-shake-run")
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setFileName(file.name)
      setCurrentFile(file)
      setActivePdfPage(1)
      setStep("uploading")
      setProgress(0)
      setProgressStep("")

      try {
        const result = await uploadPdf(file, "anonymize_full", (stepLabel, prog) => {
          setProgressStep(stepLabel)
          setProgress(prog)
        })
        let finalResult: UploadResponse = result

        if (!result.hasSelectableText) {
          setError(result.message ?? "Kein Text erkannt.")
          setStep("idle")
          setCurrentFile(null)
          return
        }

        try {
          setProgressStep("Erkennung wird abgeschlossen …")
          setProgress((prev) => Math.max(prev, 92))
          const enhancedDetections = await enhanceDetectionsWithLlm(
            result.text,
            activeCategories,
            result.detections,
            "/pdf-redact"
          )
          finalResult = {
            ...result,
            detections: enhancedDetections,
          }
        } catch (llmErr) {
          console.warn(
            "[/pdf-redact] LLM detection fallback to base detections",
            llmErr
          )
        }

        setUploadResult(finalResult)
        setPreviewPdf(null)
        setPreviewPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        setPreviewSignature("")
        setPreviewError(null)

        const initial: Record<string, DetectionAction> = {}
        for (const d of finalResult.detections) {
          initial[d.id] = activeCategories.has(d.category as Category)
            ? "redact"
            : "ignore"
        }
        setChoices(initial)
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(file)
        })
        recordPdfToolUsage("anonymize_full")
        setStep("review")
        void refreshAccess()
        markFirstPdfUpload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Upload")
        setStep("idle")
        revokePreview()
        setCurrentFile(null)
      }
    },
    [revokePreview, activeCategories]
  )

  const tryBeginUpload = useCallback(
    (file: File) => {
      const gate = ensureCanStart()
      if (!gate.ok) {
        if (gate.message) setError(gate.message)
        return
      }
      if (activeCategories.size === 0) {
        setPendingIdleFile(file)
        setError("Bitte mindestens einen Filter aktivieren.")
        playFilterGateShake()
        return
      }
      setPendingIdleFile(null)
      setError(null)
      void handleFile(file)
    },
    [activeCategories, ensureCanStart, playFilterGateShake, handleFile]
  )

  const handleBeforeSelect = useCallback(() => {
    const gate = ensureCanStart()
    if (!gate.ok && gate.message) {
      setError(gate.message)
    }
    return gate.ok
  }, [ensureCanStart])

  const continuePendingUpload = useCallback(() => {
    if (pendingIdleFile && activeCategories.size > 0) {
      tryBeginUpload(pendingIdleFile)
    }
  }, [pendingIdleFile, activeCategories, tryBeginUpload])

  const handleSelectAll = useCallback(
    (action: DetectionAction) => {
      if (!uploadResult) return
      const next: Record<string, DetectionAction> = {}
      for (const d of uploadResult.detections) {
        if (activeCategories.has(d.category as Category)) {
          next[d.id] = action
        } else {
          next[d.id] = "ignore"
        }
      }
      setChoices(next)
    },
    [uploadResult, activeCategories]
  )

  useEffect(() => {
    if (step !== "review" || !uploadResult || !currentFile) return
    const previewActiveCount = uploadResult.detections.filter(
      (d) =>
        activeCategories.has(d.category as Category) &&
        choices[d.id] !== "ignore"
    ).length
    if (Object.keys(choices).length === 0 || previewActiveCount === 0) {
      setPreviewPdf(null)
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPreviewSignature("")
      return
    }

    const signature = anonymizePreviewSignature(
      uploadResult.detections,
      choices,
      activeCategories
    )
    if (signature === previewSignature && previewPdf) return

    let cancelled = false
    const timer = window.setTimeout(() => {
      setPreviewGenerating(true)
      setPreviewError(null)
      void anonymizePdf(
        currentFile,
        uploadResult.detections,
        choices,
        undefined,
        {
          ocrUsed: uploadResult.ocrUsed === true,
          activeCategories: [...activeCategories],
        }
      )
        .then(({ pdf }) => {
          if (cancelled) return
          const url = base64PdfObjectUrl(pdf)
          setPreviewPdf(pdf)
          setPreviewPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
          setPreviewSignature(signature)
        })
        .catch((err) => {
          if (!cancelled) {
            setPreviewError(
              err instanceof Error
                ? err.message
                : "Vorschau konnte nicht erzeugt werden."
            )
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewGenerating(false)
        })
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    step,
    uploadResult,
    currentFile,
    choices,
    activeCategories,
    previewPdf,
    previewSignature,
  ])

  const handleAnonymize = useCallback(async () => {
    if (!uploadResult || !currentFile) return
    setError(null)
    setProgress(0)
    setProgressStep("Wird vorbereitet …")
    setStep("anonymizing")

    try {
      const signature = anonymizePreviewSignature(
        uploadResult.detections,
        choices,
        activeCategories
      )
      if (previewPdf && previewSignature === signature) {
        setLastPdf(previewPdf)
        setStep("done")
        return
      }

      const { pdf } = await anonymizePdf(
        currentFile,
        uploadResult.detections,
        choices,
        (stepLabel, prog) => {
          setProgressStep(stepLabel)
          setProgress(prog)
        },
        {
          ocrUsed: uploadResult.ocrUsed === true,
          activeCategories: [...activeCategories],
        }
      )
      setLastPdf(pdf)
      setStep("done")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Anonymisierung fehlgeschlagen"
      )
      setStep("review")
    }
  }, [
    uploadResult,
    currentFile,
    choices,
    activeCategories,
    previewPdf,
    previewSignature,
  ])

  const handleDownload = useCallback(() => {
    if (lastPdf) downloadBase64Pdf(lastPdf, `anonymisiert_${fileName}`)
  }, [lastPdf, fileName])

  const handleViewPdf = useCallback(() => {
    if (!lastPdf) return
    const url = base64PdfObjectUrl(lastPdf)
    window.open(url, "_blank", "noopener,noreferrer")
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }, [lastPdf])

  const handleReset = useCallback(() => {
    setStep("idle")
    setError(null)
    setUploadResult(null)
    setCurrentFile(null)
    setChoices({})
    setLastPdf(null)
    setActivePdfPage(1)
    revokePreview()
    setFileName("")
    setPendingIdleFile(null)
  }, [revokePreview])

  useEffect(() => {
    registerNewSession(handleReset)
    return () => {
      registerNewSession(null)
      setNewSessionActionVisible(false)
    }
  }, [registerNewSession, handleReset, setNewSessionActionVisible])

  const showNewSessionInChrome =
    step !== "idle" || pendingIdleFile != null || Boolean(previewUrl)

  useEffect(() => {
    setNewSessionActionVisible(showNewSessionInChrome)
  }, [showNewSessionInChrome, setNewSessionActionVisible])

  // Only detections whose category is currently active
  const visibleDetections = uploadResult
    ? uploadResult.detections.filter((d) =>
        activeCategories.has(d.category as Category)
      )
    : []

  const activeCount = visibleDetections.filter(
    (d) => choices[d.id] !== "ignore"
  ).length

  const idleHeroCtaMode: "select" | "replace" | "continue" = !pendingIdleFile
    ? "select"
    : activeCategories.size > 0
      ? "continue"
      : "replace"

  const idleHeroHint =
    idleHeroCtaMode === "continue"
      ? "Tippe „Weiter“, um die Analyse zu starten, oder ersetze die Datei durch Tippen ins Feld."
      : idleHeroCtaMode === "replace"
        ? "Wähle oben mindestens einen Filter; danach erscheint der Button „Weiter“."
        : "Wähle oben mindestens einen Filter. Ohne Filter startet die Analyse nicht."

  const accessHint =
    access?.authenticated && !access.canUse
      ? access.reason === "pro_required"
        ? "Nur Pro: PDF Schwärzen ist in deinem Tarif nicht enthalten."
        : access.reason === "daily_limit_reached"
          ? "Free-Plan: heute bereits genutzt."
          : null
      : null

  const showFullWorkspace =
    Boolean(previewUrl) && (step === "review" || step === "anonymizing")

  useEffect(() => {
    if (!showFullWorkspace) {
      setLayoutEnter(false)
      return
    }
    setLayoutEnter(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setLayoutEnter(true))
    })
    return () => cancelAnimationFrame(id)
  }, [showFullWorkspace])

  useEffect(() => {
    const busy = step === "uploading" || step === "anonymizing"
    setLoadingBar({ active: busy })
  }, [step, setLoadingBar])

  useEffect(() => {
    return () => {
      setLoadingBar({ active: false })
    }
  }, [setLoadingBar])

  useEffect(() => {
    if (
      activeCategories.size > 0 &&
      error === "Bitte mindestens einen Filter aktivieren."
    ) {
      setError(null)
    }
  }, [activeCategories, error])

  return (
    <div className={cn(SITE_CHROME_PAGE_ROOT_CLASS, "bg-sidebar text-sidebar-foreground")}>
      <h1 className="sr-only">PDF Schwärzen</h1>

      {error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive lg:px-6">
          {error}
        </div>
      )}

      {uploadResult?.ocrUsed &&
        (step === "review" || step === "anonymizing") && (
          <div className="shrink-0 border-b border-border bg-blue-500/10 px-4 py-2 text-center text-xs text-muted-foreground lg:px-6">
            Text per OCR (Tesseract) erkannt — Schwärzung nutzt dieselbe
            OCR-Geometrie wie die Analyse.
          </div>
        )}

      {step === "uploading" ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingSpinner className="h-9 w-9 border-2 text-primary" />
          <p className="text-base font-medium text-foreground">
            PDF wird geladen
          </p>
          {progressStep ? (
            <p className="max-w-md text-center text-sm text-muted-foreground">
              {progressStep}
            </p>
          ) : null}
        </div>
      ) : step === "done" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <span className="text-4xl" aria-hidden>
              ✓
            </span>
          </div>
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold">Fertig</h2>
            <p className="mt-2 text-muted-foreground">
              Die anonymisierte PDF ist bereit zum Download.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" size="lg" onClick={handleViewPdf}>
                PDF anschauen
              </Button>
              <Button type="button" size="lg" onClick={handleDownload}>
                PDF herunterladen
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleReset}
              className="min-w-48"
            >
              Neue PDF
            </Button>
          </div>
        </div>
      ) : showFullWorkspace ? (
        <SidebarProvider className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-canvas">
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-transparent lg:flex-row">
            <div
              className={cn(
                "h-auto min-h-0 w-full max-w-none shrink-0 transition duration-300 ease-out will-change-transform",
                "max-h-[30vh]",
                "lg:h-full lg:max-h-none lg:w-[min(100%,200px)] lg:max-w-[220px] lg:min-w-0 lg:shrink-0 lg:self-stretch xl:w-[130px]",
                layoutEnter
                  ? "translate-x-0 translate-y-0 opacity-100"
                  : "pointer-events-none -translate-x-full opacity-0 max-lg:translate-x-0 max-lg:-translate-y-3"
              )}
            >
              <Sidebar
                side="left"
                collapsible="none"
                className="flex h-full min-h-0 w-full !max-w-none min-w-0 flex-col bg-transparent text-foreground"
              >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sidebar-accent">
                  <SidebarHeader className="shrink-0 gap-0 border-b border-sidebar-border px-2 py-1.5">
                    <p className="text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Seiten
                    </p>
                  </SidebarHeader>
                  <SidebarContent className="min-h-0 gap-0 overflow-x-hidden overflow-y-auto px-0 py-2">
                    <PdfThumbnailStrip
                      fileUrl={previewUrl!}
                      activePage={activePdfPage}
                      onSelectPage={handleSelectPdfPage}
                    />
                  </SidebarContent>
                </div>
              </Sidebar>
            </div>

            <PdfRedactSidebarInset
              className={cn(
                "relative flex min-h-0 min-w-0 flex-[3] flex-col transition duration-300 ease-out will-change-transform lg:flex-1",
                layoutEnter
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-[0.99] opacity-0"
              )}
            >
              <div className="flex min-h-0 w-full flex-1 flex-col items-center">
                {previewUrl && (
                  <div className="relative flex min-h-0 w-full flex-1 flex-col self-center overflow-hidden bg-sidebar">
                    {previewPdfUrl ? (
                      <PdfComparisonViewer
                        beforeUrl={previewUrl}
                        afterUrl={previewPdfUrl}
                      />
                    ) : (
                      <PdfScrollViewer
                        ref={pdfViewerRef}
                        fileUrl={previewUrl}
                        onVisiblePageChange={setActivePdfPage}
                      />
                    )}
                    {(previewGenerating || previewError) &&
                      step === "review" && (
                        <div className="absolute top-3 left-1/2 z-20 max-w-[min(90%,32rem)] -translate-x-1/2 rounded-md border border-border bg-background/95 px-3 py-2 text-center text-xs shadow">
                          {previewGenerating
                            ? "Geschwärzte Vorschau wird erstellt …"
                            : previewError}
                        </div>
                      )}
                    {step === "anonymizing" && (
                      <div className="pointer-events-none absolute inset-0 z-20 ring-2 ring-primary/20 ring-inset" />
                    )}
                  </div>
                )}
              </div>
            </PdfRedactSidebarInset>

            <div
              className={cn(
                "flex h-auto min-h-0 w-full max-w-none min-w-0 shrink-0 flex-col transition duration-300 ease-out will-change-transform",
                "lg:h-full lg:max-h-none lg:w-[min(100%,240px)] lg:max-w-[260px] lg:min-w-0 lg:shrink-0 lg:self-stretch xl:w-[260px]",
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
                {(step === "review" || step === "anonymizing") && (
                  <div className="shrink-0 border-b border-sidebar-border bg-sidebar-accent p-3">
                    <Button
                      type="button"
                      size="lg"
                      className="h-12 w-full min-w-0 rounded-md text-base font-semibold shadow-md"
                      onClick={handleAnonymize}
                      disabled={step === "anonymizing" || activeCount === 0}
                    >
                      {step === "anonymizing" ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner />
                          Anonymisiere …
                        </span>
                      ) : previewPdf ? (
                        "Ergebnis übernehmen"
                      ) : (
                        "Schwärzen"
                      )}
                    </Button>
                    {step === "review" &&
                      activeCount === 0 &&
                      visibleDetections.length > 0 && (
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          Wähle mindestens eine Fundstelle aus oder setze
                          Aktionen nicht auf „Ignorieren“.
                        </p>
                      )}
                  </div>
                )}

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sidebar-accent">
                  <SidebarHeader className="shrink-0 gap-0 space-y-2.5 px-3 py-2.5">
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-sm leading-tight font-semibold text-foreground">
                        Erkannte Inhalte
                      </h2>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {uploadResult && activeCount > 0
                          ? `${activeCount} von ${visibleDetections.length} werden übernommen`
                          : "Keine aktive Auswahl"}
                      </p>
                    </div>
                    <CategoryFilters
                      activeCategories={activeCategories}
                      onToggle={toggleCategory}
                      disabled={step === "anonymizing"}
                    />
                  </SidebarHeader>
                  <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-hidden overflow-y-auto px-3 py-3">
                    {uploadResult ? (
                      <>
                        <DetectionReview
                          detections={visibleDetections}
                          choices={choices}
                          onChange={setChoices}
                          onSelectAll={handleSelectAll}
                          disabled={step === "anonymizing"}
                          variant="sidebar"
                        />
                        {step === "anonymizing" && (
                          <div
                            className="mt-4 rounded-md border border-border/60 bg-background/60 p-4"
                            role="status"
                            aria-live="polite"
                            aria-busy="true"
                          >
                            <p className="text-sm leading-snug font-medium text-foreground">
                              {progressStep || "Anonymisiere …"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                              {Math.min(100, Math.max(0, Math.round(progress)))}
                              &nbsp;% Fortschritt
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Bei vielen Fundstellen oder großen PDFs kann die
                              Verarbeitung noch eine Weile dauern.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="px-2 py-10 text-center text-sm text-muted-foreground">
                        Analyse läuft …
                      </p>
                    )}
                  </SidebarContent>
                </div>
              </Sidebar>
            </div>
          </div>
        </SidebarProvider>
      ) : (
        <div
          ref={idleLayoutRef}
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-y-auto p-3 transition-colors duration-200 max-lg:p-0",
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
            const file = e.dataTransfer.files?.[0]
            if (!file) return
            if (file.type !== "application/pdf") {
              setError("Nur PDF-Dateien werden unterstützt.")
              return
            }
            tryBeginUpload(file)
          }}
        >
          <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col gap-4 max-lg:gap-3 max-lg:p-3">
            <div className="w-full shrink-0 self-start">
              <div className="hidden md:block">
                <CategoryFilters
                  activeCategories={activeCategories}
                  onToggle={toggleCategory}
                  collapsible={false}
                  chipListId="app-idle-inline-filters"
                />
              </div>
              <div className="md:hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 w-full justify-center rounded-md font-medium"
                  onClick={() => setFilterDialogOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={filterDialogOpen}
                  aria-controls="app-idle-filter-dialog"
                >
                  Filter{idleFilterCountSuffix}
                </Button>
                <Dialog
                  open={filterDialogOpen}
                  onOpenChange={setFilterDialogOpen}
                >
                  <DialogContent className="max-w-md" showCloseButton>
                    <DialogHeader>
                      <DialogTitle>Filter</DialogTitle>
                      <DialogDescription>
                        Wähle, welche Kategorien erkannt und bearbeitet werden
                        sollen. Mindestens eine Kategorie muss aktiv sein.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="pt-1">
                      <CategoryFilterChips
                        listId="app-idle-filter-dialog"
                        activeCategories={activeCategories}
                        onToggle={toggleCategory}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="min-h-0 w-full flex-1">
              <PdfDropzone
                variant="hero"
                className="flex h-full min-h-0 flex-col"
                fileLabel={pendingIdleFile?.name ?? ""}
                onBeforeSelect={handleBeforeSelect}
                heroCtaMode={idleHeroCtaMode}
                onContinue={
                  idleHeroCtaMode === "continue"
                    ? continuePendingUpload
                    : undefined
                }
                heroHint={accessHint ? `${idleHeroHint} ${accessHint}` : idleHeroHint}
                onFile={(f) => {
                  tryBeginUpload(f)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

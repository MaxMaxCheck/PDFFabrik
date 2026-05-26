"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { TextSideBySideCompare } from "@/components/text-side-by-side-compare"
import { PdfDropzone } from "@/components/pdf-dropzone"
import { DetectionReview } from "@/components/detection-review"
import {
  uploadPdf,
  anonymizePdf,
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
import { useAppWorkspaceActions } from "@/components/app-workspace-actions"
import { useSiteChromeTopLoading } from "@/components/site-chrome-top-loading"
import { useSmoothedUploadProgress } from "@/hooks/use-smoothed-upload-progress"
import { markFirstPdfUpload } from "@/lib/site-prefs"
import { recordPdfToolUsage } from "@/lib/record-pdf-tool-usage"
import {
  cleanExtractedTextArtifacts,
  previewAnonymizedPlainText,
} from "@/lib/text-redaction-preview"
import { cn } from "@workspace/ui/lib/utils"
import { CountUp } from "@workspace/ui/components/count-up"
import {
  ALL_CATEGORIES,
  PDF_REDACT_JSON_DEFAULT_CATEGORIES,
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

/** API-`step` (z. B. „Presidio …“) für die Oberfläche in klare Texte übersetzen. */
function displayProgressStep(
  raw: string | undefined,
  phase: "upload" | "anonymize"
): string {
  const s = (raw ?? "").trim()
  if (!s) {
    return phase === "upload" ? "PDF wird analysiert …" : "Anonymisiere …"
  }
  if (/presidio|spacy|gliner/i.test(s)) {
    return phase === "upload"
      ? "Inhalte werden erkannt …"
      : "Text wird verarbeitet …"
  }
  return s
}

export default function SimpleTextPage() {
  const { setLoadingBar } = useSiteChromeTopLoading()
  const {
    registerNewSession,
    setNewSessionActionVisible,
    setWorkspaceDocumentName,
  } = useAppWorkspaceActions()
  const [step, setStep] = useState<Step>("idle")
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [choices, setChoices] = useState<Record<string, DetectionAction>>({})
  const [fileName, setFileName] = useState("")
  const [lastPdf, setLastPdf] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState("")
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    () => new Set(PDF_REDACT_JSON_DEFAULT_CATEGORIES),
  )
  const [pendingIdleFile, setPendingIdleFile] = useState<File | null>(null)
  const [idleFileDragOver, setIdleFileDragOver] = useState(false)
  const [layoutEnter, setLayoutEnter] = useState(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const idleLayoutRef = useRef<HTMLDivElement>(null)
  const [uploadRunId, setUploadRunId] = useState(0)
  const [anonRunId, setAnonRunId] = useState(0)

  const idleFilterCountSuffix =
    activeCategories.size < ALL_CATEGORIES.length
      ? ` (${activeCategories.size})`
      : ""

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
      setStep("uploading")
      setUploadRunId((k) => k + 1)
      setProgress(0)
      setProgressStep("")

      try {
        const result = await uploadPdf(file, "anonymize_text", (stepLabel, prog) => {
          setProgressStep(stepLabel)
          setProgress(prog)
        })
        let finalResult: UploadResponse = result

        try {
          setProgressStep("Erkennung wird abgeschlossen …")
          setProgress((prev) => Math.max(prev, 92))
          const enhancedDetections = await enhanceDetectionsWithLlm(
            result.text,
            activeCategories,
            result.detections,
            "/pdf-redact-json"
          )
          finalResult = {
            ...result,
            detections: enhancedDetections,
          }
        } catch (llmErr) {
          console.warn("[/pdf-redact-json] LLM detection fallback to base detections", llmErr)
        }

        setUploadResult(finalResult)

        if (!finalResult.hasSelectableText) {
          setError(finalResult.message ?? "Kein Text erkannt.")
          setStep("idle")
          setCurrentFile(null)
          return
        }

        const initial: Record<string, DetectionAction> = {}
        for (const d of finalResult.detections) {
          initial[d.id] = activeCategories.has(d.category as Category)
            ? "redact"
            : "ignore"
        }
        setChoices(initial)
        setPendingIdleFile(null)
        setStep("review")
        markFirstPdfUpload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Upload")
        setStep("idle")
        setCurrentFile(null)
      }
    },
    [activeCategories]
  )

  const tryBeginUpload = useCallback(
    (file: File) => {
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
    [activeCategories, playFilterGateShake, handleFile]
  )

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

  const handleAnonymize = useCallback(async () => {
    if (!uploadResult || !currentFile) return
    setError(null)
    setProgress(0)
    setProgressStep("Wird vorbereitet …")
    setAnonRunId((k) => k + 1)
    setStep("anonymizing")

    try {
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
          outputMode: "text_only",
          activeCategories: [...activeCategories],
        }
      )
      setLastPdf(pdf)
      setStep("done")
      recordPdfToolUsage("anonymize_text")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Anonymisierung fehlgeschlagen"
      )
      setStep("review")
    }
  }, [uploadResult, currentFile, choices, activeCategories])

  const handleDownload = useCallback(() => {
    if (lastPdf) downloadBase64Pdf(lastPdf, `text_anonym_${fileName}`)
  }, [lastPdf, fileName])

  const handleReset = useCallback(() => {
    setStep("idle")
    setError(null)
    setUploadResult(null)
    setCurrentFile(null)
    setChoices({})
    setLastPdf(null)
    setPendingIdleFile(null)
    setFileName("")
  }, [])

  useEffect(() => {
    registerNewSession(handleReset)
    return () => {
      registerNewSession(null)
      setNewSessionActionVisible(false)
    }
  }, [registerNewSession, handleReset, setNewSessionActionVisible])

  useEffect(() => {
    setWorkspaceDocumentName(fileName.trim() || null)
    return () => setWorkspaceDocumentName(null)
  }, [fileName, setWorkspaceDocumentName])

  const showNewSessionInChrome = step !== "idle" || pendingIdleFile != null

  useEffect(() => {
    setNewSessionActionVisible(showNewSessionInChrome)
  }, [showNewSessionInChrome, setNewSessionActionVisible])

  const showFullWorkspace =
    Boolean(uploadResult) && (step === "review" || step === "anonymizing")

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

  const visibleDetections = uploadResult
    ? uploadResult.detections.filter((d) =>
        activeCategories.has(d.category as Category)
      )
    : []

  const activeCount = visibleDetections.filter(
    (d) => choices[d.id] !== "ignore"
  ).length

  const previewAnonText = useMemo(() => {
    if (!uploadResult) return ""
    return previewAnonymizedPlainText(
      uploadResult.text,
      uploadResult.detections,
      choices,
      activeCategories,
    )
  }, [uploadResult, choices, activeCategories])

  const displayOriginalText = useMemo(() => {
    if (!uploadResult) return ""
    return cleanExtractedTextArtifacts(uploadResult.text)
  }, [uploadResult])

  const idleHeroCtaMode: "select" | "replace" | "continue" = !pendingIdleFile
    ? "select"
    : activeCategories.size > 0
      ? "continue"
      : "replace"

  const idleHeroHint =
    idleHeroCtaMode === "continue"
      ? "Tippe „Weiter“, um die Analyse zu starten, oder ersetze die Datei durch Tippen ins Feld. Nur Fließtext, keine Seitenbilder — die Ausgabe nutzt die Formatierung der ersten Seite."
      : idleHeroCtaMode === "replace"
        ? "Wähle mindestens einen Filter; danach erscheint der Button „Weiter“."
        : "Nur Fließtext, keine Seitenbilder. Wähle mindestens einen Filter, sonst startet die Analyse nicht."

  const progressPercent = Math.min(100, Math.max(0, Math.round(progress)))
  const uploadProgressSmoothed = useSmoothedUploadProgress(
    progress,
    step === "uploading",
    uploadRunId
  )

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <h1 className="sr-only">PDF Schwärzen – nur Text</h1>

      {error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive lg:px-6">
          {error}
        </div>
      )}

      {uploadResult?.ocrUsed &&
        (step === "review" || step === "anonymizing") && (
          <div className="shrink-0 border-b border-border bg-blue-500/10 px-4 py-2 text-center text-xs text-muted-foreground lg:px-6">
            Text per OCR (Tesseract) erkannt — dieselbe Textgeometrie wie bei der
            Analyse.
          </div>
        )}

      {step === "uploading" ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="flex w-full max-w-sm flex-col gap-2"
            aria-label={`Fortschritt etwa ${uploadProgressSmoothed} Prozent — ${displayProgressStep(progressStep, "upload")}`}
          >
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-primary/85 transition-[width] duration-200 ease-out"
                style={{ width: `${uploadProgressSmoothed}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {displayProgressStep(progressStep, "upload")}
            </p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground" aria-hidden>
            {uploadProgressSmoothed}
            <span className="text-sm font-medium text-muted-foreground"> %</span>
          </p>
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
              Die anonymisierte Text-PDF ist bereit zum Download.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" size="lg" onClick={handleDownload}>
              PDF herunterladen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleReset}
            >
              Neue PDF
            </Button>
          </div>
        </div>
      ) : showFullWorkspace && uploadResult ? (
        <SidebarProvider className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-canvas">
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-transparent lg:flex-row">
            <PdfRedactSidebarInset
              className={cn(
                "relative flex min-h-0 min-w-0 flex-1 flex-col transition duration-300 ease-out will-change-transform",
                layoutEnter
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-[0.99] opacity-0"
              )}
            >
              <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-sidebar">
                <TextSideBySideCompare
                  className="min-h-0 flex-1"
                  leftLabel="Anonymisiert (Vorschau)"
                  rightLabel="Original (extrahiert)"
                  leftText={previewAnonText}
                  rightText={displayOriginalText}
                />
                {step === "anonymizing" && (
                  <div className="pointer-events-none absolute inset-0 z-20 ring-2 ring-primary/20 ring-inset" />
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
                          collapsible
                          sectionPanelId="pdf-redact-json-fundstellen-panel"
                        />
                        {step === "anonymizing" && (
                          <div
                            className="mt-4 rounded-md border border-border/60 bg-background/60 p-4"
                            role="status"
                            aria-live="polite"
                            aria-busy="true"
                          >
                            <div
                              className="flex items-baseline gap-0.5"
                              aria-label={`Fortschritt ${progressPercent} Prozent`}
                            >
                              <CountUp
                                key={anonRunId}
                                to={progressPercent}
                                duration={0.45}
                                digitEffect="none"
                                startWhen={step === "anonymizing"}
                                className="text-2xl font-semibold tabular-nums tracking-tight text-foreground"
                              />
                              <span className="text-sm font-medium text-muted-foreground">
                                % Fortschritt
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-snug text-muted-foreground">
                              {displayProgressStep(progressStep, "anonymize")}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Bei vielen Fundstellen oder viel Text kann die
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
                  chipListId="simple-idle-inline-filters"
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
                  aria-controls="simple-idle-filter-dialog"
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
                        listId="simple-idle-filter-dialog"
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
                heroCtaMode={idleHeroCtaMode}
                onContinue={
                  idleHeroCtaMode === "continue"
                    ? continuePendingUpload
                    : undefined
                }
                heroHint={idleHeroHint}
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

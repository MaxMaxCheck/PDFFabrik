"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, CloudUploadIcon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"

interface PdfDropzoneProps {
  onFile: (file: File) => void
  onBeforeSelect?: () => boolean
  disabled?: boolean
  /** Volle Karte, Pill oder große Einstiegs-Fläche (/) */
  variant?: "card" | "pill" | "hero"
  /** Bei variant=pill|hero: angezeigter Dateiname (nach Auswahl) */
  fileLabel?: string
  pillPlaceholder?: string
  /** Nur hero: sekundäre Zeile unter dem CTA-Look */
  heroHint?: string
  className?: string
  /**
   * hero: „PDF auswählen“ / „Andere Datei“ / klickbares **Weiter** (mindestens
   * Filter + ausgewählte Datei nötig).
   */
  heroCtaMode?: "select" | "replace" | "continue"
  onContinue?: () => void
}

export function PdfDropzone({
  onFile,
  onBeforeSelect,
  disabled,
  variant = "card",
  fileLabel = "",
  pillPlaceholder = "PDF auswählen oder hierher ziehen …",
  heroHint = "Eine Datei, bis zu den üblichen Browser-Limits.",
  className,
  heroCtaMode = "select",
  onContinue,
}: PdfDropzoneProps) {
  const [dragError, setDragError] = useState<string | null>(null)

  const onDrop = useCallback(
    (accepted: File[], rejected: { file: File }[]) => {
      setDragError(null)
      if (rejected.length > 0) {
        setDragError("Nur PDF-Dateien werden unterstützt.")
        return
      }
      if (accepted[0]) onFile(accepted[0])
    },
    [onFile],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled,
    noClick: Boolean(onBeforeSelect),
  })

  const handleRootClick = useCallback(() => {
    if (!onBeforeSelect) return
    if (disabled) return
    if (!onBeforeSelect()) return
    open()
  }, [disabled, onBeforeSelect, open])

  if (variant === "hero") {
    const showName = fileLabel.trim().length > 0
    const ctaIsContinue = heroCtaMode === "continue" && Boolean(onContinue)
    const ctaLabel =
      heroCtaMode === "continue"
        ? "Weiter"
        : showName
          ? "Andere Datei"
          : "PDF auswählen"
    return (
      <div className={cn("w-full min-h-0", className)}>
        <div
          {...getRootProps(
            onBeforeSelect
              ? {
                  onClick: handleRootClick,
                }
              : undefined
          )}
          className={cn(
            "flex h-full min-h-[calc(100svh-10.5rem)] w-full cursor-pointer flex-col items-center justify-center gap-5 rounded-none border-2 border-dashed px-6 py-8 text-center transition-[border-color,background-color,box-shadow] max-lg:min-h-[calc(100svh-13rem)] max-lg:px-4 max-lg:py-6 sm:px-10 sm:py-10",
            isDragActive
              ? "border-sky-500 bg-sky-100/90 shadow-sm dark:border-sky-400/70 dark:bg-sky-950/40"
              : "border-sky-400/55 bg-sky-50/95 hover:border-sky-500/70 hover:bg-sky-100/80 dark:border-sky-500/40 dark:bg-sky-950/30 dark:hover:bg-sky-950/50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-1">
            <HugeiconsIcon
              icon={CloudUploadIcon}
              className="size-12 text-sky-600 dark:text-sky-400 sm:size-14"
              strokeWidth={1.25}
            />
            <span className="sr-only">PDF-Datei wählen oder ablegen</span>
          </div>
          {showName ? (
            <div className="max-w-md space-y-1">
              <p className="text-xs font-medium tracking-wide text-sky-800 uppercase dark:text-sky-200/90">
                Ausgewählt
              </p>
              <p
                className="break-words text-base font-semibold text-foreground sm:text-lg"
                title={fileLabel}
              >
                {fileLabel}
              </p>
            </div>
          ) : null}
          {ctaIsContinue ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onContinue?.()
              }}
              className="inline-flex min-h-[2.75rem] cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm sm:min-h-12 sm:px-8 sm:text-base dark:bg-sky-500"
            >
              {ctaLabel}
            </button>
          ) : (
            <div
              className={cn(
                "pointer-events-none inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm sm:min-h-12 sm:px-6 sm:text-base",
                "bg-sky-600 text-white dark:bg-sky-500",
              )}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-4 sm:size-5" strokeWidth={2} />
              {ctaLabel}
            </div>
          )}
          <p className="max-w-sm text-pretty text-sm text-sky-900/80 dark:text-sky-100/80">
            {isDragActive
              ? "Hier ablegen …"
              : ctaIsContinue
                ? "Starte die Analyse mit „Weiter“ oder ersetze die Datei durch Tippen ins Feld."
                : "PDF in dieses Feld ziehen oder tippen zum Durchsuchen."}
          </p>
          <p className="text-xs text-muted-foreground">{heroHint}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Format:
            </span>
            <span className="rounded-md border border-sky-500/20 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-sky-900 shadow-sm dark:border-sky-500/30 dark:bg-sky-900/50 dark:text-sky-100">
              PDF
            </span>
          </div>
        </div>
        {dragError && (
          <p className="text-destructive mt-2 text-sm">{dragError}</p>
        )}
      </div>
    )
  }

  if (variant === "pill") {
    const showName = fileLabel.trim().length > 0
    return (
      <div className="w-full">
        <div
          {...getRootProps(
            onBeforeSelect
              ? {
                  onClick: handleRootClick,
                }
              : undefined
          )}
          className={cn(
            "flex w-full min-h-[3.75rem] cursor-pointer items-center gap-3 rounded-full border-2 border-dashed px-6 py-4 text-left transition-colors select-none sm:min-h-16 sm:py-5 sm:px-7",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input {...getInputProps()} />
          <span className="text-muted-foreground text-2xl sm:text-[1.75rem]" aria-hidden>
            📄
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-base leading-snug sm:text-[1.05rem]",
              showName ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {showName ? fileLabel : pillPlaceholder}
          </span>
        </div>
        {dragError && (
          <p className="text-destructive mt-1.5 text-sm">{dragError}</p>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps(
        onBeforeSelect
          ? {
              onClick: handleRootClick,
            }
          : undefined
      )}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-16 text-center transition-colors cursor-pointer select-none",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input {...getInputProps()} />

      <div className="text-4xl">📄</div>

      {isDragActive ? (
        <p className="text-primary font-medium">PDF hier ablegen …</p>
      ) : (
        <>
          <p className="font-medium">PDF hier hineinziehen</p>
          <p className="text-muted-foreground text-sm">
            oder klicken zum Auswählen
          </p>
        </>
      )}

      {dragError && (
        <p className="text-destructive text-sm mt-1">{dragError}</p>
      )}
    </div>
  )
}

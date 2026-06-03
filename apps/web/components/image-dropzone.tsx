"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, CloudUploadIcon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"

const IMAGE_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/bmp": [".bmp"],
} as const

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void
  onBeforeSelect?: () => boolean
  disabled?: boolean
  variant?: "hero"
  fileLabel?: string
  heroHint?: string
  className?: string
  heroCtaMode?: "select" | "replace" | "continue"
  onContinue?: () => void
  multiple?: boolean
  maxFiles?: number
}

export function ImageDropzone({
  onFiles,
  onBeforeSelect,
  disabled,
  variant = "hero",
  fileLabel = "",
  heroHint = "Alles lokal im Browser — mehrere Bilder werden als ZIP exportiert.",
  className,
  heroCtaMode = "select",
  onContinue,
  multiple = true,
  maxFiles = 50,
}: ImageDropzoneProps) {
  const [dragError, setDragError] = useState<string | null>(null)

  const onDrop = useCallback(
    (accepted: File[], rejected: { file: File }[]) => {
      setDragError(null)
      if (rejected.length > 0) {
        setDragError("Nur JPG, PNG, WebP oder BMP werden unterstützt.")
        return
      }
      if (accepted.length > 0) onFiles(accepted)
    },
    [onFiles]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: IMAGE_ACCEPT,
    maxFiles,
    multiple,
    disabled,
    noClick: Boolean(onBeforeSelect),
  })

  const handleRootClick = useCallback(() => {
    if (!onBeforeSelect) return
    if (disabled) return
    if (!onBeforeSelect()) return
    open()
  }, [disabled, onBeforeSelect, open])

  if (variant !== "hero") return null

  const showName = fileLabel.trim().length > 0
  const ctaIsContinue = heroCtaMode === "continue" && Boolean(onContinue)
  const ctaLabel =
    heroCtaMode === "continue"
      ? "Weiter"
      : showName
        ? "Andere Dateien"
        : "Bilder auswählen"

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
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-1">
          <HugeiconsIcon
            icon={CloudUploadIcon}
            className="size-12 text-sky-600 dark:text-sky-400 sm:size-14"
            strokeWidth={1.25}
          />
          <span className="sr-only">Bilder wählen oder ablegen</span>
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
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm sm:min-h-12 sm:px-8 sm:text-base dark:bg-sky-500"
          >
            {ctaLabel}
          </button>
        ) : (
          <div
            className={cn(
              "pointer-events-none inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm sm:min-h-12 sm:px-6 sm:text-base",
              "bg-sky-600 text-white dark:bg-sky-500"
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
              ? "Starte mit „Weiter“ oder ersetze die Dateien durch Tippen ins Feld."
              : "Bilder in dieses Feld ziehen oder tippen zum Durchsuchen."}
        </p>
        <p className="text-xs text-muted-foreground">{heroHint}</p>
      </div>
      {dragError ? <p className="text-destructive mt-2 text-sm">{dragError}</p> : null}
    </div>
  )
}

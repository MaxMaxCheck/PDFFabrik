"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"

/** pdfjs-dist-Version — Worker-URL muss passen */
const PDFJS_DIST_VERSION = "5.6.205"

interface PdfThumbnailStripProps {
  fileUrl: string
  activePage: number
  onSelectPage: (page: number) => void
  onPageCount?: (total: number) => void
}

/**
 * Seiten-Thumbnails per pdf.js (zusätzlich zur eingebetteten Browser-PDF-Ansicht).
 */
export function PdfThumbnailStrip({
  fileUrl,
  activePage,
  onSelectPage,
  onPageCount,
}: PdfThumbnailStripProps) {
  const activeButtonRef = useRef<HTMLButtonElement | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [thumbs, setThumbs] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoadError(null)
      setThumbs([])
      setNumPages(0)

      const pdfjsLib = await import("pdfjs-dist")
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_DIST_VERSION}/build/pdf.worker.min.mjs`

      try {
        const task = pdfjsLib.getDocument({ url: fileUrl })
        const pdf = await task.promise
        if (cancelled) return
        setNumPages(pdf.numPages)
        onPageCount?.(pdf.numPages)

        const urls: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 0.12 })
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) continue
          canvas.width = viewport.width
          canvas.height = viewport.height

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise

          urls.push(canvas.toDataURL("image/jpeg", 0.82))
          if (cancelled) return
          setThumbs([...urls])
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Thumbnails konnten nicht geladen werden.")
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [fileUrl, onPageCount])

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activePage])

  if (loadError) {
    return (
      <p className="px-2 py-3 text-center text-[11px] leading-snug text-muted-foreground">{loadError}</p>
    )
  }

  return (
    <div
      className={cn(
        "flex gap-1.5 px-1 py-1.5 sm:px-1.5",
        "flex-row overflow-x-auto lg:flex-col lg:overflow-visible",
      )}
    >
      {thumbs.length === 0 && numPages === 0 && (
        <div className="flex w-full flex-col items-center gap-2 py-6 text-muted-foreground">
          <span
            className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          <span className="text-[11px]">Seiten …</span>
        </div>
      )}
      {thumbs.map((src, idx) => {
        const page = idx + 1
        const isActive = page === activePage
        return (
          <button
            key={page}
            ref={isActive ? activeButtonRef : undefined}
            type="button"
            onClick={() => onSelectPage(page)}
            className={cn(
              "w-full max-w-[112px] shrink-0 rounded-md border-2 bg-white p-0.5 text-left shadow-sm transition-colors dark:bg-zinc-900",
              "hover:border-primary/50",
              "mx-auto lg:max-w-[112px]",
              isActive ? "border-primary ring-2 ring-primary/30" : "border-border",
            )}
            aria-label={`Seite ${page}`}
            aria-current={isActive ? "page" : undefined}
          >
            <img
              src={src}
              alt=""
              className="mx-auto block h-auto max-h-[84px] w-full max-w-[96px] object-contain"
            />
            <span className="block py-0.5 text-center text-[9px] font-medium tabular-nums text-muted-foreground">
              {page}
            </span>
          </button>
        )
      })}
    </div>
  )
}

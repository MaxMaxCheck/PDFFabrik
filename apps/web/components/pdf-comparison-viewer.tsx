"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { cn } from "@workspace/ui/lib/utils"

const PDFJS_DIST_VERSION = "5.6.205"

type PdfCanvasStackProps = {
  fileUrl: string
  className?: string
  scrollRef?: RefObject<HTMLDivElement | null>
  onScroll?: (el: HTMLDivElement) => void
}

function PdfCanvasStack({ fileUrl, className, scrollRef, onScroll }: PdfCanvasStackProps) {
  const localRef = useRef<HTMLDivElement>(null)
  const rootRef = scrollRef ?? localRef
  const renderGen = useRef(0)
  const [numPages, setNumPages] = useState(0)
  const [loadDone, setLoadDone] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const gen = ++renderGen.current
    setNumPages(0)
    setLoadDone(false)
    setLoadError(null)

    ;(async () => {
      const root = rootRef.current
      if (!root) return

      const pdfjsLib = await import("pdfjs-dist")
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${PDFJS_DIST_VERSION}/build/pdf.worker.min.mjs`

      try {
        const pdf = await pdfjsLib.getDocument({ url: fileUrl }).promise
        if (cancelled || gen !== renderGen.current) return
        setNumPages(pdf.numPages)
        setLoadDone(true)
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve())
          })
        })
        if (cancelled || gen !== renderGen.current) return

        const width = Math.max(260, Math.min(root.clientWidth - 36, 820))
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled || gen !== renderGen.current) return
          const wrap = root.querySelector<HTMLDivElement>(`[data-pdf-page="${i}"]`)
          if (!wrap) continue
          const page = (await pdf.getPage(i) as unknown) as {
            getViewport: (o: { scale: number }) => { width: number; height: number }
            render: (o: {
              canvasContext: CanvasRenderingContext2D
              viewport: { width: number; height: number }
              canvas: HTMLCanvasElement
            }) => { promise: Promise<void> }
          }
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: width / base.width })
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) continue
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = "mx-auto block h-auto w-full shadow-sm"
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
          if (cancelled || gen !== renderGen.current) return
          wrap.replaceChildren(canvas)
        }
      } catch (err) {
        if (!cancelled && gen === renderGen.current) {
          setLoadError(err instanceof Error ? err.message : "PDF konnte nicht geladen werden.")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fileUrl, rootRef])

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-4 text-center text-sm text-muted-foreground">
        {loadError}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn("h-full overflow-y-auto overflow-x-hidden bg-muted/40 px-4 py-4", className)}
      onScroll={(event) => onScroll?.(event.currentTarget)}
    >
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-2">
        {!loadDone && (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-xs">PDF wird geladen …</span>
          </div>
        )}
        {loadDone &&
          Array.from({ length: numPages }, (_, idx) => (
            <div key={idx + 1} data-pdf-page={idx + 1} className="min-h-[120px] bg-white" />
          ))}
      </div>
    </div>
  )
}

type PdfComparisonViewerProps = {
  beforeUrl: string
  afterUrl: string
}

export function PdfComparisonViewer({ beforeUrl, afterUrl }: PdfComparisonViewerProps) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)

  const syncScroll = useCallback((source: HTMLDivElement, target: HTMLDivElement | null) => {
    if (!target || syncingRef.current) return
    const sourceMax = Math.max(1, source.scrollHeight - source.clientHeight)
    const targetMax = Math.max(1, target.scrollHeight - target.clientHeight)
    syncingRef.current = true
    target.scrollTop = (source.scrollTop / sourceMax) * targetMax
    window.requestAnimationFrame(() => {
      syncingRef.current = false
    })
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-sidebar">
      <div className="grid h-full w-full grid-cols-2 gap-px bg-border">
        <PdfCanvasStack
          fileUrl={beforeUrl}
          scrollRef={leftRef}
          onScroll={(el) => syncScroll(el, rightRef.current)}
        />
        <PdfCanvasStack
          fileUrl={afterUrl}
          scrollRef={rightRef}
          onScroll={(el) => syncScroll(el, leftRef.current)}
        />
      </div>
    </div>
  )
}

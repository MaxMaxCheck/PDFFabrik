"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { cn } from "@workspace/ui/lib/utils"

const PDFJS_DIST_VERSION = "5.6.205"

export type PdfScrollViewerHandle = {
  scrollToPage: (page: number) => void
}

type PdfScrollViewerProps = {
  fileUrl: string
  className?: string
  onVisiblePageChange?: (page: number) => void
}

export const PdfScrollViewer = forwardRef<PdfScrollViewerHandle, PdfScrollViewerProps>(
  function PdfScrollViewer({ fileUrl, className, onVisiblePageChange }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    /** pdf.js document — nur in diesem Modul, kein strikter Typ nötig */
    const pdfDocRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(
      null,
    )
    const loadGen = useRef(0)
    const renderGen = useRef(0)
    const suppressObserverUntil = useRef(0)

    const [numPages, setNumPages] = useState(0)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [loadDone, setLoadDone] = useState(false)

    const scrollToPage = useCallback((page: number) => {
      const root = scrollRef.current
      if (!root) return
      const el = root.querySelector<HTMLElement>(`[data-pdf-page="${page}"]`)
      if (!el) return
      suppressObserverUntil.current = Date.now() + 850
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }, [])

    useImperativeHandle(ref, () => ({ scrollToPage }), [scrollToPage])

    useEffect(() => {
      let cancelled = false
      const gen = ++loadGen.current
      pdfDocRef.current = null
      setLoadError(null)
      setLoadDone(false)
      setNumPages(0)

      ;(async () => {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${PDFJS_DIST_VERSION}/build/pdf.worker.min.mjs`

        try {
          const pdf = await pdfjsLib.getDocument({ url: fileUrl }).promise
          if (cancelled || gen !== loadGen.current) return
          pdfDocRef.current = pdf
          setNumPages(pdf.numPages)
          setLoadDone(true)
        } catch (e) {
          if (!cancelled && gen === loadGen.current) {
            setLoadError(e instanceof Error ? e.message : "PDF konnte nicht geladen werden.")
          }
        }
      })()

      return () => {
        cancelled = true
      }
    }, [fileUrl])

    useEffect(() => {
      const pdf = pdfDocRef.current
      const root = scrollRef.current
      if (!pdf || !root || !loadDone || numPages < 1) return

      let cancelled = false
      const gen = ++renderGen.current

      ;(async () => {
        const width = Math.max(280, Math.min(root.clientWidth - 80, 820))

        for (let i = 1; i <= numPages; i++) {
          if (cancelled || gen !== renderGen.current) return
          const wrap = root.querySelector<HTMLDivElement>(`[data-pdf-page="${i}"]`)
          if (!wrap) continue

          const page = (await pdf.getPage(i)) as {
            getViewport: (o: { scale: number }) => { width: number; height: number }
            render: (o: {
              canvasContext: CanvasRenderingContext2D
              viewport: { width: number; height: number }
              canvas: HTMLCanvasElement
            }) => { promise: Promise<void> }
          }
          const base = page.getViewport({ scale: 1 })
          const scale = width / base.width
          const viewport = page.getViewport({ scale })
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
      })()

      return () => {
        cancelled = true
      }
    }, [fileUrl, loadDone, numPages])

    useEffect(() => {
      if (numPages < 1 || !loadDone) return
      const root = scrollRef.current
      if (!root) return

      const observer = new IntersectionObserver(
        (entries) => {
          if (Date.now() < suppressObserverUntil.current) return
          const best = entries
            .filter((e) => e.isIntersecting && e.intersectionRatio > 0)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
          if (!best?.target) return
          const raw = (best.target as HTMLElement).getAttribute("data-pdf-page")
          const p = raw != null ? Number(raw) : NaN
          if (Number.isFinite(p) && p > 0) onVisiblePageChange?.(p)
        },
        {
          root,
          rootMargin: "-38% 0px -38% 0px",
          threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        },
      )

      for (let i = 1; i <= numPages; i++) {
        const el = root.querySelector(`[data-pdf-page="${i}"]`)
        if (el) observer.observe(el)
      }

      return () => observer.disconnect()
    }, [numPages, loadDone, onVisiblePageChange, fileUrl])

    if (loadError) {
      return (
        <div
          className={cn(
            "flex min-h-0 flex-1 items-center justify-center border border-border bg-white p-4 text-center text-sm text-muted-foreground dark:bg-zinc-950",
            className,
          )}
        >
          {loadError}
        </div>
      )
    }

    return (
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-transparent px-3 py-3 sm:px-4 lg:px-6",
          className,
        )}
      >
        <div className="mx-auto flex w-full max-w-[min(100%,820px)] flex-col gap-1.5 pb-3">
          {!loadDone && (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <span
                className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
              <span className="text-xs">PDF wird geladen …</span>
            </div>
          )}
          {loadDone &&
            Array.from({ length: numPages }, (_, idx) => {
              const page = idx + 1
              return (
                <div
                  key={page}
                  data-pdf-page={page}
                  className="min-h-[120px] bg-white p-0 dark:bg-zinc-950"
                />
              )
            })}
        </div>
      </div>
    )
  },
)

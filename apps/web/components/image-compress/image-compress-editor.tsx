"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { filesize } from "filesize"
import { blobToURL, fromURL, type ImageFormat } from "image-resize-compress"
import { zipSync } from "fflate"
import {
  DownloadCloud,
  Info,
  RefreshCw,
  Settings,
  XCircle,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import {
  encodeLossyWasm,
  imageObjectUrlToImageData,
} from "@/lib/image-compress-encode"
import { AdSenseComponent } from "@/components/advertising/AdSenseComponent"
import { ImageDropzone } from "@/components/image-dropzone"
import {
  BATCH_COMPRESS_REPORT_FILENAME,
  type BatchCompressFailure,
  batchReportToZipBytes,
  buildBatchCompressReport,
} from "@/lib/image-batch-compress-toast"
import {
  IMAGE_BATCH_CHUNK_SIZE,
  IMAGE_BATCH_CONCURRENCY,
  chunkCount,
  mapWithConcurrency,
  yieldToMain,
} from "@/lib/image-batch-compress-runner"
import { MAX_IMAGE_BATCH, getImageFilesFromDropEvent } from "@/lib/image-batch-files"
import { BatchCompressBusyView } from "@/components/image-compress/batch-compress-busy-view"
import { BatchCompressVideoHost } from "@/components/image-compress/batch-compress-video-host"
import { FileUploader, FileUploaderContent } from "@/components/file-uploader"
import { Loader } from "@/components/loader"
import { ImageCompressIcons as Icons } from "@/components/image-compress/icons"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"

/** Short pause so the preview is visible before compression runs. */
const PREVIEW_PAUSE_MS = 800
const isDev = process.env.NODE_ENV === "development"

/**
 * Wenn ein Re-Encode nicht kleiner ist als das Original, versuchen wir optional
 * nochmal mit gekappter Kantenlänge (v.a. bei Smartphone-JPEGs sinnvoll).
 */
const MAX_ENCODE_LONG_EDGE_PX = 2560

type StrengthPreset = "leicht" | "mittel" | "stark" | "custom"

function presetQuality(p: Exclude<StrengthPreset, "custom">) {
  if (p === "leicht") return 85
  if (p === "mittel") return 75
  return 60
}

function sanitizeZipBaseName(name: string): string {
  const base = name.replace(/\.[^./]+$/, "").trim() || "bild"
  return base
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

/** Dateiendung für Export — immer vom gewählten Format, nicht vom erkannten Inhalt. */
function exportExtensionForFormat(format: string): string {
  if (format === "jpeg") return "jpg"
  if (format === "auto") return "webp"
  return format
}

function zipEntryExtension(format: string, buf: Uint8Array): string {
  if (format !== "auto") return exportExtensionForFormat(format)
  return detectImageExtension(buf) ?? "webp"
}

function bufferMatchesExportFormat(buf: Uint8Array, format: string): boolean {
  const detected = detectImageExtension(buf)
  if (!detected) return false
  if (format === "auto") return true
  if (format === "jpeg") return detected === "jpg"
  return detected === format
}

function uniqueZipEntryName(base: string, ext: string, used: Set<string>): string {
  const safeExt = ext.replace(/^\./, "")
  let name = `${base}.${safeExt}`
  let n = 2
  while (used.has(name)) {
    name = `${base}-${n}.${safeExt}`
    n += 1
  }
  used.add(name)
  return name
}

function isHtmlOrTextPayload(buf: Uint8Array): boolean {
  if (buf.length < 16) return false
  const head = new TextDecoder().decode(buf.slice(0, 96)).trimStart().toLowerCase()
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("<head") ||
    (head.startsWith("<?xml") && head.includes("html"))
  )
}

function detectImageExtension(buf: Uint8Array): string | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg"
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp"
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif"
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "bmp"
  return null
}

async function loadImageNaturalSize(
  objectUrl: string
): Promise<{ width: number; height: number }> {
  const img = new window.Image()
  img.src = objectUrl
  if (typeof img.decode === "function") {
    await img.decode()
  } else {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Image load failed"))
    })
  }
  return { width: img.naturalWidth, height: img.naturalHeight }
}

function dataTransferHasFiles(dt: DataTransfer | null | undefined) {
  if (!dt?.types) return false
  return Array.from(dt.types).includes("Files")
}

/** Full-window drag overlay (files only). */
function useFullscreenFileDragOverlay(enabled: boolean) {
  const [active, setActive] = useState(false)
  const depth = useRef(0)

  useEffect(() => {
    if (!enabled) {
      depth.current = 0
      return
    }

    const onEnter = (e: DragEvent) => {
      if (!dataTransferHasFiles(e.dataTransfer)) return
      e.preventDefault()
      depth.current += 1
      setActive(true)
    }
    const onLeave = (e: DragEvent) => {
      if (!dataTransferHasFiles(e.dataTransfer)) return
      e.preventDefault()
      depth.current -= 1
      if (depth.current <= 0) {
        depth.current = 0
        setActive(false)
      }
    }
    const reset = () => {
      depth.current = 0
      setActive(false)
    }
    const onOver = (e: DragEvent) => {
      if (dataTransferHasFiles(e.dataTransfer)) e.preventDefault()
    }

    document.addEventListener("dragenter", onEnter)
    document.addEventListener("dragleave", onLeave)
    document.addEventListener("drop", reset)
    document.addEventListener("dragend", reset)
    document.addEventListener("dragover", onOver)
    window.addEventListener("blur", reset)

    return () => {
      document.removeEventListener("dragenter", onEnter)
      document.removeEventListener("dragleave", onLeave)
      document.removeEventListener("drop", reset)
      document.removeEventListener("dragend", reset)
      document.removeEventListener("dragover", onOver)
      window.removeEventListener("blur", reset)
    }
  }, [enabled])

  return active
}

function CompressorCardHeader({
  settingsTrigger,
  immersive,
}: {
  settingsTrigger: React.ReactNode
  immersive?: boolean
}) {
  if (immersive) return null
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-muted/30 px-4 py-3 sm:px-5">
      <h2 className="min-w-0 text-sm font-semibold tracking-tight text-foreground sm:text-base">
        IMG Compress
      </h2>
      <div className="shrink-0">{settingsTrigger}</div>
    </div>
  )
}

type Phase = "empty" | "ready" | "countdown" | "comparing"

export type ImageCompressEditorProps = {
  variant?: "default" | "fullscreen" | "compact" | "hero"
}

export function ImageCompressEditor({ variant = "default" }: ImageCompressEditorProps) {
  const fullscreen = variant === "fullscreen"
  const compact = variant === "compact"
  const hero = variant === "hero"
  const immersive = fullscreen || compact

  const [files, setFiles] = useState<File[] | null>(null)
  const [idleFileDragOver, setIdleFileDragOver] = useState(false)
  const [preset, setPreset] = useState<StrengthPreset>("mittel")

  const [imageData, setImageData] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<number | null>(null)
  const [imageType, setImageType] = useState<string | null>(null)

  const [resultData, setResultData] = useState<string | null>(null)
  const [resultSize, setResultSize] = useState<number | null>(null)
  const [resultType, setResultType] = useState<string | null>(null)
  const [zipReady, setZipReady] = useState<{
    name: string
    blob: Blob
    totalInBytes: number
    totalOutBytes: number
    count: number
  } | null>(null)

  const [quality, setQuality] = useState<number>(presetQuality("mittel"))
  const [format, setFormat] = useState<string>("webp")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [emptyShellHover, setEmptyShellHover] = useState(false)

  const [phase, setPhase] = useState<Phase>("empty")
  const [keptOriginalNoGain, setKeptOriginalNoGain] = useState(false)
  const [outputWasDownscaled, setOutputWasDownscaled] = useState(false)
  const [compressBusy, setCompressBusy] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{
    processed: number
    total: number
    succeeded: number
    failed: number
    chunkCurrent: number
    chunkTotal: number
  } | null>(null)

  const countdownRunId = useRef(0)
  const prevFormatRef = useRef(format)

  useEffect(() => {
    if (prevFormatRef.current === format) return
    prevFormatRef.current = format
    countdownRunId.current += 1
    setZipReady(null)
    if (resultData?.startsWith("blob:")) {
      URL.revokeObjectURL(resultData)
      setResultData(null)
      setResultSize(null)
      setResultType(null)
    }
    if (phase === "comparing") {
      const n = files?.length ?? 0
      setPhase(n > 1 ? "ready" : n === 1 && imageData ? "countdown" : "empty")
    }
  }, [format, files, imageData, phase, resultData])

  async function getImageTypeFromUrl(url: string) {
    const response = await fetch(url)
    const blob = await response.blob()
    return blob.type.replace("image/", "")
  }

  const compressSingle = useCallback(
    async ({
      objectUrl,
      originalFile,
      allowKeepOriginal = true,
    }: {
      objectUrl: string
      originalFile: File
      /** ZIP-Export: immer Ziel-Format liefern, nicht unkomprimiertes Original. */
      allowKeepOriginal?: boolean
    }): Promise<{ blob: Blob; outType: string; keptOriginal: boolean; usedDownscale: boolean }> => {
      const src = objectUrl
      const outFormat: ImageFormat | undefined =
        format === "auto" ? undefined : (format as ImageFormat)

      /** WebP/JPEG: WASM (jSquash); other formats: canvas via image-resize-compress */
      const wasmLossy = format === "webp" || format === "jpeg"

      setKeptOriginalNoGain(false)
      setOutputWasDownscaled(false)

      let blob: Blob
      let usedDownscale = false

      if (wasmLossy) {
        const fmt = format as "webp" | "jpeg"
        const encodeAtDims = async (tw: number, th: number) => {
          const pixels = await imageObjectUrlToImageData(src, tw, th)
          return encodeLossyWasm(pixels, fmt, quality)
        }

        if (!allowKeepOriginal) {
          try {
            const { width: nw, height: nh } = await loadImageNaturalSize(src)
            const longEdge = Math.max(nw, nh)
            if (longEdge > MAX_ENCODE_LONG_EDGE_PX) {
              const scale = MAX_ENCODE_LONG_EDGE_PX / longEdge
              const tw = Math.max(1, Math.round(nw * scale))
              const th = Math.max(1, Math.round(nh * scale))
              blob = await encodeAtDims(tw, th)
              usedDownscale = true
            } else {
              blob = await encodeAtDims(0, 0)
            }
          } catch {
            blob = await encodeAtDims(0, 0)
          }
        } else {
          blob = await encodeAtDims(0, 0)
        }

        if (allowKeepOriginal && blob.size >= originalFile.size) {
          try {
            const { width: nw, height: nh } = await loadImageNaturalSize(src)
            const longEdge = Math.max(nw, nh)
            if (longEdge > MAX_ENCODE_LONG_EDGE_PX) {
              const scale = MAX_ENCODE_LONG_EDGE_PX / longEdge
              const tw = Math.max(1, Math.round(nw * scale))
              const th = Math.max(1, Math.round(nh * scale))
              const blobScaled = await encodeAtDims(tw, th)
              if (blobScaled.size < originalFile.size) {
                blob = blobScaled
                usedDownscale = true
              } else if (allowKeepOriginal) {
                blob = originalFile
              }
            } else if (allowKeepOriginal) {
              blob = originalFile
            }
          } catch {
            if (allowKeepOriginal) blob = originalFile
          }
        }
      } else {
        if (!allowKeepOriginal) {
          try {
            const { width: nw, height: nh } = await loadImageNaturalSize(src)
            const longEdge = Math.max(nw, nh)
            if (longEdge > MAX_ENCODE_LONG_EDGE_PX) {
              const scale = MAX_ENCODE_LONG_EDGE_PX / longEdge
              const tw = Math.max(1, Math.round(nw * scale))
              const th = Math.max(1, Math.round(nh * scale))
              blob = await fromURL(src, quality, tw, th, outFormat)
              usedDownscale = true
            } else {
              blob = await fromURL(src, quality, 0, 0, outFormat)
            }
          } catch {
            blob = await fromURL(src, quality, 0, 0, outFormat)
          }
        } else {
          blob = await fromURL(src, quality, 0, 0, outFormat)
        }

        if (allowKeepOriginal && blob.size >= originalFile.size) {
          try {
            const { width: nw, height: nh } = await loadImageNaturalSize(src)
            const longEdge = Math.max(nw, nh)
            if (longEdge > MAX_ENCODE_LONG_EDGE_PX) {
              const scale = MAX_ENCODE_LONG_EDGE_PX / longEdge
              const tw = Math.max(1, Math.round(nw * scale))
              const th = Math.max(1, Math.round(nh * scale))
              const blobScaled = await fromURL(src, quality, tw, th, outFormat)
              if (blobScaled.size < originalFile.size) {
                blob = blobScaled
                usedDownscale = true
              } else if (allowKeepOriginal) {
                blob = originalFile
              }
            } else if (allowKeepOriginal) {
              blob = originalFile
            }
          } catch {
            if (allowKeepOriginal) blob = originalFile
          }
        }
      }

      const keptOriginal = allowKeepOriginal && blob === originalFile
      const typeFromBlob = blob.type.startsWith("image/")
        ? blob.type.slice("image/".length)
        : ""
      const outType = typeFromBlob || ""

      return { blob, outType, keptOriginal, usedDownscale }
    },
    [format, getImageTypeFromUrl, quality]
  )

  const runCompression = useCallback(async (): Promise<boolean> => {
    const selected = files ?? []
    if (selected.length === 0) return false

    // Multi-file: on demand ZIP only
    if (selected.length > 1) {
      setCompressBusy(true)
      setZipReady(null)
      const total = selected.length
      const totalChunks = chunkCount(total, IMAGE_BATCH_CHUNK_SIZE)
      const failures: BatchCompressFailure[] = []
      setBatchProgress({
        processed: 0,
        total,
        succeeded: 0,
        failed: 0,
        chunkCurrent: 1,
        chunkTotal: totalChunks,
      })

      const syncBatchProgress = (
        succeeded: number,
        failed: number,
        processed: number,
        chunkCurrent: number
      ) => {
        setBatchProgress({
          processed,
          total,
          succeeded,
          failed,
          chunkCurrent,
          chunkTotal: totalChunks,
        })
      }

      try {
        const entries: Record<string, Uint8Array> = {}
        let totalInBytes = 0
        let totalOutBytes = 0
        const usedNames = new Set<string>()
        let added = 0
        let processed = 0

        for (
          let chunkStart = 0;
          chunkStart < selected.length;
          chunkStart += IMAGE_BATCH_CHUNK_SIZE
        ) {
          const chunkIndex = Math.floor(chunkStart / IMAGE_BATCH_CHUNK_SIZE) + 1
          const chunkFiles = selected.slice(
            chunkStart,
            chunkStart + IMAGE_BATCH_CHUNK_SIZE
          )

          syncBatchProgress(added, failures.length, processed, chunkIndex)

          await mapWithConcurrency(
            chunkFiles,
            IMAGE_BATCH_CONCURRENCY,
            async (f, j) => {
              const globalIndex = chunkStart + j
              const objectUrl = URL.createObjectURL(f)
              try {
                let blob: Blob
                try {
                  const result = await compressSingle({
                    objectUrl,
                    originalFile: f,
                    allowKeepOriginal: false,
                  })
                  blob = result.blob
                } catch {
                  return {
                    ok: false as const,
                    failure: {
                      fileName: f.name,
                      reason:
                        "Komprimierung fehlgeschlagen (Datei konnte nicht verarbeitet werden).",
                    },
                  }
                }

                let buf: Uint8Array
                try {
                  buf = new Uint8Array(await blob.arrayBuffer())
                } catch {
                  return {
                    ok: false as const,
                    failure: {
                      fileName: f.name,
                      reason: "Komprimierte Datei konnte nicht gelesen werden.",
                    },
                  }
                }

                if (isHtmlOrTextPayload(buf)) {
                  return {
                    ok: false as const,
                    failure: {
                      fileName: f.name,
                      reason:
                        "Keine gültigen Bilddaten (Datei ist beschädigt oder kein Bild).",
                    },
                  }
                }
                const detected = detectImageExtension(buf)
                if (!detected) {
                  return {
                    ok: false as const,
                    failure: {
                      fileName: f.name,
                      reason: "Ausgabe ist kein unterstütztes Bildformat.",
                    },
                  }
                }
                if (!bufferMatchesExportFormat(buf, format)) {
                  return {
                    ok: false as const,
                    failure: {
                      fileName: f.name,
                      reason: `Encoder lieferte ${detected}, gewünscht war ${format}. Bitte erneut komprimieren.`,
                    },
                  }
                }

                return {
                  ok: true as const,
                  buf,
                  inBytes: f.size,
                  outBytes: buf.byteLength,
                  base: sanitizeZipBaseName(f.name) || `bild-${globalIndex + 1}`,
                  ext: zipEntryExtension(format, buf),
                }
              } finally {
                URL.revokeObjectURL(objectUrl)
              }
            },
            (_index, result) => {
              processed += 1
              if (!result.ok) {
                failures.push(result.failure)
              } else {
                totalInBytes += result.inBytes
                totalOutBytes += result.outBytes
                const outName = uniqueZipEntryName(result.base, result.ext, usedNames)
                entries[outName] = result.buf
                added += 1
              }
              syncBatchProgress(added, failures.length, processed, chunkIndex)
            }
          )
          await yieldToMain()
        }

        if (added === 0) {
          return false
        }

        if (failures.length > 0) {
          const report = buildBatchCompressReport(failures, added, total)
          entries[BATCH_COMPRESS_REPORT_FILENAME] = batchReportToZipBytes(report)
        }

        syncBatchProgress(added, failures.length, total, totalChunks)

        let zipped: Uint8Array
        try {
          zipped = zipSync(entries, { level: 0 })
        } catch {
          toast.error("ZIP-Erstellung fehlgeschlagen")
          return false
        }

        const zipBlob = new Blob([new Uint8Array(zipped)], { type: "application/zip" })
        const zipName = `bilder-komprimiert-${Date.now()}.zip`
        setZipReady({
          name: zipName,
          blob: zipBlob,
          totalInBytes,
          totalOutBytes,
          count: added,
        })
        setPhase("comparing")
        return true
      } catch {
        toast.error("Unerwarteter Fehler bei der ZIP-Erstellung")
        return false
      } finally {
        setCompressBusy(false)
        setBatchProgress(null)
      }
    }

    // Single file: keep before/after experience
    if (!imageData) return false
    const originalFile = selected[0]
    if (!originalFile) return false

    try {
      const { blob, outType, keptOriginal, usedDownscale } = await compressSingle({
        objectUrl: imageData,
        originalFile,
      })

      setKeptOriginalNoGain(keptOriginal)
      setOutputWasDownscaled(usedDownscale && !keptOriginal)

      const raw = await blobToURL(blob)
      const url = typeof raw === "string" ? raw : ""
      if (!url) {
        toast.error("Ausgabe konnte nicht erstellt werden.")
        return false
      }

      setResultSize(blob.size)
      setResultType(outType)
      setResultData(url)

      if (keptOriginal) {
        toast.message(
          "Original beibehalten — Re-Encode war nicht kleiner. Probier geringere Qualität oder ein anderes Format.",
          { duration: 6000 }
        )
      } else if (usedDownscale) {
        toast.success("Optimiert (zusätzlich verkleinert für weniger Bytes)")
      } else {
        toast.success("Optimiert")
      }
      return true
    } catch {
      toast.error("Komprimierung fehlgeschlagen")
      return false
    }
  }, [compressSingle, files, imageData, format])

  const runCompressionRef = useRef(runCompression)
  useEffect(() => {
    runCompressionRef.current = runCompression
  }, [runCompression])

  const handleDataChange = async (file: File[] | null) => {
    setEmptyShellHover(false)
    if (imageData) URL.revokeObjectURL(imageData)
    if (resultData?.startsWith("blob:")) URL.revokeObjectURL(resultData)

    countdownRunId.current += 1
    setZipReady(null)

    if (!file?.[0]) {
      setFiles(null)
      setImageData(null)
      setImageSize(null)
      setImageType(null)
      setResultData(null)
      setResultSize(null)
      setResultType(null)
      setKeptOriginalNoGain(false)
      setOutputWasDownscaled(false)
      setPhase("empty")
      return
    }

    const url = URL.createObjectURL(file[0])
    setFiles(file)
    setImageData(url)
    setImageSize(file[0].size)
    setImageType(await getImageTypeFromUrl(url))
    setResultData(null)
    setResultSize(null)
    setResultType(null)
    setKeptOriginalNoGain(false)
    setOutputWasDownscaled(false)
    setPhase(file.length > 1 ? "ready" : immersive ? "ready" : "countdown")
  }

  const handleClear = useCallback(() => {
    setEmptyShellHover(false)
    countdownRunId.current += 1
    if (imageData) URL.revokeObjectURL(imageData)
    if (resultData?.startsWith("blob:")) URL.revokeObjectURL(resultData)
    setFiles(null)
    setImageData(null)
    setImageSize(null)
    setImageType(null)
    setResultData(null)
    setResultSize(null)
    setResultType(null)
    setKeptOriginalNoGain(false)
    setOutputWasDownscaled(false)
    setZipReady(null)
    setPhase("empty")
  }, [imageData, resultData])

  const handleDownload = () => {
    if (zipReady) {
      const link = document.createElement("a")
      link.href = URL.createObjectURL(zipReady.blob)
      link.download = zipReady.name
      link.click()
      return
    }
    if (!resultData) return
    const ext =
      format === "auto"
        ? resultType ?? imageType ?? "webp"
        : exportExtensionForFormat(format)
    const link = document.createElement("a")
    link.href = resultData
    link.download = `bild-komprimiert-${Date.now()}.${ext}`
    link.click()
  }

  /** Brief pause with loader only, then compress; cancelled if run id changes. */
  useEffect(() => {
    if (phase !== "countdown" || !imageData) return

    const runId = countdownRunId.current
    const t = window.setTimeout(() => {
      if (countdownRunId.current !== runId) return
      void (async () => {
        if (countdownRunId.current !== runId) return
        const ok = await runCompressionRef.current()
        if (countdownRunId.current !== runId) return
        if (ok) setPhase("comparing")
      })()
    }, PREVIEW_PAUSE_MS)

    return () => window.clearTimeout(t)
  }, [phase, imageData])

  const hasImage = Boolean(imageData)
  const showComparison = phase === "comparing" && Boolean(resultData)
  const multiSelected = (files?.length ?? 0) > 1
  const showLoaderPreview = phase === "countdown" && Boolean(imageData) && !immersive

  const dropzoneLabel = useMemo(() => {
    const n = files?.length ?? 0
    if (n === 0) return ""
    if (n === 1) return files![0]!.name
    return `${n} Dateien ausgewählt`
  }, [files])

  const dropzoneOptions = {
    multiple: true,
    maxFiles: MAX_IMAGE_BATCH,
    maxSize: 80 * 1024 * 1024,
    getFilesFromEvent: getImageFilesFromDropEvent,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/bmp": [".bmp"],
    },
  } as const

  const pageDragOverlay = useFullscreenFileDragOverlay(
    Boolean(immersive && !hasImage)
  )

  const shellBorderActive =
    immersive && !hasImage && (pageDragOverlay || emptyShellHover)

  const openSettingsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setSettingsOpen(true)
  }, [])

  const stopSettingsPointer = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
  }, [])

  const settingsBtnCard = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-lg text-muted-foreground hover:text-foreground"
      aria-label="Komprimierungs-Einstellungen"
      onClick={openSettingsClick}
      onPointerDown={stopSettingsPointer}
    >
      <Settings className="size-4" />
    </Button>
  )

  const batchCompressOverlay =
    compressBusy && multiSelected ? (
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader size={28} className="relative z-10 text-muted-foreground" />
        {batchProgress ? (
          <div className="relative z-10 space-y-0.5 px-4 text-center">
            <p className="text-sm font-medium text-foreground">Komprimiere…</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {batchProgress.processed}/{batchProgress.total}
              {batchProgress.failed > 0 ? ` · ${batchProgress.failed} Fehler` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Stapel {batchProgress.chunkCurrent}/{batchProgress.chunkTotal}
            </p>
          </div>
        ) : null}
      </div>
    ) : null

  const workspacePanel = hasImage ? (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col sm:flex-row">
      {!hero ? (
        <BatchCompressVideoHost active={compressBusy && multiSelected} />
      ) : null}
      {batchCompressOverlay}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col justify-center p-3 sm:p-4">
        <div className="relative flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-center rounded-xl bg-muted/30 p-2 ring-1 ring-border/25 dark:bg-muted/20">
          {imageData && !multiSelected ? (
            <Image
              width={800}
              height={600}
              unoptimized
              className="h-auto max-h-full w-full max-w-full rounded-lg object-contain"
              src={showComparison && resultData ? resultData : imageData}
              alt={showComparison ? "Komprimiertes Bild" : "Bild zum Komprimieren"}
            />
          ) : multiSelected ? (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <Icons.SolarGalleryBoldDuotone className="size-14 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                {files?.length ?? 0} Bilder bereit
              </p>
              <p className="text-xs text-muted-foreground">
                Komprimieren erzeugt eine ZIP-Datei zum Download.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <aside
        className="flex w-full shrink-0 flex-col self-stretch border-t border-border/45 bg-muted/15 shadow-none dark:bg-muted/10 sm:max-w-[min(100%,22rem)] sm:border-t-0 sm:border-l"
        aria-label="Komprimierungs-Einstellungen"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          <div className="min-w-0 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Datei{multiSelected ? "en" : ""}
                </p>
                {imageData && imageSize != null ? (
                  <p className="mt-1.5 text-sm font-medium text-foreground">
                    {multiSelected
                      ? `${files?.length ?? 0} Dateien ausgewählt`
                      : `${filesize(imageSize)} · image/${imageType}`}
                  </p>
                ) : null}
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Bleibt in diesem Browser. Stelle Format/Qualität ein und lade
                  herunter.
                </p>
              </div>
              {!hero ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground"
                  onClick={handleClear}
                  aria-label="Bild entfernen"
                >
                  <XCircle className="size-4" />
                </Button>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-border/35 pt-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Stärke
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "leicht" as const, label: "Leicht" },
                      { id: "mittel" as const, label: "Mittel" },
                      { id: "stark" as const, label: "Stark" },
                    ] as const
                  ).map((opt) => {
                    const active = preset === opt.id
                    return (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className="h-9 w-full rounded-lg"
                        onClick={() => {
                          setPreset(opt.id)
                          setQuality(presetQuality(opt.id))
                        }}
                      >
                        {opt.label}
                      </Button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {preset === "custom"
                    ? `Custom · Qualität ${quality}`
                    : `Qualität ${quality}`}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Export-Format
                </Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="h-9 w-full bg-background/90 text-sm">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">auto</SelectItem>
                    <SelectItem value="webp">webp</SelectItem>
                    <SelectItem value="png">png</SelectItem>
                    <SelectItem value="jpeg">jpeg</SelectItem>
                    <SelectItem value="bmp">bmp</SelectItem>
                    <SelectItem value="gif">gif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {format === "webp" || format === "jpeg" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Qualität</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {quality}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={100}
                    value={[quality]}
                    onValueChange={(value) => {
                      const v = value[0] ?? quality
                      setQuality(v)
                      setPreset("custom")
                    }}
                  />
                </div>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden h-8 w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground md:inline-flex"
                onClick={openSettingsClick}
              >
                <Settings className="size-3.5" />
                Erweiterte Einstellungen
              </Button>
            </div>

            {zipReady ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3">
                <p className="text-xs font-medium text-muted-foreground">ZIP bereit</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {zipReady.count} Dateien · {filesize(zipReady.totalInBytes)} →{" "}
                  {filesize(zipReady.totalOutBytes)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Download erzeugt eine ZIP-Datei.
                </p>
              </div>
            ) : null}

            {showComparison && resultData && imageSize != null && resultSize != null ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Nach der Komprimierung
                </p>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      keptOriginalNoGain
                        ? "text-muted-foreground"
                        : resultSize < imageSize
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-500"
                    )}
                  >
                    {keptOriginalNoGain
                      ? "Originalgröße beibehalten"
                      : resultSize < imageSize
                        ? `−${Math.round((1 - resultSize / imageSize) * 100)}% · ${filesize(resultSize)}`
                        : `+${Math.round((resultSize / imageSize - 1) * 100)}% · ${filesize(resultSize)}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {resultType ? `image/${resultType}` : null}
                </p>
              </div>
            ) : null}

            {showComparison && (keptOriginalNoGain || outputWasDownscaled) ? (
              <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                {keptOriginalNoGain ? (
                  <p>
                    Re-Encode war nicht kleiner (typisch bei bereits optimierten
                    Smartphone-JPEGs). Das Original wird zum Download beibehalten.
                  </p>
                ) : null}
                {outputWasDownscaled ? (
                  <p>
                    Lange Kante auf {MAX_ENCODE_LONG_EDGE_PX}px begrenzt, damit die
                    Datei kleiner wird.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 border-t border-border/40 bg-muted/20 p-4 dark:bg-muted/10 sm:p-5">
          <p className="text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {zipReady || (showComparison && resultData)
              ? "Bereit zum Download"
              : "Bereit"}
          </p>
          <div className="relative w-full">
            {zipReady || (showComparison && resultData) ? (
              !compressBusy ? (
                <span
                  className="pointer-events-none absolute -inset-0.5 z-0 rounded-md border-2 border-primary animate-pulse"
                  aria-hidden
                />
              ) : null
            ) : null}
            <Button
              type="button"
              size="lg"
              className="relative z-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-base font-semibold"
              disabled={compressBusy}
              onClick={async () => {
                if (compressBusy) return
                if (zipReady) {
                  handleDownload()
                  return
                }
                if (showComparison && resultData) {
                  handleDownload()
                  return
                }
                setCompressBusy(true)
                try {
                  const ok = await runCompression()
                  if (ok) setPhase("comparing")
                } finally {
                  setCompressBusy(false)
                }
              }}
            >
              {compressBusy ? (
                "Arbeite…"
              ) : zipReady || (showComparison && resultData) ? (
                <>
                  <DownloadCloud className="size-5 shrink-0" strokeWidth={2.2} />
                  Download
                </>
              ) : (
                <>
                  <Zap className="size-5 shrink-0" strokeWidth={2.2} />
                  Komprimieren
                </>
              )}
            </Button>
          </div>
          {zipReady || (showComparison && resultData) ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-base font-semibold"
              onClick={handleClear}
            >
              <RefreshCw className="size-5 shrink-0" strokeWidth={2.2} />
              Neu starten
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  ) : null

  const compressionSettingsDialog = (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
        </DialogHeader>

        <Label className="mt-2">Format</Label>
        <div className="flex flex-col gap-2">
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Export-Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">auto</SelectItem>
              <SelectItem value="webp">webp</SelectItem>
              <SelectItem value="png">png</SelectItem>
              <SelectItem value="jpeg">jpeg</SelectItem>
              <SelectItem value="bmp">bmp</SelectItem>
              <SelectItem value="gif">gif</SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-2 flex items-center gap-2 rounded bg-muted/90 p-4 text-neutral-600 dark:text-neutral-400">
            <Info className="flex size-4 shrink-0" />
            <p className="text-sm">
              <b>webp</b> und <b>jpeg</b> komprimieren besonders gut und erlauben
              eine Qualitätssteuerung.
            </p>
          </div>
        </div>

        {(format === "webp" || format === "jpeg") && (
          <>
            <Label className="mt-2">Qualität</Label>
            <div className="flex items-center gap-3">
              <Slider
                min={1}
                max={100}
                value={[quality]}
                onValueChange={(value) => {
                  const v = value[0] ?? quality
                  setQuality(v)
                  setPreset("custom")
                }}
              />
              <p className="w-10 text-right tabular-nums">{quality}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )

  if (hero) {
    return (
      <div className="relative flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
        <BatchCompressVideoHost active={compressBusy} />
        <h1 className="sr-only">Bilder komprimieren</h1>
        {compressionSettingsDialog}

        {(zipReady || (showComparison && resultData)) && !compressBusy ? (
          <div className="shrink-0 border-b border-primary/25 bg-primary/5 px-4 py-2.5 text-sm text-foreground lg:px-6">
            {zipReady
              ? "ZIP ist bereit — klicke auf Download."
              : "Fertig — klicke auf Download."}
          </div>
        ) : null}

        {compressBusy ? (
          <BatchCompressBusyView progress={batchProgress} />
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
            }}
          >
            <div
              className={cn(
                "relative z-[1] flex min-h-0 w-full min-w-0 flex-1 flex-col",
                hasImage && "gap-4"
              )}
            >
              {hasImage ? (
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={handleClear}
                  >
                    Zurücksetzen
                  </Button>
                </div>
              ) : null}
              <div className="min-h-0 w-full flex-1">
                {!hasImage ? (
                  <ImageDropzone
                    variant="hero"
                    className="flex h-full min-h-0 flex-col"
                    fileLabel={dropzoneLabel}
                    maxFiles={MAX_IMAGE_BATCH}
                    onFiles={(accepted) =>
                      void handleDataChange(accepted.length ? accepted : null)
                    }
                    disabled={compressBusy}
                  />
                ) : (
                  workspacePanel
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("relative w-full min-w-0")}>
      {compressionSettingsDialog}

      {immersive && pageDragOverlay && !hasImage ? (
        <div
          className="pointer-events-none fixed inset-0 z-45 flex items-center justify-center bg-primary/20 backdrop-blur-[2px] dark:bg-primary/25"
          aria-hidden
        >
          <p className="text-lg font-medium tracking-tight text-foreground drop-shadow-sm">
            Bild hier ablegen
          </p>
        </div>
      ) : null}

      <FileUploader
        value={files}
        dropzoneOptions={dropzoneOptions}
        onValueChange={handleDataChange}
        className="relative w-full space-y-0"
      >
        <div
          className={cn(
            "bg-background overflow-hidden rounded-2xl border border-border/60",
            compact &&
              cn(
                "flex w-full flex-col bg-white transition-colors dark:bg-zinc-900",
                shellBorderActive ? "border-foreground/30" : "border-border/60"
              )
          )}
          onMouseEnter={() => {
            if (immersive && !hasImage) setEmptyShellHover(true)
          }}
          onMouseLeave={() => setEmptyShellHover(false)}
        >
          <CompressorCardHeader settingsTrigger={settingsBtnCard} immersive={immersive} />

          {workspacePanel ? (
            workspacePanel
          ) : (
            <div className={cn("flex shrink-0 flex-col px-3 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5")}>
              <div className="w-full min-w-0">
                <ImageDropzone
                  variant="hero"
                  className="flex h-full min-h-0 flex-col"
                  fileLabel={dropzoneLabel}
                  maxFiles={MAX_IMAGE_BATCH}
                  onFiles={(accepted) =>
                    void handleDataChange(accepted.length ? accepted : null)
                  }
                  disabled={compressBusy}
                />
              </div>
              <FileUploaderContent />
            </div>
          )}

          {showLoaderPreview ? (
            <div className="shrink-0 border-t border-border/60 px-4 pb-4 sm:px-6">
              <div
                className="flex w-full flex-col items-center justify-center rounded-xl bg-muted/20 py-12 sm:min-h-[240px]"
                aria-busy
                aria-label="Loading"
              >
                <Loader size={16} className="text-muted-foreground" />
              </div>
            </div>
          ) : null}
        </div>
      </FileUploader>

      {isDev ? (
        <div className="mt-4 hidden">
          <AdSenseComponent slotId="dev" />
        </div>
      ) : null}
    </div>
  )
}

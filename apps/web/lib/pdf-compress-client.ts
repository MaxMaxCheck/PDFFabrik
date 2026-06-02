import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
} from "pdf-lib"

const MAX_BYTES = 80 * 1024 * 1024
const MIN_IMAGE_BYTES = 4_096
const MIN_IMAGE_PIXELS = 32 * 32
/** Canvas-Qualität: selbst „Max.“ bleibt über 0.35 — verhindert kaputte Mini-JPEGs. */
const CANVAS_QUALITY_FLOOR = 0.35
const CANVAS_QUALITY_CEIL = 0.95

export type CompressPdfProgress = (step: string, progress: number) => void

export type CompressPdfResult = {
  blob: Blob
  originalSize: number
  compressedSize: number
  keptOriginal: boolean
}

function filterNames(dict: PDFDict): string[] {
  const filter = dict.get(PDFName.of("Filter"))
  if (!filter) return []
  if (filter instanceof PDFName) return [filter.decodeText()]
  if (filter instanceof PDFArray) {
    return filter.asArray().map((entry) => {
      if (entry instanceof PDFName) return entry.decodeText()
      return ""
    })
  }
  return []
}

function isImageXObject(dict: PDFDict): boolean {
  return dict.get(PDFName.of("Subtype")) === PDFName.of("Image")
}

function imageDimensions(dict: PDFDict): { width: number; height: number } {
  const w = dict.get(PDFName.of("Width"))
  const h = dict.get(PDFName.of("Height"))
  return {
    width: w instanceof PDFNumber ? w.asNumber() : 0,
    height: h instanceof PDFNumber ? h.asNumber() : 0,
  }
}

function hasImageMask(dict: PDFDict): boolean {
  const imageMask = dict.get(PDFName.of("ImageMask"))
  return (
    dict.get(PDFName.of("SMask")) != null ||
    dict.get(PDFName.of("Mask")) != null ||
    (imageMask instanceof PDFBool && imageMask.asBoolean())
  )
}

function hasUnsupportedColorSpace(dict: PDFDict): boolean {
  const cs = dict.get(PDFName.of("ColorSpace"))
  if (cs instanceof PDFName) {
    const name = cs.decodeText()
    return name === "Indexed" || name === "Separation" || name === "DeviceN"
  }
  if (cs instanceof PDFArray) {
    const first = cs.get(0)
    if (first instanceof PDFName) {
      const name = first.decodeText()
      return name === "Indexed" || name === "Separation" || name === "DeviceN"
    }
  }
  return false
}

/** Nur eingebettete JPEG-Streams anfassen — nie Flate/PNG-Rohdaten o. Ä. raten. */
function isSafeEmbeddedJpeg(filters: string[]): boolean {
  if (!filters.includes("DCTDecode")) return false
  const blocked = ["JPXDecode", "CCITTFaxDecode", "JBIG2Decode", "RunLengthDecode"]
  return !filters.some((f) => blocked.includes(f))
}

function sliderToCanvasQuality(qualityPercent: number): number {
  const clamped = Math.max(20, Math.min(95, Math.round(qualityPercent)))
  const t = (clamped - 20) / (95 - 20)
  return CANVAS_QUALITY_FLOOR + t * (CANVAS_QUALITY_CEIL - CANVAS_QUALITY_FLOOR)
}

function copyImageDict(pdfDoc: PDFDocument, source: PDFDict): PDFDict {
  return PDFDict.fromMapWithContext(new Map(source.entries()), pdfDoc.context)
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Bild konnte nicht dekodiert werden."))
    img.src = url
  })
}

async function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  qualityFactor: number
): Promise<Uint8Array> {
  const q = Math.min(CANVAS_QUALITY_CEIL, Math.max(CANVAS_QUALITY_FLOOR, qualityFactor))
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("JPEG-Encode fehlgeschlagen."))),
      "image/jpeg",
      q
    )
  })
  return new Uint8Array(await blob.arrayBuffer())
}

async function reencodeJpegBytes(
  jpegBytes: Uint8Array,
  qualityFactor: number
): Promise<Uint8Array | null> {
  const url = URL.createObjectURL(
    new Blob([jpegBytes.slice()], { type: "image/jpeg" })
  )
  try {
    const img = await loadImageFromUrl(url)
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (w * h < MIN_IMAGE_PIXELS) return null

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvasToJpegBytes(canvas, qualityFactor)
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function verifyReencodedJpeg(
  jpegBytes: Uint8Array,
  expectedWidth: number,
  expectedHeight: number,
  originalByteLength: number
): Promise<boolean> {
  if (jpegBytes.length < 128) return false
  if (jpegBytes.length >= originalByteLength) return false

  const pixels = expectedWidth * expectedHeight
  if (pixels > 0) {
    const minReasonable = Math.max(256, Math.floor(pixels * 0.015))
    if (jpegBytes.length < minReasonable) return false
  }

  const url = URL.createObjectURL(
    new Blob([jpegBytes.slice()], { type: "image/jpeg" })
  )
  try {
    const img = await loadImageFromUrl(url)
    if (img.naturalWidth < 1 || img.naturalHeight < 1) return false
    if (expectedWidth > 0 && expectedHeight > 0) {
      if (Math.abs(img.naturalWidth - expectedWidth) > 2) return false
      if (Math.abs(img.naturalHeight - expectedHeight) > 2) return false
    }
    return true
  } catch {
    return false
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function tryRecompressImageStream(
  pdfDoc: PDFDocument,
  ref: PDFRef,
  stream: PDFRawStream,
  qualityPercent: number
): Promise<boolean> {
  const dict = stream.dict
  if (!isImageXObject(dict) || hasImageMask(dict) || hasUnsupportedColorSpace(dict)) {
    return false
  }

  const { width, height } = imageDimensions(dict)
  const pixels = width * height
  if (pixels > 0 && pixels < MIN_IMAGE_PIXELS) return false

  const contents = stream.getContents()
  if (contents.length < MIN_IMAGE_BYTES) return false

  const filters = filterNames(dict)
  if (!isSafeEmbeddedJpeg(filters)) return false

  const qualityFactor = sliderToCanvasQuality(qualityPercent)
  const reencoded = await reencodeJpegBytes(contents, qualityFactor)
  if (!reencoded) return false

  const ok = await verifyReencodedJpeg(reencoded, width, height, contents.length)
  if (!ok) return false

  const newDict = copyImageDict(pdfDoc, dict)
  newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"))
  newDict.delete(PDFName.of("DecodeParms"))
  if (width > 0) newDict.set(PDFName.of("Width"), PDFNumber.of(width))
  if (height > 0) newDict.set(PDFName.of("Height"), PDFNumber.of(height))
  newDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"))
  newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8))

  pdfDoc.context.assign(ref, PDFRawStream.of(newDict, reencoded))
  return true
}

function collectImageStreams(pdfDoc: PDFDocument): Array<[PDFRef, PDFRawStream]> {
  const out: Array<[PDFRef, PDFRawStream]> = []
  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue
    if (!isImageXObject(obj.dict)) continue
    out.push([ref, obj])
  }
  return out
}

/**
 * Komprimiert PDFs lokal: nur eingebettete JPEGs werden neu encodiert, wenn das Ergebnis
 * gültig und kleiner ist. Alle anderen Bilder bleiben 1:1 unverändert.
 */
export async function compressPdfInBrowser(
  file: File,
  imageQuality: number,
  onProgress?: CompressPdfProgress
): Promise<CompressPdfResult> {
  if (file.size > MAX_BYTES) {
    throw new Error("PDF ist zu groß (max. 80 MB).")
  }

  const originalSize = file.size
  onProgress?.("PDF wird geladen …", 5)

  const pdfBytes = new Uint8Array(await file.arrayBuffer())
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  })

  const images = collectImageStreams(pdfDoc)
  const quality = Math.max(20, Math.min(95, Math.round(imageQuality)))
  let recompressed = 0

  for (let i = 0; i < images.length; i += 1) {
    const pct = 10 + Math.round((i / Math.max(images.length, 1)) * 70)
    onProgress?.(
      images.length > 0
        ? `Bilder werden optimiert (${i + 1}/${images.length}) …`
        : "Struktur wird optimiert …",
      pct
    )
    const [ref, stream] = images[i]!
    if (await tryRecompressImageStream(pdfDoc, ref, stream, quality)) {
      recompressed += 1
    }
  }

  onProgress?.("PDF wird gespeichert …", 88)
  const outBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  })

  const compressedSize = outBytes.length
  if (compressedSize >= originalSize) {
    onProgress?.("Original ist bereits kleiner — unverändert.", 100)
    return {
      blob: file,
      originalSize,
      compressedSize: originalSize,
      keptOriginal: true,
    }
  }

  onProgress?.(
    recompressed > 0
      ? `Fertig — ${recompressed} Bild(er) optimiert.`
      : "Fertig — Struktur komprimiert.",
    100
  )

  return {
    blob: new Blob([Uint8Array.from(outBytes)], { type: "application/pdf" }),
    originalSize,
    compressedSize,
    keptOriginal: false,
  }
}

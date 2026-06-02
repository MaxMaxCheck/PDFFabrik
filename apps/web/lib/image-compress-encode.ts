/**
 * Lossy Encode via jSquash WASM (libwebp + MozJPEG Familie, ähnlich Squoosh).
 */

export async function imageObjectUrlToImageData(
  objectUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<ImageData> {
  const img = new Image()
  img.decoding = "async"
  img.src = objectUrl

  if (typeof img.decode === "function") {
    await img.decode()
  } else {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Image load failed"))
    })
  }

  const nw = img.naturalWidth
  const nh = img.naturalHeight
  const w = targetWidth > 0 ? targetWidth : nw
  const h = targetHeight > 0 ? targetHeight : nh

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Could not get canvas context")
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

async function encodeWebpLossy(
  data: ImageData,
  quality: number
): Promise<ArrayBuffer> {
  const { default: encode } = await import("@jsquash/webp/encode")
  const q = Math.min(100, Math.max(1, Math.round(quality)))
  return encode(data, {
    quality: q,
    method: 4,
    sns_strength: 50,
    filter_strength: 60,
    segments: 4,
    pass: 1,
  })
}

async function encodeJpegLossy(
  data: ImageData,
  quality: number
): Promise<ArrayBuffer> {
  const { default: encode } = await import("@jsquash/jpeg/encode")
  const q = Math.min(100, Math.max(1, Math.round(quality)))
  return encode(data, {
    quality: q,
    baseline: false,
    progressive: true,
    optimize_coding: true,
    smoothing: 0,
  })
}

export async function encodeLossyWasm(
  data: ImageData,
  format: "webp" | "jpeg",
  quality: number
): Promise<Blob> {
  const buf =
    format === "webp"
      ? await encodeWebpLossy(data, quality)
      : await encodeJpegLossy(data, quality)
  const type = format === "webp" ? "image/webp" : "image/jpeg"
  return new Blob([buf], { type })
}


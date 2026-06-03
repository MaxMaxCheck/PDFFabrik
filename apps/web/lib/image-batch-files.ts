import type { DropEvent } from "react-dropzone"

/** Max. Bilder pro Komprimierungs-Lauf (Browser-Speicher / ZIP). */
export const MAX_IMAGE_BATCH = 1000

const IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/bmp",
  "image/gif",
])

const IMAGE_EXT = /\.(jpe?g|png|webp|bmp|gif)$/i

export function isSupportedImageFile(file: File): boolean {
  if (file.type && IMAGE_MIME.has(file.type)) return true
  return IMAGE_EXT.test(file.name)
}

export function capImageBatch(
  files: File[],
  limit: number = MAX_IMAGE_BATCH
): { files: File[]; truncated: boolean } {
  if (files.length <= limit) return { files, truncated: false }
  return { files: files.slice(0, limit), truncated: true }
}

async function readDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = []
  let batch: FileSystemEntry[]
  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
    all.push(...batch)
  } while (batch.length > 0)
  return all
}

async function entryToFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      ;(entry as FileSystemFileEntry).file(resolve, reject)
    })
    return [file]
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const children = await readDirectoryEntries(reader)
    const nested = await Promise.all(children.map(entryToFiles))
    return nested.flat()
  }
  return []
}

async function filesFromDataTransferItems(items: DataTransferItemList): Promise<File[]> {
  const entries = await Promise.all(
    Array.from(items)
      .filter((item) => item.kind === "file")
      .map(async (item) => {
        const entry = item.webkitGetAsEntry?.() ?? null
        if (entry) return entryToFiles(entry)
        const file = item.getAsFile()
        return file ? [file] : []
      })
  )
  return entries.flat()
}

/** Ordner-Drag & Drop sowie flache Dateilisten (inkl. Dateiauswahl). */
export async function getImageFilesFromDropEvent(event: DropEvent): Promise<File[]> {
  if ("dataTransfer" in event && event.dataTransfer?.items?.length) {
    const fromItems = await filesFromDataTransferItems(event.dataTransfer.items)
    if (fromItems.length > 0) {
      return fromItems.filter(isSupportedImageFile)
    }
  }

  if ("dataTransfer" in event && event.dataTransfer?.files?.length) {
    return Array.from(event.dataTransfer.files).filter(isSupportedImageFile)
  }

  if ("target" in event && event.target instanceof HTMLInputElement && event.target.files) {
    return Array.from(event.target.files).filter(isSupportedImageFile)
  }

  return []
}

export const BATCH_COMPRESS_VIDEO_ID = "-PFNNcTmV-U"

export function batchVideoStorageKey(videoId: string): string {
  return `pdffabrik.batch-video-position.${videoId}`
}

export function readBatchVideoPosition(videoId: string): number {
  if (typeof sessionStorage === "undefined") return 0
  const raw = sessionStorage.getItem(batchVideoStorageKey(videoId))
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

export function writeBatchVideoPosition(videoId: string, seconds: number): void {
  if (typeof sessionStorage === "undefined") return
  const safe = Math.max(0, Math.floor(seconds))
  sessionStorage.setItem(batchVideoStorageKey(videoId), String(safe))
}

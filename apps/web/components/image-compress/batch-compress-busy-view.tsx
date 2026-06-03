"use client"

import { Loader } from "@/components/loader"
import { IMAGE_BATCH_CHUNK_SIZE } from "@/lib/image-batch-compress-runner"

export type BatchCompressProgress = {
  processed: number
  total: number
  succeeded: number
  failed: number
  chunkCurrent: number
  chunkTotal: number
}

type BatchCompressBusyViewProps = {
  progress: BatchCompressProgress | null
}

/** Vollbild-Ansicht während der Batch-Komprimierung (Video liegt im Host darunter). */
export function BatchCompressBusyView({ progress }: BatchCompressBusyViewProps) {
  return (
    <div
      className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader size={36} className="text-muted-foreground" />
      <div className="space-y-1 text-center">
        <p className="text-base font-medium text-foreground">
          Bilder werden komprimiert…
        </p>
        {progress ? (
          <>
            <p className="text-sm tabular-nums text-muted-foreground">
              {progress.succeeded} komprimiert
              {progress.failed > 0 ? ` · ${progress.failed} fehlerhaft` : ""}{" "}
              ({progress.processed}/{progress.total})
            </p>
            <p className="text-xs text-muted-foreground">
              Stapel {progress.chunkCurrent}/{progress.chunkTotal} · je{" "}
              {IMAGE_BATCH_CHUNK_SIZE} Bilder
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}

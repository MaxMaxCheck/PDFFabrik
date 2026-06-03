"use client"

import { useEffect, useState } from "react"

import {
  BatchCompressBusyView,
  type BatchCompressProgress,
} from "@/components/image-compress/batch-compress-busy-view"
import { BatchCompressVideoHost } from "@/components/image-compress/batch-compress-video-host"
import {
  IMAGE_BATCH_CHUNK_SIZE,
  chunkCount,
} from "@/lib/image-batch-compress-runner"

const LOOP_MS = 25_000
const SIM_TOTAL = 500
const SIM_FAILED = 3

function progressAtElapsed(elapsedMs: number): BatchCompressProgress {
  const t = (elapsedMs % LOOP_MS) / LOOP_MS
  const processed = Math.min(SIM_TOTAL, Math.floor(t * SIM_TOTAL))
  const failed =
    processed >= SIM_TOTAL - 40
      ? Math.min(SIM_FAILED, Math.floor((processed - (SIM_TOTAL - 40)) / 12))
      : 0
  const succeeded = Math.max(0, processed - failed)
  const chunkTotal = chunkCount(SIM_TOTAL, IMAGE_BATCH_CHUNK_SIZE)
  const chunkCurrent = Math.min(
    chunkTotal,
    Math.max(1, Math.ceil(processed / IMAGE_BATCH_CHUNK_SIZE) || 1)
  )

  return {
    processed,
    total: SIM_TOTAL,
    succeeded,
    failed,
    chunkCurrent,
    chunkTotal,
  }
}

/** Simuliert Batch-Komprimierung (500 Bilder, 25s-Loop) — nur für /test. */
export function BatchCompressPreview() {
  const [progress, setProgress] = useState<BatchCompressProgress>(() =>
    progressAtElapsed(0)
  )

  useEffect(() => {
    const started = performance.now()
    const id = window.setInterval(() => {
      setProgress(progressAtElapsed(performance.now() - started))
    }, 80)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="relative flex h-[calc(100svh-3rem)] min-h-[28rem] flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="relative z-10 shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-950 dark:text-amber-100">
        Vorschau — kein echter Upload · Fortschritt loop alle 25&nbsp;s · Position wird
        gespeichert ·{" "}
        <a
          href="/bilder-komprimieren"
          className="font-medium underline underline-offset-2"
        >
          zum Tool
        </a>
      </div>
      <BatchCompressVideoHost active interactive />
      <BatchCompressBusyView progress={progress} />
    </div>
  )
}

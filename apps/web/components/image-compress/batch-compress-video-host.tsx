"use client"

import { useEffect, useRef } from "react"

import {
  BATCH_COMPRESS_VIDEO_ID,
  readBatchVideoPosition,
  writeBatchVideoPosition,
} from "@/lib/batch-compress-video-position"
import { cn } from "@workspace/ui/lib/utils"

type YtPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getPlayerState?: () => number
  destroy: () => void
}

type BatchCompressVideoHostProps = {
  /** Sichtbar + Wiedergabe */
  active: boolean
  videoId?: string
  interactive?: boolean
  className?: string
}

let apiLoadPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise((resolve) => {
    const done = () => resolve()
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      done()
    }
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      script.async = true
      document.head.appendChild(script)
    } else if (window.YT?.Player) {
      done()
    }
  })
  return apiLoadPromise
}

/**
 * Bleibt gemountet — Position in sessionStorage, beim nächsten „Komprimieren“ weiterspielen.
 */
export function BatchCompressVideoHost({
  active,
  videoId = BATCH_COMPRESS_VIDEO_ID,
  interactive = false,
  className,
}: BatchCompressVideoHostProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    let cancelled = false

    void loadYouTubeIframeApi().then(() => {
      if (cancelled || !mountRef.current || playerRef.current) return
      const YT = window.YT
      if (!YT?.Player) return

      const startAt = readBatchVideoPosition(videoId)

      playerRef.current = new YT.Player(mountRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          loop: 1,
          playlist: videoId,
          playsinline: 1,
          modestbranding: 1,
          controls: interactive ? 1 : 0,
          start: startAt,
        },
        events: {
          onReady: (event: { target: YtPlayer }) => {
            if (!activeRef.current) return
            const t = readBatchVideoPosition(videoId)
            if (t > 0) event.target.seekTo(t, true)
            event.target.playVideo()
          },
        },
      }) as YtPlayer
    })

    return () => {
      cancelled = true
    }
  }, [videoId, interactive])

  useEffect(() => {
    const player = playerRef.current
    if (!player?.playVideo) return

    let saveInterval: number | undefined

    if (active) {
      const t = readBatchVideoPosition(videoId)
      if (t > 0) player.seekTo(t, true)
      player.playVideo()

      saveInterval = window.setInterval(() => {
        try {
          const cur = player.getCurrentTime()
          if (typeof cur === "number" && cur >= 0) {
            writeBatchVideoPosition(videoId, cur)
          }
        } catch {
          /* Player noch nicht bereit */
        }
      }, 4000)
    } else {
      try {
        const cur = player.getCurrentTime()
        if (typeof cur === "number" && cur >= 0) {
          writeBatchVideoPosition(videoId, cur)
        }
      } catch {
        /* ignore */
      }
      player.pauseVideo()
    }

    return () => {
      if (saveInterval !== undefined) window.clearInterval(saveInterval)
    }
  }, [active, videoId])

  useEffect(() => {
    return () => {
      try {
        const cur = playerRef.current?.getCurrentTime()
        if (typeof cur === "number" && cur >= 0) {
          writeBatchVideoPosition(videoId, cur)
        }
      } catch {
        /* ignore */
      }
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId])

  return (
    <div
      className={cn(
        interactive
          ? "absolute inset-0 z-0 overflow-hidden"
          : "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        !active && "invisible",
        className
      )}
      aria-hidden={!active}
    >
      <div
        ref={mountRef}
        className="absolute top-1/2 left-1/2 z-0 h-[130%] w-[130%] max-w-none -translate-x-1/2 -translate-y-1/2 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
      />
      <div
        className="absolute inset-0 z-[1] bg-background/55 dark:bg-background/65"
        aria-hidden
      />
    </div>
  )
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: Record<string, unknown>
      ) => YtPlayer
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

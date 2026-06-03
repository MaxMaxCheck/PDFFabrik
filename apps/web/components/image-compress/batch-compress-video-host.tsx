"use client"

import { useEffect, useRef, useState } from "react"

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
  unMute: () => void
  setVolume: (volume: number) => void
  isMuted?: () => boolean
  destroy: () => void
}

type BatchCompressVideoHostProps = {
  active: boolean
  videoId?: string
  /** Nur /test: Klicks auf den Player (Steuerung bleibt ausgeblendet). */
  interactive?: boolean
  className?: string
}

let apiLoadPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      script.async = true
      document.head.appendChild(script)
    } else if (window.YT?.Player) {
      resolve()
    }
  })
  return apiLoadPromise
}

function forceUnmuted(player: YtPlayer) {
  try {
    player.unMute()
    player.setVolume(100)
  } catch {
    /* Player noch nicht bereit */
  }
}

/**
 * YouTube erst nach erstem „Komprimieren“; Position in sessionStorage.
 * Keine sichtbaren Steuerungen — Stummschalten über die UI ist nicht möglich.
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
  const [everActive, setEverActive] = useState(active)

  useEffect(() => {
    activeRef.current = active
    if (active) setEverActive(true)
  }, [active])

  useEffect(() => {
    if (!everActive) return
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
          controls: 0,
          disablekb: 1,
          fs: 0,
          start: startAt,
        },
        events: {
          onReady: (event: { target: YtPlayer }) => {
            forceUnmuted(event.target)
            if (!activeRef.current) return
            const t = readBatchVideoPosition(videoId)
            if (t > 0) event.target.seekTo(t, true)
            event.target.playVideo()
            forceUnmuted(event.target)
          },
          onStateChange: (event: { target: YtPlayer }) => {
            forceUnmuted(event.target)
          },
        },
      }) as YtPlayer
    })

    return () => {
      cancelled = true
    }
  }, [everActive, videoId])

  useEffect(() => {
    const player = playerRef.current
    if (!player?.playVideo) return

    let saveInterval: number | undefined
    let unmuteInterval: number | undefined

    if (active) {
      const t = readBatchVideoPosition(videoId)
      if (t > 0) player.seekTo(t, true)
      forceUnmuted(player)
      player.playVideo()
      forceUnmuted(player)

      unmuteInterval = window.setInterval(() => {
        forceUnmuted(player)
      }, 2000)

      saveInterval = window.setInterval(() => {
        try {
          const cur = player.getCurrentTime()
          if (typeof cur === "number" && cur >= 0) {
            writeBatchVideoPosition(videoId, cur)
          }
        } catch {
          /* ignore */
        }
      }, 5000)
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
      if (unmuteInterval !== undefined) window.clearInterval(unmuteInterval)
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

  if (!everActive) return null

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

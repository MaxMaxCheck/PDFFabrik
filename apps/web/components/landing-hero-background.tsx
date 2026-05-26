"use client"

import { useEffect, useRef } from "react"

export function LandingHeroBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncPlayback = () => {
      if (mq.matches) {
        video.pause()
        video.removeAttribute("src")
        return
      }
      void video.play().catch(() => {})
    }

    syncPlayback()
    mq.addEventListener("change", syncPlayback)
    return () => mq.removeEventListener("change", syncPlayback)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <video
        ref={videoRef}
        className="h-full w-full scale-[1.08] object-cover opacity-45 blur-md grayscale-[0.35] motion-reduce:hidden dark:opacity-50"
        muted
        playsInline
        autoPlay
        loop
        preload="metadata"
        poster="/assets/backgrounds/auth-bg-poster.jpg"
      >
        <source src="/assets/backgrounds/auth-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-sidebar/5 via-sidebar/35 to-sidebar/92 dark:from-black/10 dark:via-sidebar/40 dark:to-sidebar" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-sidebar via-sidebar/70 to-transparent" />
    </div>
  )
}

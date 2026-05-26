"use client"

import { useEffect, useState } from "react"

/**
 * Glättet ruckartige API-Fortschrittswerte (z. B. 8 → 35 → lange Stille → 100)
 * zu einer sanft ansteigenden Anzeige, statt lange 35 % und dann “fertig”.
 */
export function useSmoothedUploadProgress(
  target: number,
  active: boolean,
  runKey: number
) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!active) {
      setDisplay(0)
    }
  }, [active, runKey])

  useEffect(() => {
    if (target >= 100) {
      setDisplay(100)
    }
  }, [target])

  useEffect(() => {
    if (!active) return
    if (target >= 100) return
    const id = setInterval(() => {
      setDisplay((d) => {
        if (target >= 100) return 100
        if (target === 0 && d === 0) return 0
        const floor = Math.max(d, target)
        return Math.min(97, floor + 0.32)
      })
    }, 100)
    return () => clearInterval(id)
  }, [active, target, runKey])

  const out = active ? Math.min(100, Math.round(display)) : 0
  return out
}

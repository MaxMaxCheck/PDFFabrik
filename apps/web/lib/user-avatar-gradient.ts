import type { CSSProperties } from "react"

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministischer Verlauf aus E-Mail (oder Fallback) — gleiche E-Mail → gleicher Look. */
export function gradientStyleFromEmailOrId(key: string): CSSProperties {
  const seed = hashString(key.trim().toLowerCase() || "anon")
  const h1 = seed % 360
  const h2 = (h1 + 32 + ((seed >> 8) % 55)) % 360
  const h3 = (h2 + 40 + ((seed >> 16) % 45)) % 360
  const s = 56 + (seed % 18)
  const l1 = 48 + (seed % 14)
  const l2 = 40 + ((seed >> 4) % 16)
  const l3 = 50 + ((seed >> 12) % 12)
  return {
    background: `linear-gradient(135deg, hsl(${h1} ${s}% ${l1}%) 0%, hsl(${h2} ${Math.max(42, s - 8)}% ${l2}%) 48%, hsl(${h3} ${s}% ${l3}%) 100%)`,
  }
}

"use client"

import { useCallback, useRef } from "react"
import { cn } from "@workspace/ui/lib/utils"

type TextSideBySideCompareProps = {
  leftLabel: string
  rightLabel: string
  leftText: string
  rightText: string
  className?: string
}

export function TextSideBySideCompare({
  leftLabel,
  rightLabel,
  leftText,
  rightText,
  className,
}: TextSideBySideCompareProps) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)

  const syncScroll = useCallback(
    (source: HTMLDivElement, target: HTMLDivElement | null) => {
      if (!target || syncingRef.current) return
      const sourceMax = Math.max(1, source.scrollHeight - source.clientHeight)
      const targetMax = Math.max(1, target.scrollHeight - target.clientHeight)
      syncingRef.current = true
      target.scrollTop = (source.scrollTop / sourceMax) * targetMax
      window.requestAnimationFrame(() => {
        syncingRef.current = false
      })
    },
    []
  )

  const preClass =
    "whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground"

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="grid h-full min-h-0 w-full grid-cols-2 gap-px bg-sidebar-border">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-sidebar">
          <div className="shrink-0 border-b border-sidebar-border px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">{leftLabel}</p>
          </div>
          <div
            ref={leftRef}
            className="min-h-0 flex-1 overflow-auto p-3"
            onScroll={(e) => syncScroll(e.currentTarget, rightRef.current)}
          >
            <pre className={preClass}>{leftText}</pre>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-sidebar">
          <div className="shrink-0 border-b border-sidebar-border px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">{rightLabel}</p>
          </div>
          <div
            ref={rightRef}
            className="min-h-0 flex-1 overflow-auto p-3"
            onScroll={(e) => syncScroll(e.currentTarget, leftRef.current)}
          >
            <pre className={preClass}>{rightText}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

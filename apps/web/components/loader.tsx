"use client"

import { cn } from "@workspace/ui/lib/utils"

export function Loader({
  size = 16,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      style={{ width: size, height: size }}
    />
  )
}


"use client"

import { useCallback } from "react"
import { ChevronDown, Link2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type BlogShareActionsProps = {
  className?: string
}

export function BlogShareActions({ className }: BlogShareActionsProps) {
  const copyLink = useCallback(async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link kopiert")
    } catch {
      toast.error("Link konnte nicht kopiert werden")
    }
  }, [])

  return (
    <div
      role="group"
      className={cn(
        "flex w-fit items-stretch rounded-lg border border-border shadow-xs",
        className
      )}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-r-none border-0 shadow-none"
        onClick={copyLink}
      >
        <Link2 className="size-3.5" aria-hidden />
        Teilen
      </Button>
      <div className="w-px self-stretch bg-border" aria-hidden />
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="rounded-l-none border-0 shadow-none"
        aria-label="Weitere Teilen-Optionen"
        onClick={copyLink}
      >
        <ChevronDown className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

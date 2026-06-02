"use client"

import { AlignLeft, ChevronDown } from "lucide-react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import type { BlogHeading } from "@/lib/blog-headings"
import { cn } from "@workspace/ui/lib/utils"

type BlogInlineTocProps = {
  headings: BlogHeading[]
  className?: string
}

export function BlogInlineToc({ headings, className }: BlogInlineTocProps) {
  if (headings.length === 0) return null

  return (
    <aside
      aria-label="Inhaltsverzeichnis"
      className={cn("not-prose", className)}
    >
      <Collapsible
        defaultOpen={headings.length <= 6}
        className="group/inline-toc rounded-lg bg-muted/50"
      >
        <CollapsibleTrigger
          title="Inhaltsverzeichnis"
          className="inline-flex w-full items-center gap-1.5 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground outline-none group-data-[state=open]/inline-toc:rounded-b-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset [&_svg]:size-4"
        >
          <AlignLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          Auf dieser Seite
          <ChevronDown
            className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/inline-toc:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/50 px-2 pb-2">
          <nav className="flex flex-col gap-0.5 pt-1">
            {headings.map((h) => (
              <Link
                key={h.id}
                href={`#${h.id}`}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  h.level === 3 && "pl-5"
                )}
              >
                {h.text}
              </Link>
            ))}
          </nav>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  )
}

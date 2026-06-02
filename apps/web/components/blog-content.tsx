"use client"

import type { ReactNode } from "react"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { slugifyHeading } from "@/lib/blog-headings"
import { cn } from "@workspace/ui/lib/utils"

function headingText(children: ReactNode): string {
  if (typeof children === "string") return children
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === "string" ? c : "")).join("")
  }
  return String(children ?? "")
}

function HeadingLink({
  id,
  children,
  className,
}: {
  id: string
  children: ReactNode
  className?: string
}) {
  return (
    <a href={`#${id}`} className={cn("group no-underline hover:opacity-100", className)}>
      <span className="underline-offset-4 group-hover:underline">{children}</span>
      <span
        aria-hidden
        className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        #
      </span>
    </a>
  )
}

const components: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight text-balance first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, children, ...props }) => {
    const id = slugifyHeading(headingText(children))
    return (
      <h2
        id={id}
        className={cn(
          "mt-10 scroll-mt-24 text-xl font-semibold tracking-tight text-balance",
          className
        )}
        {...props}
      >
        <HeadingLink id={id}>{children}</HeadingLink>
      </h2>
    )
  },
  h3: ({ className, children, ...props }) => {
    const id = slugifyHeading(headingText(children))
    return (
      <h3
        id={id}
        className={cn("mt-8 scroll-mt-24 text-lg font-semibold tracking-tight", className)}
        {...props}
      >
        <HeadingLink id={id}>{children}</HeadingLink>
      </h3>
    )
  },
  p: ({ className, ...props }) => (
    <p
      className={cn("mt-4 text-base leading-relaxed text-pretty text-muted-foreground", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn("mt-4 list-disc space-y-2 pl-5 text-muted-foreground", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("mt-4 list-decimal space-y-2 pl-5 text-muted-foreground", className)}
      {...props}
    />
  ),
  li: ({ className, ...props }) => <li className={cn("leading-relaxed", className)} {...props} />,
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "font-medium text-primary underline underline-offset-4 hover:opacity-90",
        className
      )}
      {...props}
    />
  ),
  code: (props) => {
    const { className, children, ...rest } = props
    const inline = !String(children).includes("\n")
    if (inline) {
      return (
        <code
          className={cn(
            "rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground",
            className
          )}
          {...rest}
        >
          {children}
        </code>
      )
    }
    return (
      <code className={cn("font-mono text-sm", className)} {...rest}>
        {children}
      </code>
    )
  },
  pre: ({ className, children, ...props }) => (
    <pre
      className={cn(
        "mt-6 overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "mt-6 border-l-4 border-primary/30 pl-4 text-muted-foreground italic",
        className
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="mt-6 w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn("border border-border bg-muted/50 px-3 py-2 text-left font-medium", className)}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("border border-border px-3 py-2", className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("my-10 border-border", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn("font-semibold text-foreground", className)} {...props} />
  ),
}

export function BlogContent({ markdown }: { markdown: string }) {
  return (
    <div
      data-slot="prose"
      className="prose-article max-w-none min-w-0 text-foreground"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

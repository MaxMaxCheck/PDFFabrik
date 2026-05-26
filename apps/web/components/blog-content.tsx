"use client"

import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@workspace/ui/lib/utils"

const components: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn("mt-8 scroll-mt-20 text-2xl font-bold tracking-tight first:mt-0", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn("mt-8 scroll-mt-20 text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn("mt-6 scroll-mt-20 text-lg font-semibold", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("mt-3 leading-relaxed text-muted-foreground", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("mt-3 list-disc pl-5 text-muted-foreground", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("mt-3 list-decimal pl-5 text-muted-foreground", className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn("mt-1.5", className)} {...props} />,
  a: ({ className, ...props }) => (
    <a
      className={cn("text-primary font-medium underline underline-offset-2 hover:opacity-80", className)}
      {...props}
    />
  ),
  code: (props) => {
    const { className, children, ...rest } = props
    const inline = !String(children).includes("\n")
    if (inline) {
      return (
        <code
          className={cn("rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-sm", className)}
          {...rest}
        >
          {children}
        </code>
      )
    }
    return <code className={cn("font-mono text-sm", className)} {...rest}>{children}</code>
  },
  pre: ({ className, children, ...props }) => (
    <pre
      className={cn(
        "mt-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed",
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn("mt-4 border-l-4 border-primary/30 pl-4 text-muted-foreground italic", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="mt-4 w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th className={cn("border border-border bg-muted/50 px-3 py-2 text-left font-medium", className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("border border-border px-3 py-2", className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("my-8 border-border", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn("font-semibold text-foreground", className)} {...props} />
  ),
}

export function BlogContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose-article text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

import { cn } from "@workspace/ui/lib/utils"

type BlogPageHeadingProps = {
  tagline?: string
  /** Kategorie-Badge (z. B. „News“) statt neutraler Tagline-Pille */
  badge?: string
  title: string
  description?: string
  className?: string
}

export function BlogPageHeading({
  tagline,
  badge,
  title,
  description,
  className,
}: BlogPageHeadingProps) {
  const label = badge ?? tagline

  return (
    <header
      className={cn(
        "mx-auto flex max-w-4xl flex-col items-center text-center",
        className
      )}
    >
      {label ? (
        <p
          className={cn(
            "inline-flex w-fit shrink-0 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
            badge
              ? "border border-primary/25 bg-primary/10 text-primary"
              : "border border-border/80 bg-muted/50 text-foreground"
          )}
        >
          {label}
        </p>
      ) : null}
      <h1
        className={cn(
          "font-[family-name:var(--font-sans)] text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
          label ? "mt-4" : "mt-0"
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-xl text-base text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  )
}

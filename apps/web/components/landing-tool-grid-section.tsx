import { LANDING_TOOL_CARDS } from "@/lib/landing-tool-cards"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

const DEFAULT_TOOLIT_LEARN_MORE = "https://toolit.io"

type ToolitPromoBannerProps = {
  className?: string
  /** Standard: externe toolit.io-Seite. */
  learnMoreHref?: string
}

export function ToolitPromoBanner({
  className,
  learnMoreHref = DEFAULT_TOOLIT_LEARN_MORE,
}: ToolitPromoBannerProps) {
  const external = learnMoreHref.startsWith("http")

  return (
    <div
      className={cn("mt-3 w-full min-w-0", className)}
      data-testid="toolit-promo"
    >
      <div
        className={cn(
          "flex w-full flex-col items-stretch justify-between gap-4 border-t border-sidebar-border py-4 sm:flex-row sm:items-center"
        )}
      >
        <p className="min-w-0 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Toolit</span>
          {` — weitere Werkzeuge für moderne Bild-Workflows.`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full shrink-0 self-center rounded-full border-sidebar-border bg-transparent text-xs sm:w-auto"
          asChild
        >
          {external ? (
            <a href={learnMoreHref} target="_blank" rel="noopener noreferrer">
              Mehr erfahren
            </a>
          ) : (
            <Link href={learnMoreHref} prefetch>
              Mehr erfahren
            </Link>
          )}
        </Button>
      </div>
    </div>
  )
}

type Props = {
  className?: string
  /** Sektionsüberschriften „Beliebte PDF-Tools“ / „Werkzeuge“ (Startseite ohne Cookie). */
  includeHeader?: boolean
  /** Toolit-Werbebox unter dem Grid (z. B. auf [`AppModeStartPage`](/) separat darunter). */
  includeToolitPromo?: boolean
  id?: string
  eyebrow?: string
  title?: string
  description?: string
  toolitLearnMoreHref?: string
}

const toolCardLinkClass = cn(
  "group flex items-start gap-4 border-t border-sidebar-border py-5 text-left",
  "transition-opacity hover:opacity-55",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
)

export function LandingToolGridSection({
  className,
  includeHeader = true,
  includeToolitPromo = true,
  id = "tools-heading",
  eyebrow = "Beliebte PDF-Tools",
  title = "Werkzeuge",
  description = "Metadaten, Anonymisierung & Einstiege — schnell erreichbar.",
  toolitLearnMoreHref = DEFAULT_TOOLIT_LEARN_MORE,
}: Props) {
  const primaryTool =
    LANDING_TOOL_CARDS.find((t) => t.href === "/pdf-redact") ??
    LANDING_TOOL_CARDS[0]
  const otherTools = LANDING_TOOL_CARDS.filter(
    (t) => t.href !== primaryTool.href
  )

  return (
    <div
      className={cn("mx-auto w-full max-w-6xl min-w-0", className)}
      data-testid="landing-tool-grid"
    >
      {includeHeader ? (
        <>
          <p className="text-sm font-semibold text-foreground">{eyebrow}</p>
          <h2
            id={id}
            className="mt-1 font-[family-name:var(--font-sans)] text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </>
      ) : null}

      <div className={cn("flex flex-col", includeHeader && "mt-6")}>
        <div className="w-full min-w-0">
          <Link
            href={primaryTool.href}
            prefetch
            className={cn(toolCardLinkClass, "w-full min-w-0 border-t-0 pt-0")}
          >
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
                primaryTool.accent
              )}
              aria-hidden
            >
              {primaryTool.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg leading-snug font-semibold tracking-[-0.025em] text-foreground">
                {primaryTool.title}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {primaryTool.description}
              </span>
            </span>
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              className="mt-1 size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.7}
            />
          </Link>
        </div>

        <ul className="grid list-none grid-cols-1 sm:grid-cols-2">
          {otherTools.map((t) => (
            <li
              key={t.href}
              className="min-w-0 sm:odd:pr-5 sm:even:border-l sm:even:pl-5"
            >
              <Link
                href={t.href}
                prefetch
                className={cn(toolCardLinkClass, "h-full")}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white",
                    t.accent
                  )}
                  aria-hidden
                >
                  {t.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug font-semibold text-foreground">
                    {t.title}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {t.description}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={1.7}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {includeToolitPromo ? (
        <ToolitPromoBanner learnMoreHref={toolitLearnMoreHref} />
      ) : null}
    </div>
  )
}

import { LANDING_TOOL_CARDS } from "@/lib/landing-tool-cards"
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
      className={cn("mt-4 w-full min-w-0", className)}
      data-testid="toolit-promo"
    >
      <div
        className={cn(
          "flex w-full flex-col items-stretch justify-between gap-4 rounded-xl p-4 sm:flex-row sm:items-center",
          "bg-gradient-to-r from-violet-100/90 to-violet-50/80 dark:from-violet-950/50 dark:to-violet-900/20"
        )}
      >
        <p className="min-w-0 text-sm text-violet-950/90 dark:text-violet-100/90">
          <span className="font-semibold text-violet-950 dark:text-violet-50">
            Toolit
          </span>
          {` — weitere Tools, die dir helfen, deine Bilder-Workflows zu verbessern. `}
          <span className="whitespace-nowrap" aria-hidden>
            ✨
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full shrink-0 self-center rounded-xl border-violet-300/80 bg-white text-violet-800 hover:bg-violet-50 sm:w-auto dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
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
  /** Toolit-Werbebox unter dem Grid (z. B. auf [`AppModeStartPage`](/) separat darunter). */
  includeToolitPromo?: boolean
  id?: string
  eyebrow?: string
  title?: string
  description?: string
  toolitLearnMoreHref?: string
}

const toolCardLinkClass = cn(
  "group flex items-start gap-3 rounded-xl bg-muted/40 p-4 text-left",
  "transition-colors hover:bg-muted/70",
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

      <div className={cn("flex flex-col gap-3", includeHeader && "mt-6")}>
        <div className="w-full min-w-0">
          <Link
            href={primaryTool.href}
            prefetch
            className={cn(
              toolCardLinkClass,
              "w-full min-w-0 bg-primary/10 hover:bg-primary/15 sm:p-5"
            )}
          >
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white sm:size-12",
                primaryTool.accent
              )}
              aria-hidden
            >
              {primaryTool.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base leading-snug font-semibold text-foreground group-hover:text-primary sm:text-lg">
                {primaryTool.title}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {primaryTool.description}
              </span>
              <span className="mt-2 inline-block text-sm font-medium text-primary">
                Jetzt öffnen →
              </span>
            </span>
          </Link>
        </div>

        <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-3">
          {otherTools.map((t) => (
            <li key={t.href} className="min-w-0">
              <Link
                href={t.href}
                prefetch
                className={cn(toolCardLinkClass, "h-full")}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white",
                    t.accent
                  )}
                  aria-hidden
                >
                  {t.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug font-semibold text-foreground group-hover:text-primary">
                    {t.title}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {t.description}
                  </span>
                </span>
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

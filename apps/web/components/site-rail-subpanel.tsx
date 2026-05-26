"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiMail02Icon,
  FileZipIcon,
  LayoutTwoRowIcon,
  LinkSquare02Icon,
  RemoveSquareIcon,
  Settings02Icon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { isSameSiteNavDestination } from "@/lib/site-nav-path"
import { FeedbackSendButton } from "@/components/feedback-send-button"
import { SITE_RAIL_EXTERNAL_LINKS } from "@/lib/site-rail-external-links"
import { cn } from "@workspace/ui/lib/utils"

type PanelCardProps = {
  href: string
  title: string
  description?: string
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  className?: string
  external?: boolean
}

function PanelCard({
  href,
  title,
  description,
  icon,
  className,
  external,
}: PanelCardProps) {
  const pathname = usePathname() ?? ""
  const textBlock = (
    <div className="min-w-0">
      <div className="text-[1.05rem] font-medium tracking-tight text-card-foreground">
        {title}
      </div>
      {description ? (
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )

  const cardClass = cn(
    "group relative flex min-h-0 w-full flex-col overflow-hidden rounded-xl bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted/60",
    className
  )

  const inner = icon ? (
    <div className="relative z-[1] flex min-h-0 w-full flex-col gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
        <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.8} />
      </div>
      {textBlock}
    </div>
  ) : (
    <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col justify-end">
      {textBlock}
    </div>
  )

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {inner}
      </a>
    )
  }

  return (
    <Link
      href={href}
      prefetch
      onClick={(e) => {
        if (
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return
        }
        if (isSameSiteNavDestination(pathname, href)) {
          e.preventDefault()
          window.location.assign(href)
        }
      }}
      className={cardClass}
    >
      {inner}
    </Link>
  )
}

function PanelActionCard({
  title,
  description,
  icon,
  onClick,
  className,
}: {
  title: string
  description?: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-0 w-full flex-col overflow-hidden rounded-xl bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted/60",
        className
      )}
    >
      <div className="relative z-[1] flex min-h-0 w-full flex-col gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
          <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="text-[1.05rem] font-medium tracking-tight">
            {title}
          </div>
          {description ? (
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

function PromoSideCard({
  href,
  eyebrow,
  title,
  description,
  linkLabel,
  className,
}: {
  href: string
  eyebrow: string
  title: string
  description: string
  linkLabel: string
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex min-h-[8.5rem] flex-col rounded-xl p-3 shadow-sm transition-colors",
        className
      )}
    >
      <p className="text-[9px] font-semibold tracking-wide uppercase opacity-90">
        {eyebrow}
      </p>
      <p className="mt-1 text-sm leading-tight font-semibold tracking-tight text-foreground">
        {title}
      </p>
      <p className="mt-1 flex-1 text-[11px] leading-snug text-muted-foreground">
        {description}
      </p>
      <span className="mt-2 inline-flex items-center gap-0.5 text-[10px] font-medium">
        {linkLabel}
        <HugeiconsIcon
          icon={LinkSquare02Icon}
          className="size-3"
          strokeWidth={2}
        />
      </span>
    </a>
  )
}

function PromoCardsRow() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <PromoSideCard
        href={SITE_RAIL_EXTERNAL_LINKS.maxCheck}
        eyebrow="Empfehlung"
        title="MaxCheck"
        description="Gutachten-Analyse mit KI."
        linkLabel="maxcheck.de"
        className="bg-gradient-to-br from-violet-500/15 via-card to-card hover:bg-violet-500/10 [&_p:first-child]:text-violet-600 dark:[&_p:first-child]:text-violet-300 [&_span]:text-violet-700 dark:[&_span]:text-violet-300"
      />
      <PromoSideCard
        href={SITE_RAIL_EXTERNAL_LINKS.designCredit}
        eyebrow="Webdesign"
        title="schindlertom"
        description="Design & Entwicklung."
        linkLabel="schindlertom.com"
        className="bg-card hover:bg-muted/60 [&_span]:text-foreground"
      />
    </div>
  )
}

export type SiteRailSubpanelView = "main" | "appearance"

function AppearanceSubview() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const options = [
    { id: "light" as const, label: "Hell", hint: "Helles Erscheinungsbild" },
    { id: "dark" as const, label: "Dunkel", hint: "Dunkles Erscheinungsbild" },
    {
      id: "system" as const,
      label: "System",
      hint: "An Geräteeinstellung anpassen",
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Theme">
        {options.map((opt) => {
          const active =
            mounted && (theme === opt.id || (!theme && opt.id === "system"))
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "flex w-full flex-col rounded-xl px-4 py-3 text-left transition-colors",
                active
                  ? "bg-primary/10 ring-1 ring-primary/25"
                  : "bg-card hover:bg-muted/50"
              )}
            >
              <span className="text-sm font-medium text-foreground">
                {opt.label}
              </span>
              <span className="text-xs text-muted-foreground">{opt.hint}</span>
            </button>
          )
        })}
      </div>
      {mounted ? (
        <p className="text-xs text-muted-foreground">
          Aktiv: {resolvedTheme === "dark" ? "Dunkel" : "Hell"}
          {theme === "system" ? " (über System)" : ""}
        </p>
      ) : null}
    </div>
  )
}

function PdfLogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-7 w-7 shrink-0", className)} aria-hidden>
      <div className="absolute top-0.5 left-0 h-4 w-5 -rotate-6 rounded-[3px] bg-rose-500/90 shadow-sm" />
      <div className="absolute top-1 left-0.5 h-4 w-5 -rotate-2 rounded-[3px] bg-background shadow-sm ring-1 ring-border/50" />
      <div className="absolute top-1.5 left-1 h-4 w-5 rotate-6 rounded-[3px] bg-violet-600/90 shadow-sm" />
    </div>
  )
}

type SiteRailSubpanelProps = {
  view: SiteRailSubpanelView
  onViewChange: (view: SiteRailSubpanelView) => void
  isLoggedIn: boolean
  isAdmin?: boolean
}

export function SiteRailSubpanel({
  view,
  onViewChange,
  isLoggedIn,
  isAdmin,
}: SiteRailSubpanelProps) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-[3.75rem] pb-4">
      {view === "appearance" ? (
        <AppearanceSubview />
      ) : (
        <>
          <PromoCardsRow />

          <PanelActionCard
            title="Darstellung"
            description="Hell, dunkel oder System."
            icon={Settings02Icon}
            onClick={() => onViewChange("appearance")}
            className="min-h-[8.5rem]"
          />

          <PanelCard
            href="/pdf-redact"
            title="PDF Schwärzen"
            description="Komplette Vorschau, Erkennung und echtes Schwärzen."
            icon={LayoutTwoRowIcon}
            className="min-h-[10rem]"
          />

          {isLoggedIn ? (
            <PanelCard
              href={isAdmin ? "/dashboard" : "/konto/api-keys"}
              title="Konto"
              description={
                isAdmin
                  ? "Dashboard und Verwaltung."
                  : "API-Schlüssel und Einstellungen."
              }
              icon={UserCircle02Icon}
              className="min-h-[9rem]"
            />
          ) : (
            <PanelCard
              href="/login"
              title="Anmelden"
              description="Zum Konto oder Dashboard wechseln."
              icon={AiMail02Icon}
              className="min-h-[9rem]"
            />
          )}

          <PanelCard
            href="/pdf-redact-json"
            title="PDF Schwärzen (Text Only)"
            description="Schneller Modus ohne Seitenvorschau."
            icon={Settings02Icon}
            className="min-h-[9rem]"
          />

          <PanelCard
            href="/meta-daten-loeschen"
            title="Metadaten löschen"
            description="Infos entfernen und saubere PDFs exportieren."
            icon={RemoveSquareIcon}
            className="min-h-[9rem]"
          />

          <PanelCard
            href="/compress-pdf"
            title="PDF komprimieren"
            description="Dateigröße reduzieren, Inhalt behalten."
            icon={FileZipIcon}
            className="min-h-[9rem]"
          />

          <div className="flex flex-col items-center border-t border-border pt-4">
            <FeedbackSendButton className="w-full justify-center" />
          </div>

          <div className="mt-1 flex flex-col items-center justify-center gap-2 py-4 text-center text-muted-foreground">
            <PdfLogoMark className="scale-125" />
            <div className="text-[1.05rem] leading-tight font-medium tracking-tight text-foreground">
              PDFFabrik.de
            </div>
          </div>
        </>
      )}
    </div>
  )
}

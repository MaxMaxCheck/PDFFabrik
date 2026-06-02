"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons"
import { FreeTrialSheet } from "@/components/free-trial-sheet"
import { SiteChromeUserMenu } from "@/components/site-chrome-user-menu"
import { SiteMobileNav } from "@/components/site-mobile-nav"
import { useAppWorkspaceActions } from "@/components/app-workspace-actions"
import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import {
  SITE_CHROME_TOP_BAR_CLASS,
  SITE_CHROME_TOP_BAR_SURFACE,
} from "@/lib/site-chrome-layout"
import { cn } from "@workspace/ui/lib/utils"

function pageTitleForPath(pathname: string): string {
  const p = pathname || "/"
  if (p === "/") return "Start"
  const rules: { test: (x: string) => boolean; title: string }[] = [
    { test: (x) => x.startsWith("/pdf-redact-json"), title: "PDF Schwärzen (nur Text)" },
    { test: (x) => x.startsWith("/pdf-redact"), title: "PDF Schwärzen" },
    { test: (x) => x.startsWith("/compress-pdf"), title: "PDF komprimieren" },
    { test: (x) => x.startsWith("/text-aus-bild"), title: "Text aus Bild (OCR)" },
    {
      test: (x) => x.startsWith("/meta-daten-loeschen"),
      title: "PDF-Metadaten löschen",
    },
    {
      test: (x) => x.startsWith("/meta-daten-anzeigen"),
      title: "PDF-Metadaten anzeigen",
    },
    { test: (x) => x.startsWith("/chat"), title: "KI-Chat" },
    { test: (x) => x.startsWith("/konto/api-keys/nutzung"), title: "API-Nutzung" },
    { test: (x) => x.startsWith("/konto/api-keys"), title: "API-Schlüssel" },
    { test: (x) => x.startsWith("/docs"), title: "Dokumentation" },
    { test: (x) => x.startsWith("/blog"), title: "Blog" },
    { test: (x) => x.startsWith("/dashboard/workers"), title: "Workers" },
    { test: (x) => x.startsWith("/dashboard/users"), title: "Nutzer" },
    { test: (x) => x.startsWith("/dashboard"), title: "Dashboard" },
    { test: (x) => x.startsWith("/register"), title: "Registrieren" },
    { test: (x) => x.startsWith("/login"), title: "Anmelden" },
  ]
  for (const r of rules) {
    if (r.test(p)) return r.title
  }
  return "Seite"
}

/**
 * Obere Leiste im App-Modus: aktuelle Seite links, CTA + Auth rechts.
 */
export function SiteChromeHeader({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/"
  const title = pageTitleForPath(pathname)
  const { data, isPending } = authClient.useSession()
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`
  const { runNewSession, isNewSessionActionVisible, workspaceDocumentName } =
    useAppWorkspaceActions()
  const onApp =
    pathname === "/pdf-redact" ||
    pathname.startsWith("/pdf-redact/") ||
    pathname === "/pdf-redact-json" ||
    pathname.startsWith("/pdf-redact-json/")
  const onPdfRedactJson =
    pathname === "/pdf-redact-json" || pathname.startsWith("/pdf-redact-json/")

  return (
    <header
      className={cn(
        "relative z-10 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 text-sidebar-foreground sm:px-2.5 md:px-3 lg:px-4",
        SITE_CHROME_TOP_BAR_CLASS,
        SITE_CHROME_TOP_BAR_SURFACE,
        className
      )}
    >
      <div className="flex min-h-0 min-w-0 items-center gap-0">
        <div className="flex items-center pr-1.5 sm:pr-2.5 lg:pr-0">
          <SiteMobileNav />
        </div>
        <div
          className="w-px shrink-0 self-stretch bg-sidebar-border lg:hidden"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-2.5 sm:pl-3 lg:pl-0">
          {onApp && isNewSessionActionVisible ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-8 shrink-0 rounded-full border-sidebar-border bg-sidebar"
              onClick={() => runNewSession()}
              title="Neu starten"
              aria-label="Neu starten"
            >
              <HugeiconsIcon
                icon={ArrowReloadHorizontalIcon}
                className="size-4"
                strokeWidth={1.85}
              />
            </Button>
          ) : null}
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
      </div>
      <div className="flex min-w-0 max-w-full justify-center justify-self-center px-1">
        {onPdfRedactJson && workspaceDocumentName ? (
          <span
            className="max-w-[min(18rem,70vw)] truncate text-center text-sm font-normal text-muted-foreground"
            title={workspaceDocumentName}
          >
            {workspaceDocumentName}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center justify-end justify-self-end gap-2">
        <FreeTrialSheet />
        {isPending ? (
          <span className="text-xs text-muted-foreground" aria-hidden>
            …
          </span>
        ) : data?.user ? (
          <SiteChromeUserMenu
            user={{
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: (data.user as { role?: string }).role,
            }}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-sidebar-border bg-sidebar"
            asChild
          >
            <Link href={loginHref} prefetch>
              Log in
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}

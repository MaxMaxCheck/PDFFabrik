"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Menu01Icon, UserCircle02Icon } from "@hugeicons/core-free-icons"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { useGuestAuthNavActive, useLoginDialog } from "@/components/login-dialog"
import { isSameSiteNavDestination } from "@/lib/site-nav-path"
import {
  SITE_BLOG_NAV,
  SITE_HOME_NAV,
  SITE_IMAGE_TOOL_NAV,
  SITE_PDF_TOOL_NAV,
  type SiteNavItem,
} from "@/lib/site-nav-items"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

function SheetNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: SiteNavItem
  pathname: string
  onNavigate: () => void
}) {
  const on = item.match(pathname)
  return (
    <Link
      href={item.href}
      prefetch
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          onNavigate()
          return
        }
        if (isSameSiteNavDestination(pathname, item.href)) {
          e.preventDefault()
          onNavigate()
          window.location.assign(item.href)
          return
        }
        onNavigate()
      }}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors",
        on
          ? "bg-primary/25 text-white"
          : "text-white/95 hover:bg-white/10 hover:text-white"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
        <HugeiconsIcon icon={item.icon} className="size-[1.15rem]" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
    </Link>
  )
}

/**
 * Unter `lg`: Hamburger öffnet Sheet mit derselben Navigation wie die schmale Leiste.
 */
export function SiteMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const { data, isPending } = authClient.useSession()
  const close = () => setOpen(false)
  const { openLogin } = useLoginDialog()
  const guestNavActive = useGuestAuthNavActive(pathname)
  const isAdmin = (data?.user as { role?: string } | undefined)?.role === "admin"

  return (
    <div className="flex shrink-0 items-center lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-none px-1.5 text-foreground hover:bg-muted"
        aria-label="Menü öffnen"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Menu01Icon} className="size-[1.35rem]" strokeWidth={1.8} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="data-[side=left]:!w-screen data-[side=left]:!max-w-none rounded-none border-white/10 bg-[#0a0a0b] p-0 text-white shadow-none sm:data-[side=left]:!max-w-none"
        >
          <SheetHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-white/10 px-4 py-3 text-left">
            <SheetTitle className="mb-0 font-[family-name:var(--font-sans)] text-base font-semibold text-white">
              Navigation
            </SheetTitle>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 shrink-0 rounded-none border border-white/20 bg-white/5 text-white shadow-none hover:bg-white/10 hover:text-white"
                aria-label="Schließen"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  className="size-4"
                  strokeWidth={2}
                />
              </Button>
            </SheetClose>
          </SheetHeader>

          <nav
            className="flex max-h-[calc(100vh-8rem)] flex-col overflow-y-auto py-2 [scrollbar-width:thin]"
            aria-label="Hauptnavigation"
          >
            <p className="px-4 pb-1 text-[10px] font-semibold tracking-wide text-white/45 uppercase">
              App
            </p>
            {SITE_HOME_NAV.map((item) => (
              <SheetNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={close}
              />
            ))}

            <div className="mx-3 my-2 h-px bg-white/15" role="separator" />

            <p className="px-4 pb-1 text-[10px] font-semibold tracking-wide text-white/45 uppercase">
              PDF
            </p>
            {SITE_PDF_TOOL_NAV.map((item) => (
              <SheetNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={close}
              />
            ))}

            <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-white/45 uppercase">
              Bilder
            </p>
            {SITE_IMAGE_TOOL_NAV.map((item) => (
              <SheetNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={close}
              />
            ))}

            <div className="mx-3 my-2 h-px bg-white/15" role="separator" />

            {SITE_BLOG_NAV.map((item) => (
              <SheetNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={close}
              />
            ))}

            <div className="mx-3 my-3 h-px bg-white/15" role="separator" />

            {isPending ? (
              <div className="px-4 py-2 text-xs text-white/45">…</div>
            ) : data?.user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/dashboard"
                    prefetch
                    onClick={close}
                    className={cn(
                      "flex min-h-12 items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname.startsWith("/dashboard")
                        ? "bg-primary/25 text-white"
                        : "text-white/95 hover:bg-white/10"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                      <HugeiconsIcon
                        icon={UserCircle02Icon}
                        className="size-[1.15rem]"
                        strokeWidth={1.8}
                      />
                    </span>
                    Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-white/95 transition-colors hover:bg-white/10"
                  onClick={async () => {
                    await authClient.signOut()
                    close()
                    router.push("/")
                    router.refresh()
                  }}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                    <span className="text-xs">↩</span>
                  </span>
                  Abmelden
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  close()
                  openLogin()
                }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  guestNavActive
                    ? "bg-primary/25 text-white"
                    : "text-white/95 hover:bg-white/10"
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <HugeiconsIcon
                    icon={UserCircle02Icon}
                    className="size-[1.15rem]"
                    strokeWidth={1.8}
                  />
                </span>
                Anmelden
              </button>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}

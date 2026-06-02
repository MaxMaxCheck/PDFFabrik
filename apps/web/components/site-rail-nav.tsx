"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Menu01Icon, UserCircle02Icon } from "@hugeicons/core-free-icons"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { isSameSiteNavDestination } from "@/lib/site-nav-path"
import {
  SITE_CHROME_TOP_BAR_CLASS,
  SITE_CHROME_TOP_BAR_SURFACE,
} from "@/lib/site-chrome-layout"
import { KontoAccountMenuContent } from "@/components/konto-account-menu-content"
import { useGuestAuthNavActive, useLoginDialog } from "@/components/login-dialog"
import { gradientStyleFromEmailOrId } from "@/lib/user-avatar-gradient"
import {
  SiteRailSubpanel,
  type SiteRailSubpanelView,
} from "@/components/site-rail-subpanel"
import {
  SITE_BLOG_NAV,
  SITE_HOME_NAV,
  SITE_IMAGE_NAV_GROUP,
  SITE_PDF_NAV_GROUP,
  type SiteNavGroup,
  type SiteNavItem,
} from "@/lib/site-nav-items"
import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

function RailLink({ item, pathname }: { item: SiteNavItem; pathname: string }) {
  const on = item.match(pathname)
  return (
    <Link
      href={item.href}
      prefetch
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return
        }
        if (isSameSiteNavDestination(pathname, item.href)) {
          e.preventDefault()
          window.location.assign(item.href)
        }
      }}
      className={cn(
        railNavItemClass,
        "min-h-[3.5rem]",
        on
          ? "bg-primary/30 text-site-rail-foreground"
          : "text-site-rail-foreground hover:bg-site-rail-foreground/12 hover:text-site-rail-foreground"
      )}
    >
      <HugeiconsIcon
        icon={item.icon}
        className="size-[1.2rem] shrink-0"
        strokeWidth={1.8}
      />
      <span
        className="line-clamp-2 w-full min-w-0 max-w-full break-words px-0.5 text-[9px] leading-snug"
        title={item.label}
      >
        {item.label}
      </span>
    </Link>
  )
}

const HOVER_CLOSE_MS = 220

const railNavItemClass =
  "flex w-full max-w-full flex-col items-center justify-center gap-0.5 rounded-none px-1 py-1.5 text-center transition-colors"

function useHoverPopover() {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const show = useCallback(() => {
    clearCloseTimer()
    setOpen(true)
  }, [clearCloseTimer])

  const scheduleHide = useCallback(() => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => {
      setOpen(false)
      closeTimer.current = null
    }, HOVER_CLOSE_MS)
  }, [clearCloseTimer])

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  return { open, setOpen, show, scheduleHide }
}

/** Nur ein PDF/Bilder-Popover gleichzeitig — verhindert Überlappung beim schnellen Hover. */
function useRailNavGroupPopover() {
  const [openId, setOpenId] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const showGroup = useCallback(
    (id: string) => {
      clearCloseTimer()
      setOpenId(id)
    },
    [clearCloseTimer]
  )

  const scheduleHideGroup = useCallback(
    (id: string) => {
      clearCloseTimer()
      closeTimer.current = setTimeout(() => {
        setOpenId((current) => (current === id ? null : current))
        closeTimer.current = null
      }, HOVER_CLOSE_MS)
    },
    [clearCloseTimer]
  )

  const hideGroup = useCallback(
    (id: string) => {
      clearCloseTimer()
      setOpenId((current) => (current === id ? null : current))
    },
    [clearCloseTimer]
  )

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  return { openId, showGroup, scheduleHideGroup, hideGroup }
}

function RailPopoverLink({
  item,
  pathname,
  onNavigate,
}: {
  item: SiteNavItem
  pathname: string
  onNavigate?: () => void
}) {
  const on = item.match(pathname)
  return (
    <Link
      href={item.href}
      prefetch
      onClick={(e) => {
        onNavigate?.()
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return
        }
        if (isSameSiteNavDestination(pathname, item.href)) {
          e.preventDefault()
          window.location.assign(item.href)
        }
      }}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        on
          ? "bg-primary/15 font-medium text-foreground"
          : "text-foreground/90 hover:bg-muted"
      )}
    >
      <HugeiconsIcon
        icon={item.icon}
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.8}
      />
      <span className="min-w-0 leading-snug">{item.label}</span>
    </Link>
  )
}

function RailNavGroupWithPopover({
  group,
  pathname,
  openId,
  onShowGroup,
  onScheduleHideGroup,
  onHideGroup,
}: {
  group: SiteNavGroup
  pathname: string
  openId: string | null
  onShowGroup: (id: string) => void
  onScheduleHideGroup: (id: string) => void
  onHideGroup: (id: string) => void
}) {
  const open = openId === group.id
  const show = () => onShowGroup(group.id)
  const scheduleHide = () => onScheduleHideGroup(group.id)
  const active = group.match(pathname)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) onShowGroup(group.id)
        else onHideGroup(group.id)
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          className={cn(
            railNavItemClass,
            "min-h-[3.5rem] select-none",
            active
              ? "bg-primary/30 text-site-rail-foreground"
              : "text-site-rail-foreground hover:bg-site-rail-foreground/12 hover:text-site-rail-foreground data-[state=open]:bg-site-rail-foreground/12"
          )}
          aria-label={`${group.label}-Tools`}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <HugeiconsIcon
            icon={group.icon}
            className="size-[1.2rem] shrink-0"
            strokeWidth={1.8}
          />
          <span
            className="line-clamp-2 w-full min-w-0 max-w-full break-words px-0.5 text-[9px] leading-snug"
            title={group.label}
          >
            {group.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-auto min-w-[14rem] max-w-[min(20rem,calc(100vw-5rem))] gap-0 p-1.5"
      >
        <nav aria-label={`${group.label}-Tools`} className="py-0.5">
          {group.items.map((item) => (
            <RailPopoverLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={() => onHideGroup(group.id)}
            />
          ))}
        </nav>
      </PopoverContent>
    </Popover>
  )
}

function RailKontoWithPopover({
  user,
  pathname,
}: {
  user: { id: string; email: string; name?: string | null; role?: string }
  pathname: string
}) {
  const { open, setOpen, show, scheduleHide } = useHoverPopover()

  const emailKey = user.email?.trim() || user.id
  const gradientStyle = useMemo(
    () => gradientStyleFromEmailOrId(emailKey),
    [emailKey]
  )

  const kontoActive = pathname.startsWith("/dashboard")

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          className={cn(
            railNavItemClass,
            "min-h-[3.25rem] text-site-rail-foreground select-none",
            kontoActive
              ? "bg-primary/30 hover:bg-primary/35 data-[state=open]:bg-primary/35"
              : "text-site-rail-foreground hover:bg-site-rail-foreground/12 data-[state=open]:bg-primary/30"
          )}
          aria-label="Konto-Menü öffnen"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span
            className="size-7 shrink-0 rounded-full ring-1 ring-site-rail-foreground/25"
            style={gradientStyle}
            aria-hidden
          />
          <span className="w-full px-0.5 text-[9px] leading-tight break-words">Konto</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        alignOffset={-14}
        sideOffset={8}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-auto min-w-[14rem] max-w-[min(18rem,calc(100vw-5rem))] gap-0 p-0"
      >
        <KontoAccountMenuContent user={user} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

type SiteRailNavProps = {
  leftExtraOpen: boolean
  onLeftExtraOpenChange: (open: boolean) => void
  subpanelView: SiteRailSubpanelView
  onSubpanelViewChange: (view: SiteRailSubpanelView) => void
}

export function SiteRailNav({
  leftExtraOpen,
  onLeftExtraOpenChange,
  subpanelView,
  onSubpanelViewChange,
}: SiteRailNavProps) {
  const pathname = usePathname() ?? ""
  const { openId, showGroup, scheduleHideGroup, hideGroup } =
    useRailNavGroupPopover()
  const { data, isPending } = authClient.useSession()
  const accountLabel = data?.user ? "Konto" : "Anmelden"
  const { openLogin } = useLoginDialog()
  const guestNavActive = useGuestAuthNavActive(pathname)
  const isAdmin =
    (data?.user as { role?: string } | undefined)?.role === "admin"

  useEffect(() => {
    if (!leftExtraOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (subpanelView === "appearance") onSubpanelViewChange("main")
      else onLeftExtraOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    leftExtraOpen,
    subpanelView,
    onLeftExtraOpenChange,
    onSubpanelViewChange,
  ])

  return (
    <div className="max-lg:hidden">
      {/** Zusatzpanel z-50: über dem Sheet-Overlay, damit sichtbar & klickbar */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 min-w-0 overflow-hidden transition-[width] duration-250 ease-out",
          leftExtraOpen
            ? "pointer-events-auto w-[21rem]"
            : "pointer-events-none w-0"
        )}
        data-site-rail-root
        aria-hidden={!leftExtraOpen}
      >
        <aside
          className="relative flex h-full w-[21rem] min-w-[21rem] flex-col overflow-hidden rounded-none border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
          id="site-rail-subpanel"
        >
          <nav
            aria-label="Menü"
            className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] [scrollbar-width:thin]"
          >
            <SiteRailSubpanel
              view={subpanelView}
              onViewChange={onSubpanelViewChange}
              isLoggedIn={Boolean(data?.user)}
              isAdmin={isAdmin}
            />
          </nav>
        </aside>
      </div>

      {/** z-30: unter dem Sheet-Overlay (z-40) — schmale Leiste wird mit abgedunkelt */}
      <div
        id="site-rail-cluster"
        className={cn(
          "fixed top-0 bottom-0 z-30 flex w-18 flex-col overflow-hidden rounded-none border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[left] duration-250 ease-out md:w-19",
          leftExtraOpen ? "left-[21rem]" : "left-0",
        )}
      >
        <nav
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-sidebar-foreground"
          aria-label="Hauptnavigation"
        >
          <div
            className={cn(
              "absolute inset-x-0 top-0 z-10 flex items-center justify-center px-1",
              SITE_CHROME_TOP_BAR_CLASS,
              SITE_CHROME_TOP_BAR_SURFACE
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full text-site-rail-foreground/90 hover:bg-site-rail-foreground/12 hover:text-site-rail-foreground"
              aria-expanded={leftExtraOpen}
              aria-controls="site-rail-subpanel"
              aria-label={
                leftExtraOpen ? "Menü schließen" : "Menü von links öffnen"
              }
              onClick={() => onLeftExtraOpenChange(!leftExtraOpen)}
            >
              <HugeiconsIcon
                icon={Menu01Icon}
                className="size-[1.35rem]"
                strokeWidth={1.8}
              />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col pt-12">
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-1.5 [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]">
            {SITE_HOME_NAV.map((item) => (
              <RailLink key={item.href} item={item} pathname={pathname} />
            ))}
            <RailNavGroupWithPopover
              group={SITE_PDF_NAV_GROUP}
              pathname={pathname}
              openId={openId}
              onShowGroup={showGroup}
              onScheduleHideGroup={scheduleHideGroup}
              onHideGroup={hideGroup}
            />
            <RailNavGroupWithPopover
              group={SITE_IMAGE_NAV_GROUP}
              pathname={pathname}
              openId={openId}
              onShowGroup={showGroup}
              onScheduleHideGroup={scheduleHideGroup}
              onHideGroup={hideGroup}
            />
            {SITE_BLOG_NAV.map((item) => (
              <RailLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
          <div className="shrink-0 pb-1.5">
            {isPending ? (
              <div className="flex min-h-[3.25rem] w-full items-center justify-center">
                <span className="text-[9px] text-site-rail-foreground/45">…</span>
              </div>
            ) : data?.user ? (
              <RailKontoWithPopover
                user={{
                  id: data.user.id,
                  email: data.user.email,
                  name: data.user.name,
                  role: (data.user as { role?: string }).role,
                }}
                pathname={pathname}
              />
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className={cn(
                  railNavItemClass,
                  "min-h-[3.25rem]",
                  guestNavActive
                    ? "bg-primary/30 text-site-rail-foreground"
                    : "text-site-rail-foreground hover:bg-site-rail-foreground/12 hover:text-site-rail-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={UserCircle02Icon}
                  className="size-[1.2rem] shrink-0"
                  strokeWidth={1.8}
                />
                <span className="w-full px-0.5 text-[9px] leading-tight break-words">
                  {accountLabel}
                </span>
              </button>
            )}
          </div>
          </div>
        </nav>
      </div>
    </div>
  )
}

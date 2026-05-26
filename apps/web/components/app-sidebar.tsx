"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Chart01Icon,
  Comment01Icon,
  Home01Icon,
  LayoutTwoRowIcon,
  SidebarLeftIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

type HugeiconRef = React.ComponentProps<typeof HugeiconsIcon>["icon"]

type NavItem = {
  title: string
  href: string
  icon: HugeiconRef
  match?: (path: string) => boolean
}

const adminNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Chart01Icon,
    match: (p) => p === "/dashboard" || p === "/dashboard/",
  },
  {
    title: "Workers",
    href: "/dashboard/workers",
    icon: LayoutTwoRowIcon,
    match: (p) => p === "/dashboard/workers" || p.startsWith("/dashboard/workers/"),
  },
  {
    title: "Nutzer",
    href: "/dashboard/users",
    icon: UserMultiple02Icon,
    match: (p) => p.startsWith("/dashboard/users"),
  },
  {
    title: "API-Abrechnung",
    href: "/dashboard/api-billing",
    icon: Chart01Icon,
    match: (p) => p.startsWith("/dashboard/api-billing"),
  },
  {
    title: "Feedback",
    href: "/dashboard/feedback",
    icon: Comment01Icon,
    match: (p) => p.startsWith("/dashboard/feedback"),
  },
]

function itemActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname)
  return pathname === item.href
}

function NavRowLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}) {
  const active = itemActive(pathname, item)
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 pl-2 text-sm font-medium transition-colors",
    active
      ? "bg-foreground/5 text-foreground"
      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
  )

  return (
    <Link href={item.href} className={className} onClick={onNavigate} prefetch>
      <HugeiconsIcon icon={item.icon} className="size-4 shrink-0" strokeWidth={1.8} />
      <span className="truncate">{item.title}</span>
    </Link>
  )
}

function ThemeToggleFooter() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-[0.97]"
      aria-label="Erscheinungsbild umschalten"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted ? (
        resolvedTheme === "dark" ? (
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34 4.93 4.93M19.07 19.07l-1.41-1.41" />
          </svg>
        ) : (
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )
      ) : (
        <span className="inline-block size-4" aria-hidden />
      )}
    </Button>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname() ?? ""
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const closeSidebarOnNavigate = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  const navScrollRef = React.useRef<HTMLDivElement>(null)
  const [navScrolledFromTop, setNavScrolledFromTop] = React.useState(false)

  const syncNavScrollTop = React.useCallback(() => {
    const el = navScrollRef.current
    if (!el) return
    setNavScrolledFromTop(el.scrollTop > 0)
  }, [])

  React.useLayoutEffect(() => {
    syncNavScrollTop()
  }, [pathname, syncNavScrollTop])

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="floating"
      className={cn(
        "[&_[data-slot=sidebar-inner]]:bg-sidebar",
        "[&_[data-slot=sidebar-inner]]:overflow-hidden",
      )}
      {...props}
    >
      <SidebarHeader className="h-12 min-h-12 shrink-0 gap-0 border-b border-sidebar-border p-0">
        <SidebarGroup className="relative flex h-full w-full min-w-0 flex-col justify-center px-2 py-0">
          <SidebarGroupContent className="w-full text-sm">
            <div className="group flex h-8 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href="/dashboard"
                  onClick={closeSidebarOnNavigate}
                  className={cn(
                    "group/brand inline-flex h-7 max-w-full items-center justify-start gap-1.5 rounded-md px-1.5",
                    "text-sm font-medium whitespace-nowrap text-foreground transition-colors",
                    "hover:bg-foreground/10",
                  )}
                >
                  <span
                    className="flex size-3.5 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium">PDFFabrik.de</div>
                  </div>
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isMobile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 rounded-md p-0 text-foreground hover:bg-foreground/10 active:scale-[0.97]"
                    aria-label="Seitenleiste schließen"
                    onClick={() => setOpenMobile(false)}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={1.8} />
                  </Button>
                ) : null}
                {!isMobile ? (
                  <div className="opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          data-slot="sidebar-trigger"
                          data-sidebar="trigger"
                          className="size-7 shrink-0 cursor-pointer touch-manipulation rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground active:scale-[0.99]"
                          aria-label="Seitenleiste ein- oder ausblenden"
                          onClick={toggleSidebar}
                        >
                          <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" strokeWidth={1.8} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={6} className="flex items-center gap-2">
                        <span>Seitenleiste</span>
                        <kbd
                          className="pointer-events-none inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium select-none"
                        >
                          ⌘/Strg+B
                        </kbd>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : null}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-hidden bg-sidebar">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 z-10 h-10",
              "bg-gradient-to-b from-sidebar to-transparent transition-opacity duration-200",
              navScrolledFromTop ? "opacity-100" : "opacity-0",
            )}
            aria-hidden
          />
          <div
            ref={navScrollRef}
            onScroll={syncNavScrollTop}
            className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-2 [scrollbar-width:thin]"
          >
            <div className="flex flex-col gap-0.5">
              {adminNav.map((item) => (
                <NavRowLink
                  key={item.title}
                  item={item}
                  pathname={pathname}
                  onNavigate={closeSidebarOnNavigate}
                />
              ))}
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-sidebar to-transparent"
            aria-hidden
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 bg-sidebar px-2 py-2">
        <div className="flex items-center gap-1 pt-0.5">
          <ThemeToggleFooter />
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link
              href="/"
              onClick={closeSidebarOnNavigate}
              aria-label="Zur Startseite"
              prefetch
            >
              <HugeiconsIcon icon={Home01Icon} className="size-4" strokeWidth={1.8} />
            </Link>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

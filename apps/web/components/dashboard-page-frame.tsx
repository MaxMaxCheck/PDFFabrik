"use client"

import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger, useSidebar } from "@workspace/ui/components/sidebar"
import type { ReactNode } from "react"

function CollapsedSidebarTrigger() {
  const { state } = useSidebar()
  if (state !== "collapsed") {
    return null
  }
  return (
    <div className="flex shrink-0 items-center gap-1.5 pr-3">
      <SidebarTrigger aria-label="Seitenleiste öffnen" />
      <Separator orientation="vertical" className="!self-center h-4" />
    </div>
  )
}

type DashboardPageFrameProps = {
  /** Inhalt des Breadcrumb-Bereichs (ohne `<nav>`, nur Listenelemente) */
  breadcrumbs: ReactNode
  /** Rechts in der Header-Zeile (z. B. „Aktualisieren“) */
  headerEnd?: ReactNode
  children: ReactNode
}

/**
 * Hauptfläche innerhalb {@link DashboardShell} (SidebarInset): fixe Kopfzeile + scrollbarer Inhalt.
 */
export function DashboardPageFrame({
  breadcrumbs,
  headerEnd,
  children,
}: DashboardPageFrameProps) {
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sidebar text-sidebar-foreground"
      data-dashboard-canvas
    >
      <div className="isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto touch-pan-y">
        <header className="sticky top-0 z-10 flex h-12 min-h-12 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/60 bg-sidebar/95 px-3 backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar/80 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <CollapsedSidebarTrigger />
            <div className="flex min-w-0 items-center pl-0.5">{breadcrumbs}</div>
          </div>
          {headerEnd != null && <div className="shrink-0">{headerEnd}</div>}
        </header>
        <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-4 md:px-8 md:py-6">
          {children}
        </div>
      </div>
    </div>
  )
}

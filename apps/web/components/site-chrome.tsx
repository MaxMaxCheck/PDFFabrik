"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import type { SiteRailSubpanelView } from "@/components/site-rail-subpanel"
import { AppWorkspaceActionsProvider } from "@/components/app-workspace-actions"
import { LoginDialogProvider } from "@/components/login-dialog"
import { SiteChromeHeader } from "@/components/site-chrome-header"
import {
  SiteChromeTopLoadingBar,
  SiteChromeTopLoadingProvider,
} from "@/components/site-chrome-top-loading"
import { SiteRailNav } from "@/components/site-rail-nav"
import { cn } from "@workspace/ui/lib/utils"

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const [leftExtraOpen, setLeftExtraOpen] = useState(false)
  const [subpanelView, setSubpanelView] = useState<SiteRailSubpanelView>("main")

  useEffect(() => {
    if (!leftExtraOpen) setSubpanelView("main")
  }, [leftExtraOpen])

  const subpanelInAppearance = subpanelView === "appearance"

  return (
    <>
      <SiteChromeTopLoadingProvider>
        <AppWorkspaceActionsProvider>
          <LoginDialogProvider>
            <SiteRailNav
              leftExtraOpen={leftExtraOpen}
              onLeftExtraOpenChange={setLeftExtraOpen}
              subpanelView={subpanelView}
              onSubpanelViewChange={setSubpanelView}
            />
            <div
              className={cn(
                "flex h-svh max-h-svh w-full min-w-0 flex-col overflow-x-clip bg-app-canvas",
                "max-lg:pl-0 lg:pl-[calc(0.5rem+4.75rem+0.5rem)]",
              )}
            >
              <div
                className={cn(
                  "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-sm",
                  "max-lg:my-0 max-lg:mr-0 max-lg:rounded-none lg:my-2 lg:mr-2 lg:rounded-xl",
                  "transition-transform duration-250 ease-out will-change-transform",
                  leftExtraOpen && "lg:translate-x-[21rem]",
                )}
              >
                <SiteChromeHeader />
                <SiteChromeTopLoadingBar />
                <div className="min-h-0 w-full min-w-0 flex-1 overflow-x-clip overflow-y-auto [scrollbar-gutter:stable]">
                  {children}
                </div>
              </div>
            </div>
          </LoginDialogProvider>
        </AppWorkspaceActionsProvider>
      </SiteChromeTopLoadingProvider>
      {leftExtraOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 animate-in cursor-default bg-overlay backdrop-blur-[1px] duration-250 fade-in-0"
            aria-label="Zusatzleiste schließen"
            onClick={() => setLeftExtraOpen(false)}
          />
          <button
            id="zusatz-panel-close-x"
            type="button"
            onClick={() => {
              if (subpanelInAppearance) setSubpanelView("main")
              else setLeftExtraOpen(false)
            }}
            className={cn(
              "fixed z-[60] flex size-10 items-center justify-center rounded-full border border-border bg-card p-0 text-foreground shadow-lg",
              "transition-colors hover:bg-muted",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              "top-4 left-4",
            )}
            aria-label={
              subpanelInAppearance ? "Zurück zur Übersicht" : "Zusatzleiste schließen"
            }
          >
            <HugeiconsIcon
              icon={subpanelInAppearance ? ArrowLeft01Icon : Cancel01Icon}
              className="size-4"
              strokeWidth={1.8}
            />
          </button>
          <div className="pointer-events-none fixed top-4 left-2 z-[60] flex h-10 w-[21rem] items-center justify-center px-10">
            <span className="text-center text-[1.05rem] leading-tight font-medium tracking-tight text-foreground">
              {subpanelInAppearance ? "Darstellung" : "PDFFabrik.de"}
            </span>
          </div>
        </>
      ) : null}
    </>
  )
}

"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import type { ReactNode } from "react"

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider defaultOpen className="bg-app-canvas">
        <AppSidebar />
        <SidebarInset className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sidebar text-sidebar-foreground my-2 mr-2 ml-2 rounded-xl shadow-sm md:ml-0 md:peer-data-[state=collapsed]:ml-2">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

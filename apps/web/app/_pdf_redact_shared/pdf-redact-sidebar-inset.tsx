"use client"

import { SidebarInset } from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"

const insetChrome =
  "bg-sidebar text-sidebar-foreground md:peer-data-[variant=inset]:m-0"

export function PdfRedactSidebarInset({
  className,
  ...props
}: React.ComponentProps<typeof SidebarInset>) {
  return <SidebarInset className={cn(insetChrome, className)} {...props} />
}

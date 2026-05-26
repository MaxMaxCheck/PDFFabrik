"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import {
  KontoAccountMenuContent,
  type KontoUser,
} from "@/components/konto-account-menu-content"
import { gradientStyleFromEmailOrId } from "@/lib/user-avatar-gradient"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export function SiteChromeUserMenu({ user }: { user: KontoUser }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? ""
  const emailKey = user.email?.trim() || user.id
  const gradientStyle = useMemo(
    () => gradientStyleFromEmailOrId(emailKey),
    [emailKey]
  )
  const kontoActive = pathname.startsWith("/dashboard")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border pl-1 pr-1.5 transition-colors",
            "border-sidebar-border bg-sidebar text-sm hover:bg-sidebar-accent",
            kontoActive && "border-primary/35 bg-primary/[0.06]",
            open && "border-primary/45 bg-primary/[0.08]"
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Konto-Menü"
        >
          <span
            className="size-5.5 shrink-0 rounded-full ring-1 ring-border/35"
            style={gradientStyle}
            aria-hidden
          />
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            strokeWidth={1.85}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="w-auto max-w-[min(18rem,calc(100vw-5rem))] min-w-[14rem] gap-0 p-0"
      >
        <KontoAccountMenuContent user={user} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

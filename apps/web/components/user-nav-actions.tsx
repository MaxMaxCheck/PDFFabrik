"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function UserNavActions({
  className,
  compact,
}: {
  className?: string
  /** Kleinere Pills (Header) */
  compact?: boolean
}) {
  const router = useRouter()
  const { data, isPending } = authClient.useSession()
  const [signingOut, setSigningOut] = useState(false)

  if (isPending) {
    return (
      <span
        className={cn("text-sm text-muted-foreground", className)}
        aria-hidden
      >
        …
      </span>
    )
  }

  if (data?.user) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          compact && "gap-1.5",
          className,
        )}
      >
        <span
          className={cn(
            "max-w-[10rem] truncate text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
          title={data.user.email}
        >
          {data.user.email}
        </span>
        {(data.user as { role?: string }).role === "admin" && (
          <Link
            href="/dashboard"
            className={cn(
              "inline-flex items-center justify-center border border-border font-medium text-foreground transition-colors hover:bg-muted",
              compact
                ? "rounded-full px-2 py-0.5 text-xs"
                : "rounded-full px-3 py-1 text-sm",
            )}
          >
            Admin Dashboard
          </Link>
        )}
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          className="rounded-full"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true)
            await authClient.signOut()
            setSigningOut(false)
            router.push("/")
            router.refresh()
          }}
        >
          {signingOut ? "…" : "Abmelden"}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact && "gap-1.5",
        className,
      )}
    >
      <Link
        href="/login"
        className={cn(
          "inline-flex items-center justify-center border border-border font-medium text-foreground transition-colors hover:bg-muted",
          compact
            ? "rounded-full px-2 py-0.5 text-xs"
            : "rounded-full px-4 py-1.5 text-sm",
        )}
      >
        Anmelden
      </Link>
      <Link
        href="/register"
        className={cn(
          "inline-flex items-center justify-center font-medium",
          compact
            ? "rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/80"
            : "rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/80",
        )}
      >
        Registrieren
      </Link>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"

export type KontoUser = {
  id: string
  email: string
  name?: string | null
  role?: string
}

/**
 * Gemeinsamer Inhalt für Konto-Popover (Sidebar-Rail & Site-Header).
 */
export function KontoAccountMenuContent({
  user,
  onClose,
}: {
  user: KontoUser
  onClose: () => void
}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <>
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-xs text-muted-foreground">Angemeldet als</p>
        <p
          className="truncate text-sm font-medium text-foreground"
          title={user.email || user.id}
        >
          {user.email || user.id}
        </p>
      </div>
      <nav className="flex flex-col py-1" aria-label="Konto">
        <Link
          href="/konto/api-keys"
          prefetch
          onClick={onClose}
          className="px-3 py-2 text-sm text-foreground/95 transition-colors hover:bg-accent/60"
        >
          API-Schlüssel
        </Link>
        <Link
          href="/konto/api-keys/nutzung"
          prefetch
          onClick={onClose}
          className="px-3 py-2 text-sm text-foreground/95 transition-colors hover:bg-accent/60"
        >
          API-Nutzung & Kosten
        </Link>
        {user.role === "admin" && (
          <>
            <Link
              href="/dashboard"
              prefetch
              onClick={onClose}
              className="px-3 py-2 text-sm text-foreground/95 transition-colors hover:bg-accent/60"
            >
              Admin Dashboard
            </Link>
            <Link
              href="/dashboard/workers"
              prefetch
              onClick={onClose}
              className="px-3 py-2 text-sm text-foreground/95 transition-colors hover:bg-accent/60"
            >
              Workers
            </Link>
          </>
        )}
        <button
          type="button"
          className="w-full px-3 py-2 text-left text-sm text-foreground/95 transition-colors hover:bg-accent/60 disabled:opacity-50"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true)
            await authClient.signOut()
            setSigningOut(false)
            onClose()
            router.push("/")
            router.refresh()
          }}
        >
          {signingOut ? "…" : "Abmelden"}
        </button>
      </nav>
    </>
  )
}

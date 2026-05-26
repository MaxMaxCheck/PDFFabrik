"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"

const ROLE_OPTIONS = [
  { value: "", label: "Alle Rollen" },
  { value: "user", label: "user" },
  { value: "admin", label: "admin" },
]

const VERIFIED_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "yes", label: "Verifiziert" },
  { value: "no", label: "Nicht verifiziert" },
]

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Neueste zuerst" },
  { value: "createdAt_asc", label: "Älteste zuerst" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "usage_desc", label: "Meiste Aktionen" },
]

export function UsersFilterBar({
  total,
  filtered,
}: {
  total: number
  filtered: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete("page") // reset pagination on filter change
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      })
    },
    [params, pathname, router],
  )

  const q = params.get("q") ?? ""
  const role = params.get("role") ?? ""
  const verified = params.get("verified") ?? ""
  const sort = params.get("sort") ?? "createdAt_desc"
  const hasFilters = q || role || verified || sort !== "createdAt_desc"

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : ""}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <Input
          type="search"
          placeholder="Name oder E-Mail suchen…"
          defaultValue={q}
          className="h-8 w-56 rounded-lg text-sm"
          onChange={(e) => update("q", e.target.value)}
        />

        {/* Role filter */}
        <select
          value={role}
          onChange={(e) => update("role", e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Verified filter */}
        <select
          value={verified}
          onChange={(e) => update("verified", e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {VERIFIED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => {
              startTransition(() => {
                router.replace(pathname, { scroll: false })
              })
            }}
          >
            Filter zurücksetzen
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered === total
            ? `${total} Nutzer`
            : `${filtered} von ${total} Nutzern`}
        </span>
      </div>
    </div>
  )
}

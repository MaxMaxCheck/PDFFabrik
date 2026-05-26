"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"

export const ALL_CATEGORIES = [
  "name",
  "address",
  "email",
  "phone",
  "iban",
  "date",
  "license_plate",
  "vin",
  "insurance_number",
  "claim_number",
] as const
export type Category = (typeof ALL_CATEGORIES)[number]

/** Voreinstellung für /pdf-redact-json — alle Kategorien außer Datum. */
export const PDF_REDACT_JSON_DEFAULT_CATEGORIES: Category[] = ALL_CATEGORIES.filter(
  (c) => c !== "date",
)

export const CATEGORY_LABELS: Record<Category, string> = {
  name: "Name",
  address: "Adresse",
  email: "E-Mail",
  phone: "Telefon",
  iban: "IBAN",
  date: "Datum",
  license_plate: "Kennzeichen",
  vin: "Fahrgestellnr.",
  insurance_number: "Vers.-Nr.",
  claim_number: "Schaden-Nr.",
}

const chipClassName = (active: boolean) =>
  cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-[color,box-shadow,border-color,background-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    active
      ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30 ring-inset dark:bg-primary/15"
      : "border-border/70 bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted/80"
  )

export function CategoryFilterChips({
  activeCategories,
  onToggle,
  disabled,
  className,
  listId = "category-filter-chips",
}: {
  activeCategories: Set<Category>
  onToggle: (cat: Category) => void
  disabled?: boolean
  className?: string
  /** Z. B. für `aria-controls` am Mobile-Filter-Button */
  listId?: string
}) {
  return (
    <div
      id={listId}
      className={cn("flex flex-wrap gap-1.5", className)}
      role="list"
    >
      {ALL_CATEGORIES.map((cat) => {
        const active = activeCategories.has(cat)
        return (
          <button
            key={cat}
            type="button"
            role="listitem"
            onClick={() => onToggle(cat)}
            disabled={disabled}
            aria-pressed={active}
            className={chipClassName(active)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        )
      })}
    </div>
  )
}

export function CategoryFilters({
  activeCategories,
  onToggle,
  disabled,
  defaultExpanded = false,
  collapsible = true,
  chipListId = "category-filter-chips",
}: {
  activeCategories: Set<Category>
  onToggle: (cat: Category) => void
  disabled?: boolean
  defaultExpanded?: boolean
  collapsible?: boolean
  /** Eindeutig setzen, wenn mehrere `CategoryFilters` gleichzeitig im DOM sind (z. B. mobile Dialog + desktop). */
  chipListId?: string
}) {
  const [filterOpen, setFilterOpen] = useState(defaultExpanded)

  if (!collapsible) {
    return (
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          Filter:
        </span>
        <CategoryFilterChips
          listId={chipListId}
          activeCategories={activeCategories}
          onToggle={onToggle}
          disabled={disabled}
          className="min-w-0 flex-1"
        />
      </div>
    )
  }

  return (
    <div className="min-w-0 border-b border-border/60 pb-2.5">
      <button
        type="button"
        onClick={() => setFilterOpen((o) => !o)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded-md py-0.5 text-left transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
        aria-expanded={filterOpen}
        aria-controls={chipListId}
      >
        <span className="text-xs font-medium text-muted-foreground">
          Filter
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            filterOpen && "rotate-180"
          )}
        />
      </button>
      {filterOpen ? (
        <div className="pt-2.5">
          <CategoryFilterChips
            listId={chipListId}
            activeCategories={activeCategories}
            onToggle={onToggle}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  )
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      aria-hidden
    />
  )
}

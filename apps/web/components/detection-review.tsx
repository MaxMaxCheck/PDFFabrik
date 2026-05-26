"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"
import type { Detection, DetectionAction } from "@/lib/api-client"

const CATEGORY_LABELS: Record<string, string> = {
  email: "E-Mail",
  phone: "Telefonnummer",
  iban: "IBAN",
  date: "Datum",
  license_plate: "Kennzeichen",
  vin: "Fahrgestellnummer",
  insurance_number: "Versicherungsnummer",
  claim_number: "Schaden-Nr.",
  name: "Name",
  address: "Adresse",
}

const CATEGORY_COLORS: Record<string, string> = {
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  phone: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  iban: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  date: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  license_plate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  vin: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  insurance_number: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  claim_number: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  name: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  address: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
}

interface DetectionRowProps {
  detection: Detection
  action: DetectionAction
  onChange: (action: DetectionAction) => void
  disabled?: boolean
  stacked?: boolean
}

function DetectionRow({
  detection,
  action,
  onChange,
  disabled,
  stacked,
}: DetectionRowProps) {
  return (
    <div
      className={cn(
        "border-b border-border/50 py-2.5 last:border-0",
        stacked
          ? "flex flex-col gap-2"
          : "flex items-center gap-3",
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
          CATEGORY_COLORS[detection.category]
        )}
      >
        {CATEGORY_LABELS[detection.category] ?? detection.category}
      </span>

      <span
        className={cn(
          "font-mono text-sm text-foreground",
          stacked ? "break-all" : "flex-1 truncate",
        )}
        title={detection.value}
      >
        {detection.value}
      </span>

      {detection.score !== undefined && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            detection.score >= 0.8
              ? "text-green-600 dark:text-green-400"
              : detection.score >= 0.5
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-muted-foreground"
          )}
          title="Presidio confidence score"
        >
          {Math.round(detection.score * 100)}%
        </span>
      )}

      <div className={cn("flex shrink-0 flex-wrap gap-1", stacked && "w-full")}>
        {(["redact", "replace", "ignore"] as DetectionAction[]).map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              action === opt
                ? opt === "redact"
                  ? "bg-destructive text-destructive-foreground"
                  : opt === "replace"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                : "border border-border hover:bg-muted text-muted-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {opt === "redact" ? "Schwärzen" : opt === "replace" ? "Platzhalter" : "Ignorieren"}
          </button>
        ))}
      </div>
    </div>
  )
}

interface DetectionReviewProps {
  detections: Detection[]
  choices: Record<string, DetectionAction>
  onChange: (choices: Record<string, DetectionAction>) => void
  onSelectAll: (action: DetectionAction) => void
  disabled?: boolean
  /** Schmale Spalte: Werte umbrechen, Zeilen stapeln */
  variant?: "default" | "sidebar"
  /**
   * Kopfzeile wie bei CategoryFilters (Chevron); Inhalt nur wenn aufgeklappt.
   * `defaultExpanded`: `false` = eingeklappt (wie Filter-Standard).
   */
  collapsible?: boolean
  defaultExpanded?: boolean
  /** Für `aria-controls` am Aufklapp-Button */
  sectionPanelId?: string
}

export function DetectionReview({
  detections,
  choices,
  onChange,
  onSelectAll,
  disabled,
  variant = "default",
  collapsible = false,
  defaultExpanded = false,
  sectionPanelId = "detection-review-fundstellen-panel",
}: DetectionReviewProps) {
  const stacked = variant === "sidebar"
  const [sectionOpen, setSectionOpen] = useState(defaultExpanded)
  const grouped = detections.reduce<Record<string, Detection[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category]!.push(d)
    return acc
  }, {})

  if (detections.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        Keine sensiblen Daten erkannt.
      </div>
    )
  }

  const bulkAndList = (
    <>
      <div
        className={cn(
          "flex gap-2",
          stacked ? "flex-col" : "items-center justify-between",
        )}
      >
        {!collapsible ? (
          <p className="text-sm text-muted-foreground">
            {detections.length} Fundstellen erkannt
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectAll("redact")}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            Alle schwärzen
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectAll("replace")}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            Alle ersetzen
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectAll("ignore")}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            Alle ignorieren
          </button>
        </div>
      </div>

      <div className={cn("space-y-3", stacked && "space-y-2")}>
        {Object.entries(grouped).map(([category, items]) => (
          <div
            key={category}
            className={cn("rounded-lg border border-border", stacked ? "p-3" : "p-4")}
          >
            <h3 className="mb-2 text-sm font-semibold">
              {CATEGORY_LABELS[category] ?? category}{" "}
              <span className="font-normal text-muted-foreground">
                ({items.length})
              </span>
            </h3>
            <div>
              {items.map((d) => (
                <DetectionRow
                  key={d.id}
                  detection={d}
                  action={choices[d.id] ?? "redact"}
                  disabled={disabled}
                  stacked={stacked}
                  onChange={(action) =>
                    onChange({ ...choices, [d.id]: action })
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  if (collapsible) {
    return (
      <div className="min-w-0 border-b border-border/60 pb-2.5">
        <button
          type="button"
          onClick={() => setSectionOpen((o) => !o)}
          disabled={disabled}
          className="flex w-full items-center justify-between gap-2 rounded-md py-0.5 text-left transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
          aria-expanded={sectionOpen}
          aria-controls={sectionPanelId}
        >
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              Fundstellen
            </span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {detections.length} erkannt
            </span>
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              sectionOpen && "rotate-180",
            )}
          />
        </button>
        {sectionOpen ? (
          <div
            id={sectionPanelId}
            className={cn("space-y-3 pt-2.5", stacked && "space-y-2")}
          >
            {bulkAndList}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", stacked && "space-y-2")}>{bulkAndList}</div>
  )
}

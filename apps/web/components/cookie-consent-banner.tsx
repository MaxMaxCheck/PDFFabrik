"use client"

import { useCallback, useEffect, useId, useState } from "react"
import Link from "next/link"
import {
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent-storage"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

function ConsentSwitch({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id?: string
  checked: boolean
  onCheckedChange: (n: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked)
      }}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border-0 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/25"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform",
          checked && "translate-x-[1.15rem]"
        )}
        aria-hidden
      />
    </button>
  )
}

/**
 * Fixiert unten rechts; Zustand in `localStorage` unter `pdffabrik.cookie_consent_v1`.
 */
export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false)
  const [showBar, setShowBar] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const baseId = useId()

  useEffect(() => {
    setMounted(true)
    const existing = readCookieConsent()
    if (existing) {
      setShowBar(false)
      setAnalytics(existing.analytics)
      setMarketing(existing.marketing)
    } else {
      setShowBar(true)
    }
  }, [])

  const applyConsent = useCallback(
    (a: boolean, m: boolean) => {
      writeCookieConsent(a, m)
      setAnalytics(a)
      setMarketing(m)
      setShowBar(false)
      setPrefsOpen(false)
    },
    []
  )

  if (!mounted) {
    return null
  }

  return (
    <>
      {showBar ? (
        <div
          className={cn(
            "fixed z-[200] w-[min(100vw-1.5rem,36rem)] max-w-[calc(100vw-1.5rem)]",
            "bottom-4 right-4 sm:bottom-6 sm:right-6",
            "rounded-2xl border border-border/80 bg-card text-card-foreground shadow-lg",
            "dark:shadow-2xl"
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${baseId}-title`}
          aria-describedby={`${baseId}-desc`}
        >
          <div className="p-4 sm:p-5">
            <h2
              id={`${baseId}-title`}
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Wir verwenden Cookies
            </h2>
            <p
              id={`${baseId}-desc`}
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              Diese Website verwendet Cookies und ähnliche Technologien („Cookies“), die
              für den Betrieb und die Kernfunktionen nötig sind. Weitere Cookies setzen wir
              nur mit Ihrer Einwilligung. Näheres in der{" "}
              <Link
                href="/docs"
                className="font-medium text-foreground underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
                prefetch
              >
                Dokumentation
              </Link>{" "}
              (API &amp; Verarbeitung).
            </p>
          </div>
          <Separator />
          <div className="p-4 sm:p-5">
            <div className="flex min-w-0 flex-row flex-nowrap items-stretch gap-1.5 sm:gap-2">
              <Button
                type="button"
                className="shrink-0 rounded-full px-2.5 text-xs sm:px-4 sm:text-sm"
                onClick={() => applyConsent(true, true)}
              >
                Alle akzeptieren
              </Button>
              <Button
                type="button"
                className="shrink-0 rounded-full bg-foreground px-2.5 text-xs text-background hover:bg-foreground/90 sm:px-4 sm:text-sm"
                onClick={() => applyConsent(false, false)}
              >
                Alle ablehnen
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-w-0 flex-1 rounded-full px-2.5 text-xs sm:px-4 sm:text-sm"
                onClick={() => setPrefsOpen(true)}
              >
                Präferenzen verwalten
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md" showCloseButton>
          <DialogHeader className="space-y-0 border-b border-border/80 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold">Cookie-Einstellungen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="min-w-0 text-sm text-foreground">Notwendige Cookies</p>
              <ConsentSwitch checked disabled onCheckedChange={() => {}} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="min-w-0 text-sm text-foreground">Analyse &amp; Personalisierung</p>
              <ConsentSwitch
                id={`${baseId}-ana`}
                checked={analytics}
                onCheckedChange={setAnalytics}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="min-w-0 text-sm text-foreground">Marketing &amp; Werbung</p>
              <ConsentSwitch
                id={`${baseId}-mkt`}
                checked={marketing}
                onCheckedChange={setMarketing}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border/80 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => applyConsent(true, true)}
              >
                Alle akzeptieren
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => applyConsent(false, false)}
              >
                Alle ablehnen
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => applyConsent(analytics, marketing)}
            >
              Auswahl speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type UsageReport = {
  from: string
  to: string
  pricing: {
    pricePerCallCents: number
    currency: string
    formattedPerCall: string
  }
  rows: {
    apiKeyId: string
    userId?: string
    userName?: string | null
    userEmail?: string
    name: string | null
    label: string
    callCount: number
    costCents: number
  }[]
  totalCalls: number
  totalCostCents: number
  totalFormatted: string
}

function monthStartIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatRowCost(cents: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : currency,
  }).format(cents / 100)
}

type Props = {
  mode: "account" | "admin"
  /** Admin: Nutzung nur für einen Nutzer (z. B. Nutzer-Detailseite). */
  userId?: string
  /** Admin: Tarif-Sektion ausblenden (wenn eingebettet). */
  hidePricing?: boolean
}

export function ApiUsagePanel({ mode, userId, hidePricing }: Props) {
  const [from, setFrom] = useState(monthStartIso)
  const [to, setTo] = useState(todayIso)
  const [report, setReport] = useState<UsageReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [priceCents, setPriceCents] = useState("0")
  const [pricingBusy, setPricingBusy] = useState(false)
  const [pricingMsg, setPricingMsg] = useState<string | null>(null)

  const usageUrl =
    mode === "admin"
      ? "/api/v1/admin/api-usage"
      : "/api/v1/account/api-usage"

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ from, to })
      if (mode === "admin" && userId) q.set("userId", userId)
      const res = await fetch(`${usageUrl}?${q}`)
      const j = (await res.json()) as UsageReport & { error?: string }
      if (!res.ok) {
        setError(j.error ?? `HTTP ${res.status}`)
        setReport(null)
        return
      }
      setReport(j)
    } finally {
      setLoading(false)
    }
  }, [from, to, mode, usageUrl, userId])

  const loadPricing = useCallback(async () => {
    if (mode !== "admin") return
    const res = await fetch("/api/v1/admin/integration-pricing")
    if (res.ok) {
      const j = (await res.json()) as { pricePerCallCents: number }
      setPriceCents(String(j.pricePerCallCents))
    }
  }, [mode])

  useEffect(() => {
    void loadPricing()
    void loadReport()
  }, [loadPricing, loadReport])

  async function savePricing() {
    setPricingBusy(true)
    setPricingMsg(null)
    try {
      const cents = parseInt(priceCents, 10)
      if (Number.isNaN(cents) || cents < 0) {
        setPricingMsg("Bitte ganze Zahl in Cent eingeben (z. B. 15 für 0,15 €).")
        return
      }
      const res = await fetch("/api/v1/admin/integration-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerCallCents: cents, currency: "EUR" }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setPricingMsg(j.error ?? "Speichern fehlgeschlagen")
        return
      }
      setPricingMsg("Tarif gespeichert.")
      await loadReport()
    } finally {
      setPricingBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {mode === "admin" && !hidePricing && (
        <section className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
          <h2 className="text-sm font-semibold">Standard-Tarif (API)</h2>
          <p className="text-xs text-muted-foreground">
            Preis pro erfolgreichem Integrations-Aufruf (pdf-redact-json, pdf-detect).
            Gilt für alle Nutzer und Abrechnungsauswertungen.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="priceCents">Cent pro Aufruf</Label>
              <Input
                id="priceCents"
                type="number"
                min={0}
                step={1}
                value={priceCents}
                onChange={(e) => setPriceCents(e.target.value)}
                className="w-32"
              />
            </div>
            <Button type="button" disabled={pricingBusy} onClick={() => void savePricing()}>
              Tarif speichern
            </Button>
          </div>
          {pricingMsg && <p className="text-xs text-muted-foreground">{pricingMsg}</p>}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Nutzung im Zeitraum</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="from">Von</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Bis</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button type="button" disabled={loading} onClick={() => void loadReport()}>
            {loading ? "Lädt…" : "Auswerten"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {report && (
          <>
            <p className="text-sm text-muted-foreground">
              Tarif: <strong className="text-foreground">{report.pricing.formattedPerCall}</strong> pro
              Aufruf · Zeitraum laut Filter
            </p>

            {report.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine API-Aufrufe in diesem Zeitraum.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      {mode === "admin" && !userId && (
                        <th className="px-3 py-2">Nutzer</th>
                      )}
                      <th className="px-3 py-2">Schlüssel</th>
                      <th className="px-3 py-2 text-right">Aufrufe</th>
                      <th className="px-3 py-2 text-right">Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.apiKeyId} className="border-b border-border/60">
                        {mode === "admin" && !userId && (
                          <td className="px-3 py-2">
                            {r.userId ? (
                              <Link
                                href={`/dashboard/user/${r.userId}/usage`}
                                className="text-foreground hover:text-primary hover:underline"
                              >
                                <span className="font-medium">
                                  {r.userName || r.userEmail || "—"}
                                </span>
                                {r.userName && r.userEmail && (
                                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                                    {r.userEmail}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <span className="text-foreground">{r.label}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.callCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatRowCost(r.costCents, report.pricing.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/20 font-medium">
                      <td
                        className="px-3 py-2"
                        colSpan={mode === "admin" && !userId ? 2 : 1}
                      >
                        Gesamt
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{report.totalCalls}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{report.totalFormatted}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

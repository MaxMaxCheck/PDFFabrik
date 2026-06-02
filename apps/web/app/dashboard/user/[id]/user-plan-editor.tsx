"use client"

import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useRouter } from "next/navigation"
import { useState } from "react"

type UserPlan = "free" | "pro"
type UserKind = "default" | "partner"

type Props = {
  userId: string
  initialPlan: UserPlan
  initialKind: UserKind
}

export function UserPlanEditor({ userId, initialPlan, initialKind }: Props) {
  const router = useRouter()
  const [plan, setPlan] = useState<UserPlan>(initialPlan)
  const [kind, setKind] = useState<UserKind>(initialKind)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = plan !== initialPlan || kind !== initialKind

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, kind }),
      })
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        throw new Error(payload?.error ?? "Speichern fehlgeschlagen.")
      }
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Tarif &amp; Partner</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Pro schaltet PDF Schwärzen frei (unbegrenzt). Partner ist nur für die Abrechnung —
        Features kommen über Pro.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="user-plan">Plan</Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as UserPlan)}>
            <SelectTrigger id="user-plan" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="user-kind">Art (Abrechnung)</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as UserKind)}>
            <SelectTrigger id="user-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standard</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void handleSave()}>
          {saving ? "Speichern …" : "Speichern"}
        </Button>
        {saved && !dirty && (
          <span className="text-xs text-green-600 dark:text-green-400">Gespeichert.</span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </section>
  )
}

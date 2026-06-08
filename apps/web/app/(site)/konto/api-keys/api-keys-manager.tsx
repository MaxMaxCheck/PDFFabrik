"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { useCallback, useEffect, useState } from "react"
import {
  INTEGRATION_CATEGORIES,
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_PRESETS,
  type IntegrationCategory,
} from "@/lib/integration-categories"

type KeyRow = {
  id: string
  name: string | null
  createdAt: string
  lastUsedAt: string | null
  label: string
  defaultCategories: string[]
  defaultMode: string
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [preset, setPreset] = useState<string>("all")
  const [categories, setCategories] = useState<IntegrationCategory[]>([
    ...INTEGRATION_CATEGORIES,
  ])
  const [mode, setMode] = useState<"replace" | "redact">("replace")
  const [busy, setBusy] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)

  const applyPreset = (slug: string) => {
    setPreset(slug)
    const p = INTEGRATION_PRESETS[slug]
    if (p) setCategories([...p.categories])
  }

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch("/api/v1/account/api-keys")
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      setKeys([])
      return
    }
    const data = (await res.json()) as { keys: KeyRow[] }
    setKeys(data.keys)
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  async function createKey() {
    setBusy(true)
    setError(null)
    setNewKey(null)
    try {
      const res = await fetch("/api/v1/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: label.trim() || undefined,
          defaultCategories: categories,
          defaultMode: mode,
        }),
      })
      const j = (await res.json()) as { key?: string; error?: string }
      if (!res.ok) {
        setError(j.error ?? `HTTP ${res.status}`)
        return
      }
      if (typeof j.key === "string") setNewKey(j.key)
      setLabel("")
      applyPreset("all")
      setMode("replace")
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    if (!confirm("Schlüssel wirklich widerrufen? Integrationen mit diesem Schlüssel schlagen fehl.")) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/account/api-keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? `HTTP ${res.status}`)
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  const toggleCategory = (cat: IntegrationCategory, checked: boolean) => {
    setPreset("custom")
    const next = checked
      ? [...categories, cat]
      : categories.filter((c) => c !== cat)
    setCategories(next.length > 0 ? next : [...INTEGRATION_CATEGORIES])
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade …</p>
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {newKey && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-200">Neuer Schlüssel (nur jetzt sichtbar)</p>
          <code className="mt-2 block break-all rounded bg-background/80 px-2 py-1.5 text-xs text-foreground">
            {newKey}
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            In MaxCheck als Key-Profil hinterlegen — Kategorien sind an diesen Token gebunden.
          </p>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Neuen Schlüssel erstellen</h2>
        <p className="text-xs text-muted-foreground">
          Policy am Token: Integrationen (z. B. MaxCheck) senden nur PDF + Bearer — keine
          Kategorien im Request.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Bezeichnung (z. B. maxcheck-gutachten)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="sm:max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Preset</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(INTEGRATION_PRESETS).map(([slug, p]) => (
              <Button
                key={slug}
                type="button"
                size="sm"
                variant={preset === slug ? "default" : "outline"}
                onClick={() => applyPreset(slug)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INTEGRATION_CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={categories.includes(cat)}
                onChange={(e) => toggleCategory(cat, e.target.checked)}
              />
              {INTEGRATION_CATEGORY_LABELS[cat]}
            </label>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Modus</label>
          <select
            value={mode}
            onChange={(e) =>
              setMode(e.target.value === "redact" ? "redact" : "replace")
            }
            className="flex h-9 max-w-xs rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="replace">Platzhalter</option>
            <option value="redact">Leer schwärzen</option>
          </select>
        </div>

        <Button type="button" disabled={busy} onClick={() => void createKey()}>
          Erzeugen
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Vorhandene Schlüssel</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Schlüssel.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-foreground">{k.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {k.defaultCategories.length > 0
                      ? `${k.defaultCategories.length} Kategorien · ${k.defaultMode}`
                      : `Alle Kategorien · ${k.defaultMode}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Erstellt {new Date(k.createdAt).toLocaleString("de-DE")}
                    {k.lastUsedAt
                      ? ` · Zuletzt ${new Date(k.lastUsedAt).toLocaleString("de-DE")}`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={() => void revoke(k.id)}
                >
                  Widerrufen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

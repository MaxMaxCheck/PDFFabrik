"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Attachment01Icon } from "@hugeicons/core-free-icons"
import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { LoadingSpinner } from "@/app/_pdf_redact_shared/category-filters"

type Turn = {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function ChatPage() {
  const { data: session, isPending } = authClient.useSession()
  const [input, setInput] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendReady, setBackendReady] = useState<boolean | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/v1/chat")
      .then((r) => r.json())
      .then((j: { ready?: boolean }) => {
        if (!cancelled) setBackendReady(j.ready === true)
      })
      .catch(() => {
        if (!cancelled) setBackendReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turns, loading])

  const send = useCallback(async () => {
    if (!session?.user) return
    const text = input.trim()
    const hasFile = Boolean(file && file.size > 0)
    if (!text && !hasFile) {
      setError("Bitte Text eingeben oder eine Datei wählen.")
      return
    }

    setError(null)
    setLoading(true)
    const userLine =
      [text && `„${text}“`, file && `Datei: ${file.name}`]
        .filter(Boolean)
        .join("\n") || "(Analyse)"

    setTurns((t) => [
      ...t,
      { id: crypto.randomUUID(), role: "user", content: userLine },
    ])
    setInput("")
    const sendFile = file
    setFile(null)
    if (fileRef.current) fileRef.current.value = ""

    const form = new FormData()
    form.set("message", text)
    if (sendFile) form.set("file", sendFile)

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        body: form,
      })
      const data = (await res.json()) as { reply?: string; error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? `Anfrage fehlgeschlagen (${res.status})`)
      }
      const reply = data.reply?.trim() ?? ""
      setTurns((t) => [
        ...t,
        { id: crypto.randomUUID(), role: "assistant", content: reply || "—" },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }, [input, file, session?.user])

  if (isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        …
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          KI-Chat
        </h1>
        <p className="mt-3 text-muted-foreground">
          Melde dich an, um mit deinem Ollama-Modell zu chatten und Dateien zu
          analysieren.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/login?next=%2Fchat" prefetch>
            Anmelden
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[min(100dvh,900px)] w-full min-w-0 max-w-3xl min-h-0 flex-col gap-3 px-3 py-4 sm:px-4">
      <div className="shrink-0">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          KI-Chat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fragen stellen oder PDF / Bild hochladen — Antworten kommen von deinem
          Ollama-Server (Server-seitig, ohne API-Key im Browser).
        </p>
        {backendReady === false && (
          <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
            Hinweis: <code className="text-xs">OLLAMA_BASE_URL</code> und{" "}
            <code className="text-xs">OLLAMA_MODEL</code> fehlen in der
            Umgebung. Bitte in der <code className="text-xs">.env</code> setzen
            und den Server neu starten.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card/40 p-3 sm:p-4">
        {turns.length === 0 && !loading && (
          <p className="text-center text-sm text-muted-foreground">
            Noch keine Nachrichten. Schreib etwas unten oder hänge eine Datei
            an.
          </p>
        )}
        {turns.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex w-full",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[min(100%,36rem)] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap shadow-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner className="h-4 w-4" />
            Antwort wird erzeugt …
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="shrink-0 w-full min-w-0">
        <div className="w-full min-w-0 rounded-2xl border border-border bg-muted/20 p-2.5 shadow-xs sm:p-3">
          <div className="mb-2.5 flex min-w-0 flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,.pdf"
              className="sr-only"
              id="chat-file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-w-full gap-1.5 truncate"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              <HugeiconsIcon
                icon={Attachment01Icon}
                className="size-4 shrink-0"
              />
              <span className="truncate">
                {file ? file.name : "PDF / Bild anhängen"}
              </span>
            </Button>
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null)
                  if (fileRef.current) fileRef.current.value = ""
                }}
              >
                Entfernen
              </Button>
            )}
          </div>

          {/* Untereinander bis md: — nebeneinander erzwingt min-w-0 + basis-0, damit die Textarea nicht kollabiert */}
          <div className="flex w-full min-w-0 flex-col gap-2.5 md:flex-row md:items-stretch md:gap-3">
            <textarea
              rows={4}
              className="box-border w-full min-h-[5.5rem] min-w-0 max-w-full flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-[5rem] md:flex-1 md:basis-0"
              placeholder="Deine Frage … (Text optional, wenn du nur eine Datei sendest)"
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <Button
              type="button"
              className="h-10 w-full shrink-0 md:h-auto md:min-h-[2.5rem] md:min-w-[6.5rem] md:max-w-[8rem] md:self-stretch"
              disabled={loading}
              onClick={() => void send()}
            >
              Senden
            </Button>
          </div>
          <p className="mt-2.5 text-[11px] text-muted-foreground">
            <kbd className="rounded border border-border bg-background px-1">
              ⌘
            </kbd>
            /{" "}
            <kbd className="rounded border border-border bg-background px-1">
              Strg
            </kbd>
            +
            <kbd className="rounded border border-border bg-background px-1">
              Enter
            </kbd>{" "}
            zum Senden
          </p>
        </div>
      </div>
    </div>
  )
}

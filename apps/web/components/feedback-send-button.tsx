"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Mail01Icon } from "@hugeicons/core-free-icons"
import { authClient } from "@/lib/auth-client"
import {
  Dialog,
  DialogContent,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"

const RATING_OPTIONS = [
  { value: 1, emoji: "😤", label: "Sehr unzufrieden" },
  { value: 2, emoji: "😐", label: "Unzufrieden" },
  { value: 3, emoji: "🙂", label: "Neutral" },
  { value: 4, emoji: "😎", label: "Zufrieden" },
  { value: 5, emoji: "😍", label: "Sehr zufrieden" },
] as const

type FeedbackSendButtonProps = {
  className?: string
}

export function FeedbackSendButton({ className }: FeedbackSendButtonProps) {
  const pathname = usePathname() ?? "/"
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [email, setEmail] = useState("")
  const [showEmail, setShowEmail] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setRating(null)
    setEmail(session?.user?.email ?? "")
    setShowEmail(Boolean(session?.user?.email))
    setMessage("")
    setError(null)
    setSuccess(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          message,
          rating: rating ?? undefined,
          pagePath: pathname,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Feedback konnte nicht gesendet werden.")
        return
      }
      setSuccess(true)
      setMessage("")
      setRating(null)
    } catch {
      setError("Netzwerkfehler — bitte später erneut versuchen.")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = message.trim().length >= 10 && !submitting

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground",
          "transition-colors hover:bg-muted/60 hover:text-foreground",
          className,
        )}
      >
        <HugeiconsIcon icon={Mail01Icon} className="size-4" strokeWidth={1.8} />
        Feedback senden
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "max-w-[min(22rem,calc(100%-2rem))] !gap-0 overflow-hidden rounded-2xl border border-white/10",
            "!p-0 bg-[#2c2c2e] text-white shadow-2xl ring-0 sm:max-w-[22rem]",
            "dark:bg-[#2c2c2e]",
          )}
        >
          <div className="relative px-4 pt-3.5 pb-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/15"
              aria-label="Schließen"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
            </button>

            {success ? (
              <div className="pr-8">
                <h2 className="text-base font-semibold tracking-tight">Danke!</h2>
                <p className="mt-1.5 text-sm text-white/65">
                  Wir haben dein Feedback erhalten und lesen jede Nachricht.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 flex h-10 w-full items-center justify-center rounded-xl bg-white/90 text-sm font-semibold text-[#1c1c1e] transition-opacity hover:bg-white"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="pr-8">
                  <h2 className="text-base font-semibold tracking-tight">Feedback senden</h2>
                  <p className="mt-0.5 text-xs text-white/55">Wir lesen alles!</p>
                </div>

                <div
                  className="mt-3.5 flex justify-between gap-1"
                  role="radiogroup"
                  aria-label="Zufriedenheit"
                >
                  {RATING_OPTIONS.map((opt) => {
                    const selected = rating === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={opt.label}
                        onClick={() =>
                          setRating((r) => (r === opt.value ? null : opt.value))
                        }
                        className={cn(
                          "flex size-10 flex-1 items-center justify-center rounded-full text-lg transition-all",
                          "bg-white/[0.07] hover:bg-white/12",
                          selected && "scale-105 bg-white/18 ring-2 ring-white/25",
                        )}
                      >
                        <span aria-hidden>{opt.emoji}</span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-4 text-sm font-medium text-white/90">
                  Wie können wir dein Erlebnis verbessern?
                </p>

                <textarea
                  id="feedback-message"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  placeholder="Schreib dein Feedback …"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                  className={cn(
                    "mt-2 w-full resize-none rounded-xl border-0 bg-[#3a3a3c] px-3 py-2.5 text-sm text-white",
                    "placeholder:text-white/35",
                    "focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />

                {!showEmail ? (
                  <button
                    type="button"
                    onClick={() => setShowEmail(true)}
                    className="mt-1.5 text-left text-xs text-white/45 transition-colors hover:text-white/70"
                  >
                    E-Mail für Rückfrage angeben (optional)
                  </button>
                ) : (
                  <input
                    id="feedback-email"
                    type="email"
                    autoComplete="email"
                    placeholder="E-Mail (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className={cn(
                      "mt-1.5 h-9 w-full rounded-xl border-0 bg-[#3a3a3c] px-3 text-sm text-white",
                      "placeholder:text-white/35",
                      "focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none",
                    )}
                  />
                )}

                {error ? (
                  <p className="mt-2 text-sm text-red-300" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    "mt-3.5 flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                    canSubmit
                      ? "bg-white/90 text-[#1c1c1e] hover:bg-white"
                      : "cursor-not-allowed bg-white/25 text-white/40",
                  )}
                >
                  {submitting ? "Wird gesendet …" : "Feedback senden"}
                </button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

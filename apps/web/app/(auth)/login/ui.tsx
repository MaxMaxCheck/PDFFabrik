"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import { PasswordInput } from "@/components/auth/password-input"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useRouter } from "next/navigation"
import { useState } from "react"

type LoginFormProps = {
  nextPath?: string
  /** z. B. Schließen eines Dialogs nach erfolgreicher Anmeldung. */
  onSuccess?: () => void
  /** Eindeutige Prefixes für `id`/`htmlFor`, falls mehrere Formulare auf der Seite. */
  fieldIdPrefix?: string
}

export function LoginForm({
  nextPath,
  onSuccess,
  fieldIdPrefix = "login",
}: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const target = nextPath?.startsWith("/") ? nextPath : "/pdf-redact"
  const emailId = `${fieldIdPrefix}-email`
  const passwordId = `${fieldIdPrefix}-password`

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const { error: err } = await authClient.signIn.email({
      email: email.trim(),
      password,
      callbackURL: target,
    })
    setPending(false)
    if (err) {
      setError(err.message ?? "Anmeldung fehlgeschlagen.")
      return
    }
    onSuccess?.()
    router.push(target)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={emailId}>E-Mail</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          className="rounded-lg"
          placeholder="name@unternehmen.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={passwordId}>Passwort</Label>
        <PasswordInput
          id={passwordId}
          name="password"
          autoComplete="current-password"
          placeholder="Dein Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "…" : "Anmelden"}
      </Button>
    </form>
  )
}

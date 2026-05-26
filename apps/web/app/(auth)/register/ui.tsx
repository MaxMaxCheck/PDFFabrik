"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import { PasswordInput } from "@/components/auth/password-input"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useRouter } from "next/navigation"
import { useState } from "react"

type RegisterFormProps = {
  nextPath?: string
  fieldIdPrefix?: string
  onSuccess?: () => void
}

export function RegisterForm({
  nextPath,
  fieldIdPrefix = "register",
  onSuccess,
}: RegisterFormProps = {}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Mindestens 8 Zeichen.")
      return
    }
    setPending(true)
    const { error: err } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    })
    setPending(false)
    if (err) {
      setError(err.message ?? "Registrierung fehlgeschlagen.")
      return
    }
    onSuccess?.()
    const target = nextPath?.startsWith("/") ? nextPath : "/pdf-redact"
    router.push(target)
    router.refresh()
  }

  const nameId = `${fieldIdPrefix}-name`
  const emailId = `${fieldIdPrefix}-email`
  const passwordId = `${fieldIdPrefix}-password`

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="name"
          autoComplete="name"
          className="rounded-lg"
          placeholder="Max Mustermann"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
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
          autoComplete="new-password"
          placeholder="Mindestens 8 Zeichen"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen</p>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "…" : "Konto anlegen"}
      </Button>
    </form>
  )
}

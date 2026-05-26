import Link from "next/link"
import { LoginForm } from "./ui"

export const metadata = {
  title: "Anmelden",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Anmelden</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Noch kein Konto?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href={registerHref}
          >
            Registrieren
          </Link>
        </p>
      </div>
      <LoginForm nextPath={next} fieldIdPrefix="login-page" />
    </div>
  )
}

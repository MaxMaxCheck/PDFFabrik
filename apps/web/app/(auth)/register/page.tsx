import Link from "next/link"
import { RegisterForm } from "./ui"

export const metadata = {
  title: "Registrieren",
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Registrieren</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Schon ein Konto?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href={loginHref}
          >
            Anmelden
          </Link>
        </p>
      </div>
      <RegisterForm nextPath={next} />
    </div>
  )
}

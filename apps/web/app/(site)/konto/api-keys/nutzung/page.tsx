import { ApiUsagePanel } from "../api-usage-panel"
import { getAppSession } from "@/lib/get-session"
import Link from "next/link"
import { redirect } from "next/navigation"

export const metadata = {
  title: "API-Nutzung",
}

export default async function ApiUsagePage() {
  const session = await getAppSession()
  if (!session) {
    redirect("/login?next=/konto/api-keys/nutzung")
  }

  return (
    <div className="flex min-h-0 flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <nav className="mb-6 flex gap-4 text-sm">
          <Link
            href="/konto/api-keys"
            className="text-muted-foreground hover:text-foreground"
          >
            API-Schlüssel
          </Link>
          <span className="font-medium text-foreground">Nutzung & Kosten</span>
        </nav>
        <h1 className="text-xl font-semibold tracking-tight">API-Nutzung & Kosten</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Auswertung pro API-Schlüssel im gewählten Zeitraum. Der Tarif wird vom Betreiber
          festgelegt.
        </p>
        <div className="mt-8">
          <ApiUsagePanel mode="account" />
        </div>
      </main>
    </div>
  )
}

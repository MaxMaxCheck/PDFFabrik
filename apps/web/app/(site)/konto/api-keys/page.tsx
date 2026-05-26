import { ApiKeysManager } from "./api-keys-manager"
import { getAppSession } from "@/lib/get-session"
import Link from "next/link"
import { redirect } from "next/navigation"

export const metadata = {
  title: "API-Schlüssel",
}

export default async function ApiKeysPage() {
  const session = await getAppSession()
  if (!session) {
    redirect("/login?next=/konto/api-keys")
  }

  return (
    <div className="flex min-h-0 flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <nav className="mb-4 flex gap-4 text-sm">
          <span className="font-medium text-foreground">API-Schlüssel</span>
          <Link
            href="/konto/api-keys/nutzung"
            className="text-muted-foreground hover:text-foreground"
          >
            Nutzung & Kosten
          </Link>
        </nav>
        <h1 className="text-xl font-semibold tracking-tight">API-Schlüssel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Für programmatische PDF-Analyse (serverseitig). Nutzung und Kosten siehst du unter{" "}
          <Link href="/konto/api-keys/nutzung" className="underline hover:text-foreground">
            Nutzung & Kosten
          </Link>
          .
        </p>
        <div className="mt-8">
          <ApiKeysManager />
        </div>
      </main>
    </div>
  )
}

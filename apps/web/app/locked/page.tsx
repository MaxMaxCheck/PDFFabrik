import { normalizeSiteLockNext } from "@/lib/site-lock"

export const metadata = {
  title: "Zugang gesperrt",
}

export default async function LockedPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const next = normalizeSiteLockNext(params.next)
  const hasError = params.error === "1"

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10 text-sidebar-foreground">
      <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            PDFFabrik
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Seite gesperrt</h1>
          <p className="text-sm text-muted-foreground">
            Gib das Freischalt-Passwort ein, um die Seite zu entsperren.
          </p>
        </div>

        <form action="/api/site-lock/unlock" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Passwort eingeben"
            />
          </div>

          {hasError ? (
            <p className="text-sm text-destructive">Das Passwort ist nicht korrekt.</p>
          ) : null}

          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
          >
            Seite freischalten
          </button>
        </form>
      </div>
    </main>
  )
}

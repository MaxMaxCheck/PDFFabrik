import { getAppSession } from "@/lib/get-session"
import { PDF_TOOL_LABELS } from "@/lib/pdf-tool-usage"
import { prisma } from "@workspace/prisma"
import type { PdfToolKind } from "@prisma/client"

const ORDER: PdfToolKind[] = [
  "anonymize_full",
  "anonymize_text",
  "metadata_view",
  "metadata_strip",
  "api_analyze",
]

/**
 * Eingeloggte Nutzer: Zähler pro PDF-Tool (nur was in der DB steht, sonst 0).
 * Gäste: Hinweis zum Anmelden.
 */
export async function AppModeStartUsageSummary() {
  const session = await getAppSession()
  if (!session) {
    return (
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        <span className="text-foreground">Hinweis:</span> Wenn du dich anmeldest, werden
        abgeschlossene Aktionen (Anonymisieren, Metadaten-Werkzeuge) deinem Konto
        zugeordnet und hier angezeigt.
      </p>
    )
  }

  const rows = await prisma.userPdfToolStat.findMany({
    where: { userId: session.user.id },
  })
  const byTool = new Map<PdfToolKind, number>(rows.map((r) => [r.tool, r.count]))
  const total = ORDER.reduce((s, t) => s + (byTool.get(t) ?? 0), 0)

  return (
    <div className="w-full min-w-0 rounded-xl bg-muted/35 px-4 py-3 md:px-5">
      <h2 className="text-sm font-semibold text-foreground">Deine Nutzung (Konto)</h2>
      {total === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Noch keine erfassten Vorgänge. Sobald du angemeldet bist und ein Werkzeug
          erfolgreich abgeschlossen hast, erscheinen die Zähler hier.
        </p>
      ) : null}
      <ul className="mt-3 grid list-none grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {ORDER.map((tool) => {
          const n = byTool.get(tool) ?? 0
          return (
            <li
              key={tool}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-sidebar/80 px-3 py-2 text-sm"
            >
              <span className="min-w-0 text-muted-foreground">
                {PDF_TOOL_LABELS[tool]}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {n}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

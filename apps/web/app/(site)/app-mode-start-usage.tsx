import { getAppSession } from "@/lib/get-session"
import { PDF_TOOL_LABELS, type PdfToolKind } from "@/lib/pdf-tool-usage"
import { prisma } from "@workspace/prisma"
import Link from "next/link"

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
      <div className="flex flex-col gap-2 border-b border-sidebar-border py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Angemeldet werden abgeschlossene Aktionen deinem Konto zugeordnet.
        </p>
        <Link
          href="/login?next=%2F"
          className="font-semibold text-foreground hover:opacity-55"
        >
          Anmelden →
        </Link>
      </div>
    )
  }

  const rows = await prisma.userPdfToolStat.findMany({
    where: { userId: session.user.id },
  })
  const byTool = new Map<PdfToolKind, number>(
    rows.map((r) => [r.tool, r.count])
  )
  const total = ORDER.reduce((s, t) => s + (byTool.get(t) ?? 0), 0)

  return (
    <div className="w-full min-w-0 border-b border-sidebar-border py-5">
      <h2 className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        Deine Nutzung
      </h2>
      {total === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Noch keine erfassten Vorgänge. Sobald du angemeldet bist und ein
          Werkzeug erfolgreich abgeschlossen hast, erscheinen die Zähler hier.
        </p>
      ) : null}
      <ul className="mt-4 grid list-none grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-3 lg:grid-cols-5">
        {ORDER.map((tool) => {
          const n = byTool.get(tool) ?? 0
          return (
            <li
              key={tool}
              className="flex min-w-0 items-center justify-between gap-2 border-t border-sidebar-border pt-2 text-xs"
            >
              <span className="min-w-0 text-muted-foreground">
                {PDF_TOOL_LABELS[tool]}
              </span>
              <span className="shrink-0 font-semibold text-foreground tabular-nums">
                {n}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

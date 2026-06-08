import { DashboardPageFrame } from "@/components/dashboard-page-frame"
import { prisma } from "@workspace/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { ApiUsagePanel } from "@/app/(site)/konto/api-keys/api-usage-panel"
import { formatApiKeyLabel } from "@/lib/api-key-display"
import {
  INTEGRATION_CATEGORY_LABELS,
  type IntegrationCategory,
} from "@/lib/integration-categories"
import { PDF_TOOL_LABELS, type PdfToolKind } from "@/lib/pdf-tool-usage"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } })
  return { title: user ? `Nutzung – ${user.name || user.email} | Admin` : "Nutzung | Admin" }
}

const TOOL_ORDER: PdfToolKind[] = [
  "anonymize_full",
  "anonymize_text",
  "metadata_view",
  "metadata_strip",
  "api_analyze",
]

const TOOL_DESCRIPTIONS: Record<PdfToolKind, string> = {
  anonymize_full: "Vollständige PDF hochladen, KI-Erkennung, interaktive Prüfung, geschwärzte PDF herunterladen.",
  anonymize_text: "PDF-Text anonymisieren ohne PDF-Ausgabe — gibt bereinigten Fließtext zurück.",
  metadata_view: "PDF-Metadaten (Autor, Ersteller, Datum …) auslesen und anzeigen.",
  metadata_strip: "PDF-Metadaten dauerhaft entfernen und bereinigte PDF herunterladen.",
  api_analyze: "Programm-API: PDF-Analyse (Text + Fundstellen) mit API-Schlüssel.",
}

export default async function AdminUserUsagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      pdfToolStats: true,
      apiKeys: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastUsedAt: true,
          defaultCategories: true,
          defaultMode: true,
        },
      },
    },
  })

  if (!user) notFound()

  const byTool = new Map(user.pdfToolStats.map((s) => [s.tool, s]))
  const totalActions = TOOL_ORDER.reduce((s, t) => s + (byTool.get(t)?.count ?? 0), 0)

  return (
    <DashboardPageFrame
      breadcrumbs={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink asChild>
                <Link href="/dashboard" prefetch>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink asChild>
                <Link href="/dashboard/users" prefetch>Nutzer</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink asChild>
                <Link href={`/dashboard/user/${user.id}`} prefetch={false}>
                  {user.name || user.email}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Nutzung</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex min-h-0 flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Nutzungs-Details
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {user.name || "—"} &middot;{" "}
            <span className="font-mono">{user.email}</span>
          </p>
        </div>

        {/* Summary bar */}
        <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">Vorgänge gesamt</p>
            <p className="text-3xl font-semibold tabular-nums">{totalActions}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">Werkzeuge aktiv</p>
            <p className="text-3xl font-semibold tabular-nums">
              {TOOL_ORDER.filter((t) => (byTool.get(t)?.count ?? 0) > 0).length}
              <span className="text-lg font-normal text-muted-foreground"> / {TOOL_ORDER.length}</span>
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">Zuletzt aktualisiert</p>
            <p className="text-sm font-medium">
              {user.pdfToolStats.length > 0
                ? new Date(
                    Math.max(...user.pdfToolStats.map((s) => s.updatedAt.getTime()))
                  ).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </p>
          </div>
        </div>

        {/* API keys */}
        <section>
          <h2 className="mb-4 text-sm font-semibold">API-Schlüssel</h2>
          {user.apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Dieser Nutzer hat noch keine API-Schlüssel angelegt.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {user.apiKeys.map((key) => {
                const categoryLabels =
                  key.defaultCategories.length > 0
                    ? key.defaultCategories.map(
                        (c) =>
                          INTEGRATION_CATEGORY_LABELS[c as IntegrationCategory] ??
                          c,
                      )
                    : ["Alle Kategorien"]
                return (
                  <div
                    key={key.id}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
                  >
                    <p className="font-medium">{formatApiKeyLabel(key.id, key.name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabels.join(" · ")} · Modus {key.defaultMode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Erstellt{" "}
                      {key.createdAt.toLocaleString("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {key.lastUsedAt
                        ? ` · Zuletzt genutzt ${key.lastUsedAt.toLocaleString("de-DE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}`
                        : " · Noch nicht genutzt"}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* API billing for this user */}
        <section>
          <h2 className="mb-4 text-sm font-semibold">API-Abrechnung (Integrations-Aufrufe)</h2>
          <ApiUsagePanel mode="admin" userId={user.id} hidePricing />
        </section>

        {/* Per-tool breakdown */}
        <section>
          <h2 className="mb-4 text-sm font-semibold">Aufschlüsselung nach Werkzeug</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {TOOL_ORDER.map((t) => {
              const stat = byTool.get(t)
              const count = stat?.count ?? 0
              const pct = totalActions > 0 ? Math.round((count / totalActions) * 100) : 0
              return (
                <div
                  key={t}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{PDF_TOOL_LABELS[t]}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {TOOL_DESCRIPTIONS[t]}
                      </p>
                    </div>
                    <span className="shrink-0 text-2xl font-bold tabular-nums">{count}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct} % der Gesamtaktionen</span>
                    {stat && (
                      <span>
                        Zuletzt:{" "}
                        {stat.updatedAt.toLocaleString("de-DE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Back link */}
        <div>
          <Link
            href={`/dashboard/user/${user.id}`}
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
            prefetch={false}
          >
            ← Zurück zu Nutzer-Details
          </Link>
        </div>
      </div>
    </DashboardPageFrame>
  )
}

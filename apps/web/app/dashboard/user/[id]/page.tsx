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
import { PDF_TOOL_LABELS, type PdfToolKind } from "@/lib/pdf-tool-usage"
import { Button } from "@workspace/ui/components/button"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } })
  return { title: user ? `${user.name || user.email} | Admin` : "Nutzer | Admin" }
}

const TOOL_ORDER: PdfToolKind[] = [
  "anonymize_full",
  "anonymize_text",
  "metadata_view",
  "metadata_strip",
]

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      pdfToolStats: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 10 },
      accounts: true,
    },
  })

  if (!user) notFound()

  const byTool = new Map(user.pdfToolStats.map((s) => [s.tool, s.count]))
  const totalActions = TOOL_ORDER.reduce((s, t) => s + (byTool.get(t) ?? 0), 0)
  const now = new Date()

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
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[14rem] truncate">
                {user.name || user.email}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex min-h-0 flex-col gap-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{user.name || "—"}</h1>
            <p className="mt-0.5 font-mono text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/user/${user.id}/usage`} prefetch={false}>
              Nutzungs-Details →
            </Link>
          </Button>
        </div>

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Rolle">
            <span
              className={
                user.role === "admin"
                  ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                  : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {user.role}
            </span>
          </InfoCard>
          <InfoCard label="E-Mail verifiziert">
            <span className={user.emailVerified ? "text-foreground" : "text-muted-foreground"}>
              {user.emailVerified ? "Ja" : "Nein"}
            </span>
          </InfoCard>
          <InfoCard label="Vorgänge gesamt">
            <span className="text-2xl font-semibold tabular-nums">{totalActions}</span>
          </InfoCard>
          <InfoCard label="Registriert">
            <span className="text-xs tabular-nums text-muted-foreground">
              {user.createdAt.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </InfoCard>
        </div>

        {/* Tool stats */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">Werkzeug-Nutzung</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOOL_ORDER.map((t) => (
              <div
                key={t}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <span className="text-sm text-muted-foreground">{PDF_TOOL_LABELS[t]}</span>
                <span className="ml-3 shrink-0 text-lg font-semibold tabular-nums">
                  {byTool.get(t) ?? 0}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Sessions */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">
            Letzte Sessions{" "}
            <span className="font-normal text-muted-foreground">
              (max. 10)
            </span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
                    <th className="px-3 py-2.5">Erstellt</th>
                    <th className="px-3 py-2.5">Läuft ab</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">IP</th>
                    <th className="px-3 py-2.5">User-Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {user.sessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        Keine Sessions gefunden.
                      </td>
                    </tr>
                  ) : (
                    user.sessions.map((s) => {
                      const active = s.expiresAt > now
                      return (
                        <tr key={s.id} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                            {s.createdAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                            {s.expiresAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={
                                active
                                  ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              }
                            >
                              {active ? "aktiv" : "abgelaufen"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {s.ipAddress || "—"}
                          </td>
                          <td
                            className="max-w-[260px] truncate px-3 py-2.5 text-xs text-muted-foreground"
                            title={s.userAgent ?? undefined}
                          >
                            {s.userAgent || "—"}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Auth accounts */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">Auth-Konten</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
                    <th className="px-3 py-2.5">Provider</th>
                    <th className="px-3 py-2.5">Account-ID</th>
                    <th className="px-3 py-2.5">Angelegt</th>
                  </tr>
                </thead>
                <tbody>
                  {user.accounts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                        Keine Auth-Konten gefunden.
                      </td>
                    </tr>
                  ) : (
                    user.accounts.map((a) => (
                      <tr key={a.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2.5 font-medium">{a.providerId}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {a.accountId}
                        </td>
                        <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                          {a.createdAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </DashboardPageFrame>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

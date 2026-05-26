import { DashboardPageFrame } from "@/components/dashboard-page-frame"
import { prisma } from "@workspace/prisma"
import type { PdfToolKind, UserRole } from "@prisma/client"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import Link from "next/link"
import { Suspense } from "react"
import { UsersFilterBar } from "./users-filter-bar"

export const metadata = {
  title: "Nutzer | Admin",
}

const TOOL_ORDER: PdfToolKind[] = [
  "anonymize_full",
  "anonymize_text",
  "metadata_view",
  "metadata_strip",
  "api_analyze",
]

const TOOL_HEADER_ABBR: Record<PdfToolKind, string> = {
  anonymize_full: "Voll-PDF",
  anonymize_text: "Nur Text",
  metadata_view: "MD anz.",
  metadata_strip: "MD lösch.",
  api_analyze: "API",
}

type SearchParams = {
  q?: string
  role?: string
  verified?: string
  sort?: string
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ""
  const roleFilter = sp.role ?? ""
  const verifiedFilter = sp.verified ?? ""
  const sort = sp.sort ?? "createdAt_desc"

  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { pdfToolStats: true },
  })

  // Filter in-memory (small dataset; avoids complex Prisma WHERE on JSON fields)
  let users = allUsers

  if (q) {
    const lower = q.toLowerCase()
    users = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower),
    )
  }

  if (roleFilter === "admin" || roleFilter === "user") {
    users = users.filter((u) => u.role === (roleFilter as UserRole))
  }

  if (verifiedFilter === "yes") {
    users = users.filter((u) => u.emailVerified)
  } else if (verifiedFilter === "no") {
    users = users.filter((u) => !u.emailVerified)
  }

  // Sort
  users = [...users].sort((a, b) => {
    if (sort === "createdAt_asc") return a.createdAt.getTime() - b.createdAt.getTime()
    if (sort === "name_asc") return (a.name ?? "").localeCompare(b.name ?? "", "de")
    if (sort === "usage_desc") {
      const sumA = a.pdfToolStats.reduce((s, x) => s + x.count, 0)
      const sumB = b.pdfToolStats.reduce((s, x) => s + x.count, 0)
      return sumB - sumA
    }
    // default: createdAt_desc
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  // Stats for summary cards
  const totalUsers = allUsers.length
  const adminCount = allUsers.filter((u) => u.role === "admin").length
  const verifiedCount = allUsers.filter((u) => u.emailVerified).length
  const totalActions = allUsers.reduce(
    (s, u) => s + u.pdfToolStats.reduce((ss, x) => ss + x.count, 0),
    0,
  )

  return (
    <DashboardPageFrame
      breadcrumbs={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink asChild>
                <Link href="/dashboard" prefetch>
                  Dashboard
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Nutzer</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex min-h-0 flex-col gap-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Registrierte Nutzer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Übersicht aller Konten mit Rolle, Verifikationsstatus und Werkzeug-Nutzung.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Nutzer gesamt" value={totalUsers} />
          <StatCard label="Admins" value={adminCount} />
          <StatCard label="Verifiziert" value={verifiedCount} />
          <StatCard label="Aktionen gesamt" value={totalActions} />
        </div>

        {/* Filter bar */}
        <Suspense>
          <UsersFilterBar total={totalUsers} filtered={users.length} />
        </Suspense>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-medium uppercase text-muted-foreground">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">E-Mail</th>
                  <th className="px-3 py-3">Rolle</th>
                  <th className="px-3 py-3">Verifiziert</th>
                  {TOOL_ORDER.map((t) => (
                    <th key={t} className="px-2 py-3 text-center normal-case">
                      {TOOL_HEADER_ABBR[t]}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">Σ</th>
                  <th className="px-3 py-3">Angelegt</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9 + TOOL_ORDER.length}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Keine Nutzer gefunden.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const byTool = new Map(u.pdfToolStats.map((s) => [s.tool, s.count]))
                    const sum = TOOL_ORDER.reduce((acc, t) => acc + (byTool.get(t) ?? 0), 0)
                    return (
                      <tr
                        key={u.id}
                        className="group border-b border-border/80 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-3 font-medium">
                          <Link
                            href={`/dashboard/user/${u.id}`}
                            className="hover:text-primary hover:underline"
                            prefetch={false}
                          >
                            {u.name || "—"}
                          </Link>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={
                              u.role === "admin"
                                ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                                : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            }
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={
                              u.emailVerified
                                ? "text-xs text-green-600 dark:text-green-400"
                                : "text-xs text-muted-foreground"
                            }
                          >
                            {u.emailVerified ? "Ja" : "Nein"}
                          </span>
                        </td>
                        {TOOL_ORDER.map((t) => (
                          <td
                            key={t}
                            className="px-2 py-3 text-center tabular-nums text-muted-foreground"
                          >
                            {byTool.get(t) ?? 0}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center font-medium tabular-nums">
                          {sum}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">
                          {u.createdAt.toLocaleString("de-DE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/dashboard/user/${u.id}`}
                            className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary hover:underline"
                            prefetch={false}
                          >
                            Details →
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardPageFrame>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString("de-DE")}</p>
    </div>
  )
}

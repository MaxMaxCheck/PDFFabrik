import { prisma } from "@workspace/prisma"
import type { PdfToolKind } from "@prisma/client"

export type ToolChartRow = { name: string; value: number; tool: PdfToolKind }
export type RoleChartRow = { name: string; value: number }

export type DashboardAdminStats = {
  userCount: number
  /** Abgeschlossene Anonymisierungen (Voll + Nur Text) */
  processedPdfs: number
  /** Summe aller Zähler (alle Werkzeuge) */
  totalToolActions: number
  lastRegistration: {
    email: string
    name: string
    at: Date
  } | null
  toolChart: ToolChartRow[]
  roleChart: RoleChartRow[]
}

const TOOL_ORDER: PdfToolKind[] = [
  "anonymize_full",
  "anonymize_text",
  "metadata_view",
  "metadata_strip",
  "api_analyze",
]

export async function getDashboardAdminStats(): Promise<DashboardAdminStats> {
  const [userCount, processedAgg, totalAgg, lastUser, toolGroups, roleGroups] =
    await Promise.all([
      prisma.user.count(),
      prisma.userPdfToolStat.aggregate({
        where: { tool: { in: ["anonymize_full", "anonymize_text"] } },
        _sum: { count: true },
      }),
      prisma.userPdfToolStat.aggregate({ _sum: { count: true } }),
      prisma.user.findFirst({
        orderBy: { createdAt: "desc" },
        select: { email: true, name: true, createdAt: true },
      }),
      prisma.userPdfToolStat.groupBy({
        by: ["tool"],
        _sum: { count: true },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
    ])

  const byTool = new Map(toolGroups.map((g) => [g.tool, g._sum.count ?? 0]))
  const short: Record<PdfToolKind, string> = {
    anonymize_full: "Voll-PDF",
    anonymize_text: "Nur Text",
    metadata_view: "MD anz.",
    metadata_strip: "MD lösch.",
    api_analyze: "API",
  }
  const toolChart: ToolChartRow[] = TOOL_ORDER.map((tool) => ({
    tool,
    name: short[tool],
    value: byTool.get(tool) ?? 0,
  }))

  const roleChart: RoleChartRow[] = roleGroups.map((g) => ({
    name: g.role === "admin" ? "Admin" : "User",
    value: g._count._all,
  }))

  return {
    userCount,
    processedPdfs: processedAgg._sum.count ?? 0,
    totalToolActions: totalAgg._sum.count ?? 0,
    lastRegistration: lastUser
      ? { email: lastUser.email, name: lastUser.name, at: lastUser.createdAt }
      : null,
    toolChart,
    roleChart,
  }
}

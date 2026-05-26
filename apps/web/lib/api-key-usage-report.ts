import { prisma } from "@workspace/prisma"
import { formatMoney, getIntegrationPricing } from "@/lib/integration-pricing"

export type ApiKeyUsageRow = {
  apiKeyId: string
  name: string | null
  prefix: string
  callCount: number
  costCents: number
}

export type ApiUsageReport = {
  from: string
  to: string
  pricing: { pricePerCallCents: number; currency: string; formattedPerCall: string }
  rows: ApiKeyUsageRow[]
  totalCalls: number
  totalCostCents: number
  totalFormatted: string
}

export async function buildApiUsageReport(options: {
  userId?: string
  from: Date
  to: Date
}): Promise<ApiUsageReport> {
  const pricing = await getIntegrationPricing()

  const events = await prisma.apiKeyUsageEvent.groupBy({
    by: ["apiKeyId"],
    where: {
      createdAt: { gte: options.from, lte: options.to },
      ...(options.userId ? { userId: options.userId } : {}),
    },
    _count: { _all: true },
  })

  const keyIds = events.map((e) => e.apiKeyId)
  const keys =
    keyIds.length > 0
      ? await prisma.apiKey.findMany({
          where: { id: { in: keyIds } },
          select: { id: true, name: true },
        })
      : []

  const nameById = new Map(keys.map((k) => [k.id, k.name]))

  const rows: ApiKeyUsageRow[] = events
    .map((e) => {
      const callCount = e._count._all
      const costCents = callCount * pricing.pricePerCallCents
      return {
        apiKeyId: e.apiKeyId,
        name: nameById.get(e.apiKeyId) ?? null,
        prefix: `pdffabrik_sk_${e.apiKeyId}.…`,
        callCount,
        costCents,
      }
    })
    .sort((a, b) => b.callCount - a.callCount)

  const totalCalls = rows.reduce((s, r) => s + r.callCount, 0)
  const totalCostCents = totalCalls * pricing.pricePerCallCents

  return {
    from: options.from.toISOString(),
    to: options.to.toISOString(),
    pricing: {
      pricePerCallCents: pricing.pricePerCallCents,
      currency: pricing.currency,
      formattedPerCall: formatMoney(pricing.pricePerCallCents, pricing.currency),
    },
    rows,
    totalCalls,
    totalCostCents,
    totalFormatted: formatMoney(totalCostCents, pricing.currency),
  }
}

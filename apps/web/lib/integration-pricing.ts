import { prisma } from "@workspace/prisma"

export const PRICING_ID = "default"

export type IntegrationPricingRow = {
  pricePerCallCents: number
  currency: string
}

export async function getIntegrationPricing(): Promise<IntegrationPricingRow> {
  const row = await prisma.integrationPricing.findUnique({
    where: { id: PRICING_ID },
  })
  return {
    pricePerCallCents: row?.pricePerCallCents ?? 0,
    currency: row?.currency ?? "EUR",
  }
}

export function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : currency,
  }).format(amount)
}

export function parseDateRange(
  fromParam: string | null,
  toParam: string | null,
): { from: Date; to: Date } | { error: string } {
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  let from = fromParam ? new Date(fromParam) : defaultFrom
  let to = toParam ? new Date(toParam) : defaultTo

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: "Ungültiges Datumsformat (YYYY-MM-DD)." }
  }

  from = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0)
  to = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)

  if (from > to) {
    return { error: "Startdatum muss vor Enddatum liegen." }
  }

  return { from, to }
}

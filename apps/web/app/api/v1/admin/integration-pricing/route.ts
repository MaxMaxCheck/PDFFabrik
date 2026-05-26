import { PRICING_ID } from "@/lib/integration-pricing"
import { getAppSession, isAdmin } from "@/lib/get-session"
import { prisma } from "@workspace/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getAppSession()
  if (!session?.user?.id || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const row = await prisma.integrationPricing.findUnique({
    where: { id: PRICING_ID },
  })

  return NextResponse.json({
    pricePerCallCents: row?.pricePerCallCents ?? 0,
    currency: row?.currency ?? "EUR",
  })
}

export async function PUT(request: Request) {
  const session = await getAppSession()
  if (!session?.user?.id || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { pricePerCallCents?: unknown; currency?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  if (typeof body.pricePerCallCents !== "number" || !Number.isInteger(body.pricePerCallCents)) {
    return NextResponse.json(
      { error: "pricePerCallCents muss eine ganze Zahl (Cent) sein" },
      { status: 400 },
    )
  }

  if (body.pricePerCallCents < 0) {
    return NextResponse.json({ error: "Preis darf nicht negativ sein" }, { status: 400 })
  }

  const currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase().slice(0, 8)
      : "EUR"

  const row = await prisma.integrationPricing.upsert({
    where: { id: PRICING_ID },
    create: {
      id: PRICING_ID,
      pricePerCallCents: body.pricePerCallCents,
      currency,
    },
    update: {
      pricePerCallCents: body.pricePerCallCents,
      currency,
    },
  })

  return NextResponse.json({
    pricePerCallCents: row.pricePerCallCents,
    currency: row.currency,
  })
}

import {
  formatApiKey,
  getApiTokenPepper,
  hashApiToken,
  newApiKeySecret,
} from "@/lib/api-token"
import { parseCategoriesInput } from "@/lib/integration-categories"
import { auth } from "@workspace/auth"
import { prisma } from "@workspace/prisma"
import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      defaultCategories: true,
      defaultMode: true,
    },
  })

  return NextResponse.json({
    keys: rows.map((r) => ({
      ...r,
      prefix: `pdffabrik_sk_${r.id}.…`,
    })),
  })
}

export async function POST(req: Request) {
  try {
    getApiTokenPepper()
  } catch {
    return NextResponse.json(
      { error: "API-Schlüssel sind auf diesem Server nicht konfiguriert." },
      { status: 503 },
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    name?: unknown
    defaultCategories?: unknown
    defaultMode?: unknown
  } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    /* leerer Body ok */
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : null

  let defaultCategories: string[] = []
  try {
    const parsed = parseCategoriesInput(body.defaultCategories)
    if (parsed) defaultCategories = parsed
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ungültige Kategorien" },
      { status: 400 },
    )
  }

  let defaultMode = "replace"
  if (body.defaultMode !== undefined) {
    if (body.defaultMode !== "replace" && body.defaultMode !== "redact") {
      return NextResponse.json(
        { error: "defaultMode muss replace oder redact sein" },
        { status: 400 },
      )
    }
    defaultMode = body.defaultMode
  }

  const id = randomUUID()
  const secret = newApiKeySecret()
  const fullKey = formatApiKey(id, secret)

  await prisma.apiKey.create({
    data: {
      id,
      userId: session.user.id,
      name,
      tokenHash: hashApiToken(fullKey),
      defaultCategories,
      defaultMode,
    },
  })

  return NextResponse.json({
    id,
    key: fullKey,
    defaultCategories,
    defaultMode,
    message: "Nur jetzt sichtbar — bitte sicher speichern.",
  })
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = new URL(req.url).searchParams.get("id")?.trim()
  if (!id) {
    return NextResponse.json({ error: "Query id erforderlich." }, { status: 400 })
  }

  const r = await prisma.apiKey.deleteMany({
    where: { id, userId: session.user.id },
  })

  if (r.count === 0) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

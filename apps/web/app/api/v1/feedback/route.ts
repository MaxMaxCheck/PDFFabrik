import { getAppSession } from "@/lib/get-session"
import { parseFeedbackBody } from "@/lib/site-feedback"
import { prisma } from "@workspace/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 })
  }

  const parsed = parseFeedbackBody(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const session = await getAppSession()
  const pagePath =
    typeof (body as { pagePath?: unknown }).pagePath === "string"
      ? (body as { pagePath: string }).pagePath.slice(0, 512)
      : null

  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null

  const row = await prisma.siteFeedback.create({
    data: {
      message: parsed.message,
      rating: parsed.rating,
      email: parsed.email,
      userId: session?.user?.id ?? null,
      pagePath,
      userAgent,
    },
    select: { id: true, createdAt: true },
  })

  return NextResponse.json({ id: row.id, createdAt: row.createdAt.toISOString() })
}

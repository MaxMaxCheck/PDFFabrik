import { getAppSession, isAdmin } from "@/lib/get-session"
import { prisma } from "@workspace/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await getAppSession()
  if (!session?.user?.id || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "100")
  const limit = Number.isFinite(limitRaw)
    ? Math.min(500, Math.max(1, Math.floor(limitRaw)))
    : 100

  const items = await prisma.siteFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      message: true,
      rating: true,
      email: true,
      pagePath: true,
      userAgent: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  })

  return NextResponse.json({
    items: items.map((f) => ({
      id: f.id,
      message: f.message,
      rating: f.rating,
      email: f.email,
      pagePath: f.pagePath,
      userAgent: f.userAgent,
      createdAt: f.createdAt.toISOString(),
      user: f.user
        ? { id: f.user.id, email: f.user.email, name: f.user.name }
        : null,
    })),
  })
}

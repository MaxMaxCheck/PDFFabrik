import { isPdfToolKind, type PdfToolKind } from "@/lib/pdf-tool-usage"
import { auth } from "@workspace/auth"
import { prisma } from "@workspace/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const tool =
    body &&
    typeof body === "object" &&
    "tool" in body &&
    typeof (body as { tool: unknown }).tool === "string"
      ? (body as { tool: string }).tool
      : null

  if (!tool || !isPdfToolKind(tool)) {
    return NextResponse.json({ error: "Invalid tool" }, { status: 400 })
  }

  const userId = session.user.id
  const kind: PdfToolKind = tool

  await prisma.userPdfToolStat.upsert({
    where: { userId_tool: { userId, tool: kind } },
    create: { userId, tool: kind, count: 1 },
    update: { count: { increment: 1 } },
  })

  return NextResponse.json({ ok: true })
}

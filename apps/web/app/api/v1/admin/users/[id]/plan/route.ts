import { getAppSession, isAdmin } from "@/lib/get-session"
import { prisma, type UserKind, type UserPlan } from "@workspace/prisma"
import { NextResponse } from "next/server"

const PLANS: UserPlan[] = ["free", "pro"]
const KINDS: UserKind[] = ["default", "partner"]

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAppSession()
  if (!session?.user?.id || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await context.params

  let body: { plan?: unknown; kind?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  const data: { plan?: UserPlan; kind?: UserKind } = {}

  if (body.plan !== undefined) {
    if (typeof body.plan !== "string" || !PLANS.includes(body.plan as UserPlan)) {
      return NextResponse.json(
        { error: "plan muss free oder pro sein." },
        { status: 400 }
      )
    }
    data.plan = body.plan as UserPlan
  }

  if (body.kind !== undefined) {
    if (typeof body.kind !== "string" || !KINDS.includes(body.kind as UserKind)) {
      return NextResponse.json(
        { error: "kind muss default oder partner sein." },
        { status: 400 }
      )
    }
    data.kind = body.kind as UserKind
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "plan oder kind erforderlich." }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 })
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, plan: true, kind: true, role: true },
  })

  return NextResponse.json({ user })
}

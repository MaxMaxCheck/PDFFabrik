import {
  getCurrentSessionUserId,
  getPdfToolAccessForUser,
} from "@/lib/pdf-tool-access"
import { isPdfToolKind } from "@/lib/pdf-tool-usage"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tool = searchParams.get("tool")

  if (!tool || !isPdfToolKind(tool)) {
    return NextResponse.json({ error: "Invalid tool" }, { status: 400 })
  }

  const userId = await getCurrentSessionUserId()
  const access = await getPdfToolAccessForUser(userId, tool)

  return NextResponse.json(access)
}

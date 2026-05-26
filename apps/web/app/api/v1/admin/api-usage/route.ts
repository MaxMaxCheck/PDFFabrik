import { buildApiUsageReport } from "@/lib/api-key-usage-report"
import { parseDateRange } from "@/lib/integration-pricing"
import { getAppSession, isAdmin } from "@/lib/get-session"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await getAppSession()
  if (!session?.user?.id || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const range = parseDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
  )
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 })
  }

  const userId = url.searchParams.get("userId")?.trim() || undefined

  const report = await buildApiUsageReport({
    userId,
    from: range.from,
    to: range.to,
  })

  return NextResponse.json(report)
}

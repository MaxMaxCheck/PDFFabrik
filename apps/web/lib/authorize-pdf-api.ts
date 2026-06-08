import {
  consumePdfToolDailyAccess,
  getCurrentSessionUserId,
  getPdfToolAccessForUser,
  getPdfToolAccessMessage,
} from "@/lib/pdf-tool-access"
import type { PdfToolKind } from "@/lib/pdf-tool-usage"
import { NextResponse } from "next/server"

export type PdfApiAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

export async function requirePdfApiSession(): Promise<PdfApiAuthResult> {
  const userId = await getCurrentSessionUserId()
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          detail:
            "Bitte melde dich an oder registriere dich, um dieses PDF-Tool zu nutzen.",
        },
        { status: 401 },
      ),
    }
  }
  return { ok: true, userId }
}

export async function authorizePdfToolUsage(
  userId: string,
  tool: PdfToolKind,
  options?: { consume?: boolean },
): Promise<PdfApiAuthResult> {
  const access = options?.consume
    ? await consumePdfToolDailyAccess(userId, tool)
    : await getPdfToolAccessForUser(userId, tool)

  if (!access.canUse && !access.isUnlimited) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          detail:
            getPdfToolAccessMessage(access) ??
            "Dieses PDF-Tool ist heute nicht mehr verfügbar.",
        },
        { status: 403 },
      ),
    }
  }

  return { ok: true, userId }
}

import { auth } from "@workspace/auth"
import {
  Prisma,
  prisma,
  type PdfToolKind,
  type UserPlan,
} from "@workspace/prisma"
import { headers } from "next/headers"

const ACCESS_TIME_ZONE = "Europe/Berlin"
const FREE_DAILY_LIMIT = 1

type AccessReason = "login_required" | "daily_limit_reached" | null

export type PdfToolAccessState = {
  authenticated: boolean
  canUse: boolean
  reason: AccessReason
  plan: UserPlan | null
  dailyLimit: number | null
  dailyCount: number
  remainingToday: number | null
  isUnlimited: boolean
}

function buildGuestAccessState(): PdfToolAccessState {
  return {
    authenticated: false,
    canUse: false,
    reason: "login_required",
    plan: null,
    dailyLimit: FREE_DAILY_LIMIT,
    dailyCount: 0,
    remainingToday: 0,
    isUnlimited: false,
  }
}

function buildUnlimitedAccessState(plan: UserPlan): PdfToolAccessState {
  return {
    authenticated: true,
    canUse: true,
    reason: null,
    plan,
    dailyLimit: null,
    dailyCount: 0,
    remainingToday: null,
    isUnlimited: true,
  }
}

function buildFreeAccessState(count: number): PdfToolAccessState {
  const remainingToday = Math.max(0, FREE_DAILY_LIMIT - count)
  return {
    authenticated: true,
    canUse: remainingToday > 0,
    reason: remainingToday > 0 ? null : "daily_limit_reached",
    plan: "free",
    dailyLimit: FREE_DAILY_LIMIT,
    dailyCount: count,
    remainingToday,
    isUnlimited: false,
  }
}

function getBerlinDay() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ACCESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const tokens = Object.fromEntries(
    parts
      .filter((part) =>
        part.type === "year" || part.type === "month" || part.type === "day"
      )
      .map((part) => [part.type, part.value])
  ) as Record<"year" | "month" | "day", string>

  const key = `${tokens.year}-${tokens.month}-${tokens.day}`
  return {
    key,
    value: new Date(`${key}T00:00:00.000Z`),
  }
}

async function loadUserPlanState(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, plan: true },
  })
}

export async function getCurrentSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function getPdfToolAccessForUser(
  userId: string | null | undefined,
  tool: PdfToolKind
): Promise<PdfToolAccessState> {
  if (!userId) {
    return buildGuestAccessState()
  }

  const user = await loadUserPlanState(userId)
  if (!user) {
    return buildGuestAccessState()
  }

  if (user.role === "admin" || user.plan === "pro") {
    return buildUnlimitedAccessState("pro")
  }

  const day = getBerlinDay()
  const usage = await prisma.userDailyUsage.findUnique({
    where: {
      userId_tool_date: {
        userId,
        tool,
        date: day.value,
      },
    },
    select: { count: true },
  })

  return buildFreeAccessState(usage?.count ?? 0)
}

export async function consumePdfToolDailyAccess(
  userId: string,
  tool: PdfToolKind
): Promise<PdfToolAccessState> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, plan: true },
          })

          if (!user) {
            return buildGuestAccessState()
          }

          if (user.role === "admin" || user.plan === "pro") {
            return buildUnlimitedAccessState("pro")
          }

          const day = getBerlinDay()
          const usage = await tx.userDailyUsage.findUnique({
            where: {
              userId_tool_date: {
                userId,
                tool,
                date: day.value,
              },
            },
            select: { count: true },
          })

          const currentCount = usage?.count ?? 0
          if (currentCount >= FREE_DAILY_LIMIT) {
            return buildFreeAccessState(currentCount)
          }

          await tx.userDailyUsage.upsert({
            where: {
              userId_tool_date: {
                userId,
                tool,
                date: day.value,
              },
            },
            create: {
              userId,
              tool,
              date: day.value,
              count: 1,
            },
            update: {
              count: {
                increment: 1,
              },
            },
          })

          return buildFreeAccessState(currentCount + 1)
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      )
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 1
      ) {
        continue
      }
      throw error
    }
  }

  return buildFreeAccessState(FREE_DAILY_LIMIT)
}

export function getPdfToolAccessMessage(access: PdfToolAccessState): string | null {
  if (access.reason === "login_required") {
    return "Bitte melde dich an oder registriere dich, um dieses PDF-Tool zu nutzen."
  }
  if (access.reason === "daily_limit_reached") {
    return "Im Free-Plan kannst du dieses Tool einmal pro Tag nutzen."
  }
  return null
}

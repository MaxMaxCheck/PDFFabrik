import { auth } from "@workspace/auth"
import { headers } from "next/headers"

type SessionUser = { id: string; email: string; name: string; role?: string | null }

export type AppSession = {
  user: SessionUser
  session: { id: string; expiresAt: Date }
}

export async function getAppSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return null
  }
  return session as AppSession
}

export function isAdmin(user: SessionUser | undefined): boolean {
  return user?.role === "admin"
}

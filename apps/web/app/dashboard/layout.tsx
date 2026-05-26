import { DashboardShell } from "@/components/dashboard-shell"
import { getAppSession, isAdmin } from "@/lib/get-session"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAppSession()
  if (!session) {
    redirect("/login?next=/dashboard")
  }
  if (!isAdmin(session.user)) {
    redirect("/pdf-redact")
  }
  return <DashboardShell>{children}</DashboardShell>
}

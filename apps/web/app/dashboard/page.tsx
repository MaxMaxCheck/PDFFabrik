import { DashboardHomeCharts } from "@/components/dashboard-home-charts"
import { DashboardPageFrame } from "@/components/dashboard-page-frame"
import { getDashboardAdminStats } from "@/lib/dashboard-admin-stats"
import { getAppSession } from "@/lib/get-session"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export const metadata = {
  title: "Dashboard | Admin",
}

export default async function DashboardPage() {
  const [session, stats] = await Promise.all([getAppSession(), getDashboardAdminStats()])
  const email = session?.user?.email ?? ""

  const lastAt = stats.lastRegistration
    ? stats.lastRegistration.at.toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"

  return (
    <DashboardPageFrame
      breadcrumbs={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Angemeldet als</p>
          <p className="text-lg font-semibold text-foreground">
            <span className="font-medium tabular-nums">{email || "—"}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Registrierte Nutzer</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {stats.userCount.toLocaleString("de-DE")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Konten in der Datenbank
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>PDFs anonymisiert</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {stats.processedPdfs.toLocaleString("de-DE")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Abgeschlossene Läufe (Voll-PDF + Nur Text)
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Letzte neue Anmeldung</CardDescription>
              <CardTitle className="text-lg font-semibold leading-snug">
                {stats.lastRegistration ? (
                  <>
                    <span className="block truncate" title={stats.lastRegistration.email}>
                      {stats.lastRegistration.email}
                    </span>
                    <span className="mt-1 block text-sm font-normal text-muted-foreground">
                      {lastAt}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Zuletzt angelegtes Konto
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Vorgänge gesamt</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {stats.totalToolActions.toLocaleString("de-DE")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Alle Werkzeug-Nutzungen (gezählt)
            </CardContent>
          </Card>
        </div>

        <DashboardHomeCharts
          toolChart={stats.toolChart}
          roleChart={stats.roleChart}
        />
      </div>
    </DashboardPageFrame>
  )
}

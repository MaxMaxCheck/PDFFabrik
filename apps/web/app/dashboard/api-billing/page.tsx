import { ApiUsagePanel } from "@/app/(site)/konto/api-keys/api-usage-panel"
import { DashboardPageFrame } from "@/components/dashboard-page-frame"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

export const metadata = {
  title: "API-Abrechnung | Admin",
}

export default function ApiBillingDashboardPage() {
  return (
    <DashboardPageFrame
      breadcrumbs={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink asChild>
                <Link href="/dashboard" prefetch>
                  Dashboard
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>API-Abrechnung</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex min-h-0 flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">API-Abrechnung</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Standard-Tarif festlegen und API-Nutzung aller Schlüssel nach Zeitraum auswerten.
          </p>
        </div>
        <ApiUsagePanel mode="admin" />
      </div>
    </DashboardPageFrame>
  )
}

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
      title="API-Abrechnung"
      description="Standard-Tarif festlegen und API-Nutzung aller Schlüssel nach Zeitraum auswerten."
    >
      <ApiUsagePanel mode="admin" />
    </DashboardPageFrame>
  )
}

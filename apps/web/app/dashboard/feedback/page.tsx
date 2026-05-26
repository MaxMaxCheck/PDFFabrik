import { DashboardPageFrame } from "@/components/dashboard-page-frame"
import { prisma } from "@workspace/prisma"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import Link from "next/link"

export const metadata = {
  title: "Feedback | Admin",
}

const RATING_EMOJI: Record<number, string> = {
  1: "😤",
  2: "😐",
  3: "🙂",
  4: "😎",
  5: "😍",
}

export default async function AdminFeedbackPage() {
  const items = await prisma.siteFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  })

  return (
    <DashboardPageFrame
      breadcrumbs={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Feedback</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex min-h-0 flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Eingegangene Nachrichten aus dem Zusatzpanel (letzte 200).
          </p>
        </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch kein Feedback eingegangen.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {items.map((f) => {
              const contact =
                f.email ??
                f.user?.email ??
                (f.userId ? `User ${f.userId}` : "—")
              const when = f.createdAt.toLocaleString("de-DE", {
                dateStyle: "medium",
                timeStyle: "short",
              })
              return (
                <li key={f.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {f.rating != null ? (
                        <span className="text-base" title={`Bewertung ${f.rating}/5`}>
                          {RATING_EMOJI[f.rating] ?? "·"}
                        </span>
                      ) : null}
                      {contact}
                    </p>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={f.createdAt.toISOString()}
                    >
                      {when}
                    </time>
                  </div>
                  {f.user?.name ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{f.user.name}</p>
                  ) : null}
                  {f.pagePath ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Seite:{" "}
                      <span className="font-mono text-foreground/80">{f.pagePath}</span>
                    </p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {f.message}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      </div>
    </DashboardPageFrame>
  )
}

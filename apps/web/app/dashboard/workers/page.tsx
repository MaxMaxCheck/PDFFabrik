"use client"

import { useCallback, useEffect, useState } from "react"
import { DashboardPageFrame } from "@/components/dashboard-page-frame"
import { fetchWorkersOverview, type WorkersOverview } from "@/lib/api-client"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

const POLL_MS = 2500

export default function DashboardWorkersPage() {
  const [data, setData] = useState<WorkersOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const w = await fetchWorkersOverview()
      setData(w)
      setError(null)
      setLastFetch(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler")
      setData(null)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  return (
    <DashboardPageFrame
      headerEnd={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={() => void load()}
        >
          Aktualisieren
        </Button>
      }
      breadcrumbs={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Workers</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      {lastFetch && (
        <p className="text-xs text-muted-foreground">
          Letzte Aktualisierung: {lastFetch.toLocaleTimeString()} · Redis/RQ · Polling {POLL_MS / 1000}
          s
        </p>
      )}

      {error && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
          <p className="mt-2 text-xs text-muted-foreground">
            Prüfe, ob die API unter <code className="rounded bg-muted px-1">NEXT_PUBLIC_API_URL</code>{" "}
            erreichbar ist und Redis läuft.
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="grid auto-rows-min gap-3 sm:grid-cols-2">
            <StatCard
              title="Warteschlange"
              value={data.queued_jobs}
              subtitle={`Queue „${data.queue}“ · Redis ${data.redis_ok ? "ok" : "fehlt"}`}
              warn={!data.redis_ok}
            />
            <StatCard
              title="Laufend"
              value={data.running_jobs}
              subtitle="StartedJobRegistry (parallel zu Worker)"
            />
            <StatCard
              title="Fehlgeschlagen (Registry)"
              value={data.failed_jobs}
              subtitle="FailedJobRegistry in Redis"
              warn={data.failed_jobs > 0}
            />
            <StatCard
              title="Worker"
              value={data.worker_count}
              subtitle={
                data.worker_count === 0
                  ? "Kein Worker — Jobs bleiben in der Queue"
                  : "RQ Worker-Prozesse"
              }
              warn={data.worker_count === 0}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Job-Dateien unter <code className="rounded bg-muted px-1">JOBS_DIR</code> werden nach ca.{" "}
            <strong>{data.job_max_age_hours}h</strong> automatisch gelöscht (
            <code className="rounded bg-muted px-1">JOB_MAX_AGE_HOURS</code>).
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Worker-Instanzen</h2>
              {data.workers.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Keine Worker registriert. Starte z. B.{" "}
                  <code className="rounded bg-muted px-1">bun run worker</code> bzw. den RQ-Worker
                  im API-Paket.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {data.workers.map((w) => (
                    <li
                      key={w.name}
                      className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium">{w.name}</p>
                        <p className="text-xs text-muted-foreground">{w.queues.join(", ")}</p>
                      </div>
                      <div className="text-right text-xs">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-medium",
                            w.state === "busy"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {w.state}
                        </span>
                        {w.current_job_id && (
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            Job: {w.current_job_id.slice(0, 8)}…
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="flex flex-col gap-4">
              <JobIdList title="In der Warteschlange" ids={data.queued_job_ids} emptyHint="Leer" />
              <JobIdList
                title="Aktuell gestartet"
                ids={data.running_job_ids}
                emptyHint="Keine"
              />
              {data.failed_job_ids.length > 0 && (
                <JobIdList
                  title="Fehlgeschlagen (Auszug)"
                  ids={data.failed_job_ids}
                  emptyHint=""
                />
              )}
            </div>
          </div>
        </>
      )}
    </DashboardPageFrame>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  warn = false,
}: {
  title: string
  value: number
  subtitle: string
  warn?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        warn ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function JobIdList({
  title,
  ids,
  emptyHint,
}: {
  title: string
  ids: string[]
  emptyHint: string
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      {ids.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="mt-2 max-h-40 overflow-y-auto font-mono text-[11px] text-muted-foreground">
          {ids.map((id) => (
            <li key={id} className="truncate py-0.5">
              {id}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

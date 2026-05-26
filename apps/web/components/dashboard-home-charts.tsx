"use client"

import type { ToolChartRow, RoleChartRow } from "@/lib/dashboard-admin-stats"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const BAR_FILL = "#6366f1"
const PIE_COLORS = ["#6366f1", "#64748b"]

type Props = {
  toolChart: ToolChartRow[]
  roleChart: RoleChartRow[]
}

export function DashboardHomeCharts({ toolChart, roleChart }: Props) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
      <div className="flex min-h-[220px] flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground">Nutzung nach Werkzeug</p>
        <p className="text-xs text-muted-foreground">Abgeschlossene Vorgänge (Zähler)</p>
        <div className="mt-3 min-h-0 w-full min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <BarChart
              data={toolChart}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/50"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "rgba(99, 102, 241, 0.12)" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar
                dataKey="value"
                name="Vorgänge"
                fill={BAR_FILL}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex min-h-[220px] flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground">Nutzerkonten</p>
        <p className="text-xs text-muted-foreground">Verteilung nach Rolle</p>
        <div className="mt-1 flex min-h-0 w-full min-w-0 flex-1 items-center justify-center">
          {roleChart.length === 0 || roleChart.every((r) => r.value === 0) ? (
            <p className="text-sm text-muted-foreground">Noch keine Nutzer in der Datenbank.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <PieChart>
                <Pie
                  data={roleChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={1}
                >
                  {roleChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

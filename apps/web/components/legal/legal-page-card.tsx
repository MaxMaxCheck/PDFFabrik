import type { ReactNode } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export function LegalPageCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-14">
        <Card className="flex flex-col gap-6 rounded-2xl border-border/80 py-6 shadow-sm">
          <CardHeader className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6">
            <CardTitle className="text-3xl font-semibold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 text-sm leading-relaxed text-foreground">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>
}

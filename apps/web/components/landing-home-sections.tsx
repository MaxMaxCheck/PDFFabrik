import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  FileViewIcon,
  Shield01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import Link from "next/link"
import { LandingHeroBackground } from "@/components/landing-hero-background"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const TRUST_POINTS = [
  "Direkt im Browser — keine Installation",
  "Vorschau, bevor du exportierst",
  "Metadaten & Inhalt in einem Flow",
] as const

const VALUE_PROPS = [
  {
    icon: FileViewIcon,
    title: "Erkennen & prüfen",
    description:
      "KI schlägt sensible Stellen vor — du behältst die Kontrolle über jede Schwärzung.",
  },
  {
    icon: Shield01Icon,
    title: "Sicher versenden",
    description:
      "Weniger Risiko bei Weitergabe: Inhalte und Metadaten gezielt bereinigen.",
  },
  {
    icon: CloudUploadIcon,
    title: "Schnell starten",
    description:
      "PDF hochladen, Filter setzen, Ergebnis laden — ohne Tool-Wechsel.",
  },
] as const

const STEPS = [
  { step: "1", title: "PDF hochladen", text: "Ziehen oder auswählen — los geht’s in Sekunden." },
  {
    step: "2",
    title: "Fundstellen prüfen",
    text: "Kategorien filtern, Vorschau ansehen, Auswahl anpassen.",
  },
  {
    step: "3",
    title: "Bereinigt exportieren",
    text: "Geschwärzte PDF oder bereinigte Metadaten herunterladen.",
  },
] as const

export function LandingHero() {
  return (
    <section className="relative isolate min-h-[min(72vh,38rem)] overflow-hidden border-b border-sidebar-border/80">
      <LandingHeroBackground />
      <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-col justify-center px-4 py-14 sm:px-6 md:px-10 md:py-20">
        <p className="inline-flex w-fit items-center rounded-full border border-primary/25 bg-background/55 px-3 py-1 text-xs font-semibold tracking-wide text-primary backdrop-blur-md dark:bg-background/35">
          PDFs datenschutzbewusst
        </p>
        <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-sans)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.65rem] md:leading-[1.12]">
          Sensible Daten finden.{" "}
          <span className="text-primary">Schwärzen.</span> Versenden — ohne Umwege.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          KI-gestützte Anonymisierung mit Vorschau, Metadaten-Werkzeugen und Komprimierung in
          einem Workflow. Ideal für Teams, die PDFs schnell und nachvollziehbar bereinigen müssen.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button size="lg" className="h-11 rounded-full px-6 text-base font-semibold" asChild>
            <Link href="/pdf-redact" prefetch>
              Jetzt PDF schwärzen
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" strokeWidth={2} />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 rounded-full border-sidebar-border bg-sidebar px-6 text-base"
            asChild
          >
            <Link href="/register" prefetch>
              Kostenlos Konto anlegen
            </Link>
          </Button>
        </div>

        <ul className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          {TRUST_POINTS.map((point) => (
            <li
              key={point}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="size-4 shrink-0 text-primary"
                strokeWidth={1.8}
              />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function LandingValueProps() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:px-10 md:py-12">
      <div className="grid gap-4 md:grid-cols-3">
        {VALUE_PROPS.map((item) => (
          <div
            key={item.title}
            className="rounded-xl bg-muted/35 p-5"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={item.icon} className="size-5" strokeWidth={1.8} />
            </span>
            <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function LandingHowItWorks() {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:px-10 md:py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ablauf
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          In drei Schritten zur bereinigten PDF
        </h2>
        <ol className="mt-8 grid list-none gap-4 p-0 md:grid-cols-3">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className="relative rounded-xl bg-muted/30 p-5"
            >
              <span
                className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                aria-hidden
              >
                {item.step}
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button className="rounded-full" asChild>
            <Link href="/pdf-redact" prefetch>
              Erste PDF hochladen
            </Link>
          </Button>
          <Link
            href="/docs"
            className="text-sm font-medium text-primary hover:underline"
            prefetch
          >
            API & Dokumentation
          </Link>
        </div>
      </div>
    </section>
  )
}

export function LandingCtaBand({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 md:px-10 md:pb-14",
        className,
      )}
    >
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-muted/35 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={2} />
            Bereit in unter einer Minute
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Teste PDFFabrik mit deiner nächsten PDF — kostenlos im Browser.
          </h2>
        </div>
        <Button size="lg" className="shrink-0 rounded-full px-6" asChild>
          <Link href="/pdf-redact" prefetch>
            Jetzt starten
          </Link>
        </Button>
      </div>
    </section>
  )
}

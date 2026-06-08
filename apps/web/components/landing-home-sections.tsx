import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  FileViewIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
import Link from "next/link"
import { LandingHeroBackground } from "@/components/landing-hero-background"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const VALUE_PROPS = [
  {
    number: "01",
    icon: FileViewIcon,
    title: "Erkennen",
    description:
      "Sensible Stellen werden vorgeschlagen und direkt im Dokument markiert.",
  },
  {
    number: "02",
    icon: Shield01Icon,
    title: "Kontrollieren",
    description:
      "Du prüfst jede Fundstelle, bevor sie dauerhaft geschwärzt wird.",
  },
  {
    number: "03",
    icon: CloudUploadIcon,
    title: "Exportieren",
    description: "Bereinigte PDF herunterladen und sicher weitergeben.",
  },
] as const

const STEPS = [
  ["01", "PDF ablegen", "Datei auswählen oder direkt in den Browser ziehen."],
  [
    "02",
    "Fundstellen prüfen",
    "Vorschläge filtern, ergänzen und in der Vorschau kontrollieren.",
  ],
  [
    "03",
    "Sicher exportieren",
    "Schwärzungen anwenden und die bereinigte PDF herunterladen.",
  ],
] as const

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[36rem] lg:mx-0" aria-hidden>
      <div className="absolute -inset-5 rounded-[2rem] bg-black/[0.035] blur-2xl dark:bg-white/[0.035]" />
      <div className="relative overflow-hidden rounded-[1.15rem] border border-black/10 bg-[#e9e9e7] shadow-[0_32px_80px_-40px_rgba(0,0,0,0.45)] dark:border-white/10 dark:bg-[#222]">
        <div className="flex h-10 items-center justify-between border-b border-black/8 px-3.5 dark:border-white/8">
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-black/15 dark:bg-white/15" />
            <span className="size-2 rounded-full bg-black/15 dark:bg-white/15" />
            <span className="size-2 rounded-full bg-black/15 dark:bg-white/15" />
          </div>
          <span className="font-mono text-[9px] font-medium text-black/40 dark:text-white/40">
            vertrag_final.pdf
          </span>
          <span className="rounded-full bg-black px-2 py-1 text-[8px] font-semibold text-white dark:bg-white dark:text-black">
            Export
          </span>
        </div>

        <div className="grid grid-cols-[2.4rem_1fr_6.5rem] sm:grid-cols-[3rem_1fr_8rem]">
          <div className="border-r border-black/8 p-2 dark:border-white/8">
            <div className="aspect-[3/4] rounded-[2px] border border-black/10 bg-white shadow-sm dark:bg-[#f3f3f0]" />
            <div className="mt-2 aspect-[3/4] rounded-[2px] border border-black/5 bg-white/40 dark:bg-white/10" />
          </div>
          <div className="p-3 sm:p-5">
            <div className="relative mx-auto aspect-[3/4] max-w-[16rem] overflow-hidden rounded-[3px] bg-[#fffefb] p-[9%] shadow-[0_12px_35px_-18px_rgba(0,0,0,0.45)]">
              <p className="font-mono text-[5px] font-bold tracking-[0.16em] text-black/70 sm:text-[7px]">
                DIENSTLEISTUNGSVERTRAG
              </p>
              <div className="mt-[12%] space-y-[6%]">
                <div className="h-1 w-5/6 rounded-full bg-black/10" />
                <div className="h-1 w-full rounded-full bg-black/10" />
                <div className="h-1 w-11/12 rounded-full bg-black/10" />
                <div className="relative h-1 w-4/5 rounded-full bg-black/10">
                  <span className="absolute -inset-x-1 -inset-y-1.5 rounded-[2px] border border-[#ff5c35] bg-[#ff5c35]/10" />
                  <span className="absolute inset-0 bg-black/85" />
                </div>
                <div className="h-1 w-full rounded-full bg-black/10" />
                <div className="h-1 w-3/4 rounded-full bg-black/10" />
              </div>
              <div className="mt-[18%] space-y-[6%]">
                <div className="h-1 w-full rounded-full bg-black/10" />
                <div className="relative h-1 w-10/12 rounded-full bg-black/10">
                  <span className="absolute -inset-x-1 -inset-y-1.5 rounded-[2px] border border-[#ff5c35] bg-[#ff5c35]/10" />
                  <span className="absolute inset-0 bg-black/85" />
                </div>
                <div className="h-1 w-11/12 rounded-full bg-black/10" />
                <div className="h-1 w-full rounded-full bg-black/10" />
              </div>
              <span className="absolute right-[7%] bottom-[4%] font-mono text-[5px] text-black/25">
                01
              </span>
            </div>
          </div>
          <div className="border-l border-black/8 p-2.5 sm:p-3 dark:border-white/8">
            <p className="text-[8px] font-semibold text-black/45 dark:text-white/45">
              ERKANNT
            </p>
            <div className="mt-3 space-y-2">
              {["Name", "Adresse", "E-Mail"].map((label, index) => (
                <div
                  key={label}
                  className="rounded-md border border-black/8 bg-white/65 p-2 dark:border-white/8 dark:bg-white/5"
                >
                  <span className="block text-[7px] font-medium text-black/70 dark:text-white/70">
                    {label}
                  </span>
                  <span className="mt-1 block h-1 rounded-full bg-black/10 dark:bg-white/10" />
                  <span className="mt-1 block h-1 w-2/3 rounded-full bg-black/10 dark:bg-white/10" />
                  {index === 0 ? (
                    <span className="mt-2 inline-flex rounded-full bg-[#ff5c35]/12 px-1.5 py-0.5 text-[6px] font-semibold text-[#d63c17] dark:text-[#ff8d72]">
                      Ausgewählt
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 -bottom-4 flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 shadow-lg dark:border-white/10 dark:bg-[#292929]">
        <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
          ✓
        </span>
        <span className="text-[10px] font-semibold">3 Fundstellen geprüft</span>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-sidebar-border">
      <LandingHeroBackground />
      <div className="relative mx-auto grid min-h-[43rem] w-full max-w-[90rem] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-24 xl:px-16">
        <div className="max-w-[48rem]">
          <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-[#ff5c35]" />
            Datenschutz, der mitdenkt
          </div>
          <h1 className="mt-6 text-[clamp(3rem,7vw,7.6rem)] leading-[0.88] font-semibold tracking-[-0.065em] text-balance text-foreground">
            PDFs rein.
            <br />
            <span className="text-muted-foreground/55">Risiken raus.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
            Sensible Inhalte erkennen, kontrolliert schwärzen und sicher
            weitergeben. Eine präzise Arbeitsfläche für PDFs, die vertraulich
            bleiben sollen.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 rounded-full bg-foreground px-6 text-background transition-[transform,background-color] duration-150 active:scale-[0.97]"
              asChild
            >
              <Link href="/pdf-redact" prefetch>
                PDF anonymisieren
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4"
                  strokeWidth={2}
                />
              </Link>
            </Button>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center px-5 text-sm font-semibold text-foreground transition-opacity hover:opacity-55 focus-visible:rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
              prefetch
            >
              So funktioniert es
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {[
              "Vorschau vor Export",
              "Metadaten-Werkzeuge",
              "Keine Installation",
            ].map((point) => (
              <span key={point} className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-3.5 text-foreground"
                  strokeWidth={1.8}
                />
                {point}
              </span>
            ))}
          </div>
        </div>
        <ProductPreview />
      </div>
    </section>
  )
}

export function LandingValueProps() {
  return (
    <section className="border-b border-sidebar-border">
      <div className="mx-auto grid w-full max-w-[90rem] md:grid-cols-3">
        {VALUE_PROPS.map((item, index) => (
          <article
            key={item.title}
            className={cn(
              "group relative min-h-64 p-6 sm:p-8 lg:p-10",
              index > 0 &&
                "border-t border-sidebar-border md:border-t-0 md:border-l"
            )}
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">
                {item.number}
              </span>
              <HugeiconsIcon
                icon={item.icon}
                className="size-5 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-1"
                strokeWidth={1.5}
              />
            </div>
            <h2 className="mt-20 text-2xl font-semibold tracking-[-0.035em]">
              {item.title}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function LandingHowItWorks() {
  return (
    <section className="border-t border-sidebar-border bg-foreground text-background">
      <div className="mx-auto w-full max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28 xl:px-16">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-background/50 uppercase">
              Der Ablauf
            </p>
            <h2 className="mt-5 max-w-md text-4xl leading-[1.02] font-semibold tracking-[-0.05em] text-balance sm:text-5xl">
              Drei Schritte. Volle Kontrolle.
            </h2>
          </div>
          <ol className="border-t border-background/20">
            {STEPS.map(([step, title, text]) => (
              <li
                key={step}
                className="grid gap-4 border-b border-background/20 py-6 sm:grid-cols-[3rem_11rem_1fr] sm:items-start"
              >
                <span className="font-mono text-[10px] text-background/45">
                  {step}
                </span>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="max-w-md text-sm leading-6 text-background/55">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function LandingCtaBand({ className }: { className?: string }) {
  return (
    <section className={cn("border-b border-sidebar-border", className)}>
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-8 px-5 py-20 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12 lg:py-28 xl:px-16">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Bereit für die nächste PDF?
          </p>
          <h2 className="mt-5 max-w-3xl text-4xl leading-[1] font-semibold tracking-[-0.055em] text-balance sm:text-6xl">
            Vertraulich rein.
            <br />
            Bereinigt raus.
          </h2>
        </div>
        <Button
          size="lg"
          className="h-12 shrink-0 rounded-full bg-foreground px-6 text-background transition-transform duration-150 active:scale-[0.97]"
          asChild
        >
          <Link href="/pdf-redact" prefetch>
            Kostenlos starten
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-4"
              strokeWidth={2}
            />
          </Link>
        </Button>
      </div>
    </section>
  )
}

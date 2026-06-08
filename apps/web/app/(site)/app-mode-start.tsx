import {
  LandingCtaBand,
  LandingHero,
  LandingHowItWorks,
  LandingValueProps,
} from "@/components/landing-home-sections"
import { LandingToolGridSection } from "@/components/landing-tool-grid-section"
import Link from "next/link"
import { AppModeStartUsageSummary } from "./app-mode-start-usage"

export function AppModeStartPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-sidebar text-sidebar-foreground">
      <main className="flex-1">
        <LandingHero />
        <LandingValueProps />

        <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12 xl:px-16">
          <AppModeStartUsageSummary />
        </div>

        <section className="border-b border-sidebar-border">
          <div className="mx-auto w-full max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28 xl:px-16">
            <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  Werkzeuge
                </p>
                <h2 className="mt-5 max-w-md text-4xl leading-[1.02] font-semibold tracking-[-0.05em] text-balance sm:text-5xl">
                  Alles für saubere Dokumente.
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
                  Schwärzen, Metadaten prüfen oder Dateien verkleinern. Ein
                  fokussierter Werkzeugkasten ohne unnötige Umwege.
                </p>
              </div>
              <LandingToolGridSection
                includeHeader={false}
                includeToolitPromo={true}
                className="max-w-none"
              />
            </div>
          </div>
        </section>

        <LandingHowItWorks />
        <LandingCtaBand />
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto w-full max-w-[90rem] px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col gap-10 border-b border-sidebar-border pb-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-[-0.035em]">
              PDFFabrik.de
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vertrauliche PDFs. Sauber gelöst.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/pdf-redact" className="hover:opacity-50" prefetch>
              PDF schwärzen
            </Link>
            <Link href="/docs" className="hover:opacity-50" prefetch>
              Dokumentation
            </Link>
            <Link href="/blog" className="hover:opacity-50" prefetch>
              Blog
            </Link>
            <Link href="/impressum" className="hover:opacity-50" prefetch>
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:opacity-50" prefetch>
              Datenschutz
            </Link>
            <Link href="/widerruf" className="hover:opacity-50" prefetch>
              Widerruf
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PDFFabrik.de</p>
          <p>Entwickelt für sensible Dokumente.</p>
        </div>
      </div>
    </footer>
  )
}

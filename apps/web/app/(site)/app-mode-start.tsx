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

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10">
          <AppModeStartUsageSummary />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Werkzeuge
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Alles für sichere PDFs — an einem Ort
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Schwärzen, Metadaten prüfen oder Dateien verkleinern. Wähle das passende Tool —
            ohne zwischen Diensten zu wechseln.
          </p>
          <LandingToolGridSection
            includeHeader={false}
            includeToolitPromo={true}
            className="mt-6 max-w-none"
          />
        </div>

        <LandingHowItWorks />

        <LandingCtaBand />
      </main>

      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-sidebar-border">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold tracking-tight text-foreground">PDFFabrik.de</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Sensible Inhalte erkennen und dauerhaft schwärzen — mit Blick auf Vertraulichkeit,
              nachvollziehbare Prüfungsschritte und Hosting dort, wo es eure Richtlinien vorgeben.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Produkt
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li>
                <Link href="/pdf-redact" className="text-foreground/90 hover:text-primary" prefetch>
                  PDF Schwärzen
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-foreground/90 hover:text-primary" prefetch>
                  Dokumentation
                </Link>
              </li>
              <li>
                <Link
                  href="/meta-daten-anzeigen"
                  className="text-foreground/90 hover:text-primary"
                  prefetch
                >
                  Metadaten anzeigen
                </Link>
              </li>
              <li>
                <Link
                  href="/meta-daten-loeschen"
                  className="text-foreground/90 hover:text-primary"
                  prefetch
                >
                  Metadaten löschen
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-foreground/90 hover:text-primary" prefetch>
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PDFFabrik.de — Betrieb in deiner Verantwortung.
          </p>
        </div>
      </div>
    </footer>
  )
}

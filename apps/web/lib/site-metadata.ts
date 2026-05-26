import type { Metadata } from "next"

/** Kanonische Basis-URL (ohne trailing slash) — `NEXT_PUBLIC_APP_URL` in .env */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "https://pdffabrik.de"
  return raw.replace(/\/$/, "")
}

const titleDefault = "PDFFabrik.de – PDF schwärzen, Metadaten & mehr"

const description =
  "Sensible Daten in PDFs erkennen und dauerhaft schwärzen, Metadaten anzeigen oder entfernen, Dateien komprimieren, Text per OCR auslesen und mit KI auswerten — datenschutzorientiert, für den eigenen Betrieb geeignet."

const keywords = [
  "PDF",
  "PDF schwärzen",
  "PDF anonymisieren",
  "Redaktion",
  "Metadaten",
  "PDF Metadaten löschen",
  "PDF komprimieren",
  "OCR",
  "Datenschutz",
  "Dokumente",
]

/**
 * Globale SEO-/Social-Metadaten (Root-Layout). Unterseiten können `title` setzen;
 * dann greift `template: "%s | PDFFabrik.de"` sofern kein `absolute`-Titel gesetzt wird.
 */
export function buildRootMetadata(): Metadata {
  const base = siteUrl()

  return {
    metadataBase: new URL(base),
    title: {
      default: titleDefault,
      template: "%s | PDFFabrik.de",
    },
    description,
    applicationName: "PDFFabrik.de",
    keywords,
    authors: [{ name: "PDFFabrik.de" }],
    creator: "PDFFabrik.de",
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: "PDFFabrik.de",
      title: titleDefault,
      description,
      url: base,
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    category: "technology",
    formatDetection: {
      telephone: false,
    },
  }
}

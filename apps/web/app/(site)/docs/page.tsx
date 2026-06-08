import { cn } from "@workspace/ui/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001"

export const metadata = {
  title: "API-Dokumentation",
  description: "REST-API für Upload, Analyse, Anonymisierung und Betrieb",
}

const DOC_SECTIONS: { id: string; label: string }[] = [{ id: "basis", label: "Basis" }]

function DocsNav() {
  return (
    <nav
      className="flex flex-col gap-0.5 p-1"
      aria-label="In dieser Seite"
    >
      {DOC_SECTIONS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm leading-snug",
            "text-muted-foreground transition-colors",
            "hover:bg-sidebar-accent hover:text-foreground",
            "active:bg-muted",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export default function DocsPage() {
  return (
    <div className="flex w-full flex-col bg-sidebar text-sidebar-foreground lg:flex-row">
      <aside
        className={cn(
          "w-full shrink-0 border-b border-sidebar-border bg-sidebar lg:w-56 lg:border-b-0 lg:border-r",
          "xl:w-60",
        )}
      >
        <div className="lg:sticky lg:top-0 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto [scrollbar-width:thin]">
          <p className="px-4 pt-4 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase lg:pt-6">
            Inhalt
          </p>
          <div className="px-2 pb-4 lg:pb-6">
            <DocsNav />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Diese Dokumentation befindet sich <strong className="text-foreground">in Bearbeitung</strong>.
          Weitere Endpunkte und Beispiele folgen in Kürze.
        </p>

        <section id="basis" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-semibold">Basis</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Die API ist eine <strong>FastAPI</strong>-Anwendung (Version 2.1.0): Presidio/SpaCy zur
            Erkennung, PyMuPDF zur Schwärzung, <strong>Redis</strong> und <strong>RQ</strong> für
            Hintergrund-Jobs. Alle zeitintensiven Schritte laufen in Worker-Prozessen.
          </p>
          <p className="text-sm">
            <strong>Basis-URL (lokal):</strong>{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{API_BASE}</code>
            <span className="text-muted-foreground">
              {" "}
              — steuerbar über <code className="rounded bg-muted px-1">NEXT_PUBLIC_API_URL</code> in
              der Web-App.
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Alle dokumentierten Endpunkte (außer <code className="rounded bg-muted px-1">GET /</code>
            ) hängen am Präfix{" "}
            <code className="rounded bg-muted px-1">/v1</code> — vollständige URL z. B.{" "}
            <code className="rounded bg-muted px-1">{`${API_BASE}/v1/upload`}</code>
            . Spätere Major-Änderungen können unter <code className="rounded bg-muted px-1">/v2</code>{" "}
            parallel laufen.
          </p>
          <p className="text-sm text-muted-foreground">
            CORS ist für die Web-App auf{" "}
            <code className="rounded bg-muted px-1">localhost:3000</code> und{" "}
            <code className="rounded bg-muted px-1">127.0.0.1:3000</code> freigegeben. Andere
            Origins erfordern Anpassung in der API (<code className="rounded bg-muted px-1">main.py</code>).
          </p>
        </section>
      </main>
    </div>
  )
}

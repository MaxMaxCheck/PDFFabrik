import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001"

export const metadata = {
  title: "API-Dokumentation",
  description: "REST-API für Upload, Analyse, Anonymisierung und Betrieb",
}

const DOC_SECTIONS: { id: string; label: string }[] = [
  { id: "basis", label: "Basis" },
  { id: "ablauf", label: "Ablauf" },
  { id: "get-health", label: "GET /v1/health" },
  { id: "get-root", label: "GET /" },
  { id: "post-upload", label: "POST /v1/upload" },
  { id: "post-anonymize", label: "POST /v1/anonymize" },
  { id: "get-jobs", label: "GET /v1/jobs" },
  { id: "get-jobs-download", label: "GET …/download" },
  { id: "get-workers", label: "GET /v1/workers" },
  { id: "integration", label: "Integration (Web)" },
  { id: "post-detect", label: "POST /v1/detect" },
  { id: "umgebung", label: "Umgebung" },
]

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed sm:text-sm">
      <code>{children}</code>
    </pre>
  )
}

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

          <section id="ablauf" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold">Ablauf (empfohlen)</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">POST /v1/upload</strong> mit PDF → erhält{" "}
                <code className="rounded bg-muted px-1">job_id</code>.
              </li>
              <li>
                <strong className="text-foreground">GET /v1/jobs/{"{job_id}"}</strong> pollen, bis{" "}
                <code className="rounded bg-muted px-1">status</code> <code>finished</code> ist und{" "}
                <code className="rounded bg-muted px-1">upload_result</code> die Fundstellen enthält.
              </li>
              <li>
                <strong className="text-foreground">POST /v1/anonymize</strong> mit derselben PDF-Datei,
                JSON der Fundstellen und Nutzer-Entscheidungen pro ID → wieder{" "}
                <code className="rounded bg-muted px-1">job_id</code>.
              </li>
              <li>
                Job-Status pollen, danach{" "}
                <strong className="text-foreground">GET /v1/jobs/{"{job_id}"}/download</strong> für die
                anonymisierte PDF.
              </li>
            </ol>
          </section>

          <Endpoint
            id="get-health"
            method="GET"
            path="/v1/health"
            title="Healthcheck"
            description={
              'Liefert { "status": "ok" } wenn der API-Prozess antwortet (ohne Redis-Pflicht).'
            }
          />

          <Endpoint
            id="get-root"
            method="GET"
            path="/"
            title="Info"
            description='Kurzinfo inkl. Routenliste unter /v1 und Hinweisen (z. B. OCR/Tesseract).'
          />

          <Endpoint
            id="post-upload"
            method="POST"
            path="/v1/upload"
            title="PDF analysieren (Queue)"
            description="Nimmt eine PDF-Datei entgegen, legt einen Analyse-Job an und antwortet sofort mit job_id. Die eigentliche Arbeit (Text extrahieren, optional OCR, Presidio) läuft im RQ-Worker."
          >
            <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground">
              Request
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <code className="text-foreground">multipart/form-data</code>, Feld{" "}
                <code className="text-foreground">file</code>: PDF (Dateiname muss auf{" "}
                <code className="text-foreground">.pdf</code> enden).
              </li>
            </ul>
            <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground">
              Antwort (200)
            </h3>
            <Code>{`{
  "job_id": "<uuid>",
  "job_kind": "analyze"
}`}</Code>
            <p className="text-sm text-muted-foreground">
              Header: <code className="rounded bg-muted px-1">X-Upload-Mode: job-queue</code>
            </p>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fehler
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>400 — keine/leere Datei oder kein PDF.</li>
              <li>503 — Redis nicht erreichbar (Worker-Pipeline nicht nutzbar).</li>
            </ul>
          </Endpoint>

          <Endpoint
            id="post-anonymize"
            method="POST"
            path="/v1/anonymize"
            title="PDF anonymisieren (Queue)"
            description="Startet die Schwärzung/Ersetzung gemäß der mitgelieferten Fundstellen und Nutzerwahl (redact / replace / ignore). Für reine Scan-PDFs, bei denen die Analyse über OCR lief, muss ocr_used=true gesetzt werden, damit PyMuPDF dieselbe OCR-Geometrie nutzt."
          >
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Request
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <code className="text-foreground">multipart/form-data</code>
              </li>
              <li>
                <code className="text-foreground">file</code> — dieselbe (oder inhaltlich passende)
                PDF wie bei der Analyse.
              </li>
              <li>
                <code className="text-foreground">detections</code> — JSON-Array von Objekten mit
                mindestens: <code className="text-foreground">id</code>,{" "}
                <code className="text-foreground">category</code>,{" "}
                <code className="text-foreground">value</code>, <code className="text-foreground">start</code>
                , <code className="text-foreground">end</code> (Zeichen-Offsets im Analyse-Text).
              </li>
              <li>
                <code className="text-foreground">choices</code> — JSON-Objekt{" "}
                <code className="text-foreground">{"{ \"<detection_id>\": \"redact\" | \"replace\" | \"ignore\" }"}</code>
              </li>
              <li>
                <code className="text-foreground">ocr_used</code> (optional) —{" "}
                <code className="text-foreground">true</code> / <code className="text-foreground">false</code>{" "}
                (String); Standard <code className="text-foreground">false</code>. Bei{" "}
                <code className="text-foreground">true</code> muss die Analyse mit{" "}
                <code className="text-foreground">ocrUsed: true</code> gelaufen sein.
              </li>
            </ul>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Antwort (200)
            </h3>
            <Code>{`{
  "job_id": "<uuid>",
  "job_kind": "anonymize"
}`}</Code>
            <p className="text-sm text-muted-foreground">
              Header: <code className="rounded bg-muted px-1">X-Anonymize-Mode: job-queue</code>
            </p>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fehler
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>400 — ungültiges JSON in detections/choices oder leere Datei.</li>
              <li>503 — Redis nicht erreichbar.</li>
            </ul>
          </Endpoint>

          <Endpoint
            id="get-jobs"
            method="GET"
            path="/v1/jobs/{job_id}"
            title="Job-Status"
            description="Vereinheitlichter Status für Analyse- und Anonymisierungs-Jobs. Fortschritt und Schritt-Text kommen aus job.meta (Worker)."
          >
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Antwort (Felder, Auszug)
            </h3>
            <Code>{`{
  "id": "<uuid>",
  "job_kind": "analyze" | "anonymize",
  "status": "queued" | "started" | "finished" | "failed",
  "step": "…",
  "progress": 0,
  "error": null,
  "download_ready": false,
  "upload_result": {
    "kind": "analyze",
    "text": "…",
    "text_truncated": false,
    "hasSelectableText": true,
    "ocrUsed": false,
    "detections": [
      {
        "id": "…",
        "category": "name",
        "value": "…",
        "start": 0,
        "end": 5,
        "score": 0.9
      }
    ]
  }
}`}</Code>
            <p className="text-sm text-muted-foreground">
              Bei fehlgeschlagener Analyse kann <code className="rounded bg-muted px-1">message</code> in{" "}
              <code className="rounded bg-muted px-1">upload_result</code> stehen;{" "}
              <code className="rounded bg-muted px-1">hasSelectableText: false</code> etwa wenn
              weder Textlayer noch OCR ausreichen.
            </p>
            <p className="text-sm text-muted-foreground">
              Nach Anonymisierung: <code className="rounded bg-muted px-1">download_ready: true</code>, wenn{" "}
              <code className="rounded bg-muted px-1">output.pdf</code> existiert und der Job fertig ist.
            </p>
          </Endpoint>

          <Endpoint
            id="get-jobs-download"
            method="GET"
            path="/v1/jobs/{job_id}/download"
            title="Anonymisierte PDF laden"
            description="Nur für fertige Anonymisierungs-Jobs. Antwort ist application/pdf (Dateiname anonymisiert.pdf)."
          >
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fehler
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>400 — Job noch nicht beendet.</li>
              <li>404 — Job unbekannt oder keine Ausgabedatei.</li>
            </ul>
          </Endpoint>

          <Endpoint
            id="get-workers"
            method="GET"
            path="/v1/workers"
            title="Queue & Worker (Betrieb)"
            description="Übersicht für Monitoring: Redis-Queue, laufende Jobs, Worker-Liste, Auszug fehlgeschlagener Job-IDs. Wird von der Web-App unter /dashboard/workers per Polling genutzt."
          >
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Antwort (Auszug)
            </h3>
            <Code>{`{
  "redis_ok": true,
  "queue": "pdf_jobs",
  "queued_jobs": 0,
  "queued_job_ids": [],
  "running_jobs": 0,
  "running_job_ids": [],
  "failed_jobs": 0,
  "failed_job_ids": [],
  "finished_jobs_retained": 0,
  "workers": [
    { "name": "…", "state": "idle", "current_job_id": null, "queues": ["pdf_jobs"] }
  ],
  "worker_count": 1,
  "job_max_age_hours": 48
}`}</Code>
            <p className="text-sm text-muted-foreground">503, wenn Redis nicht erreichbar ist.</p>
          </Endpoint>

          <section id="integration" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold">Integration über die Web-App</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Für <strong className="text-foreground">programmatische</strong> Aufrufe mit
              Nutzerkontingent und Zählung im Dashboard: Im eingeloggten Bereich unter{" "}
              <strong className="text-foreground">Konto → API-Schlüssel</strong> einen Schlüssel
              erzeugen. Aufruf per <code className="rounded bg-muted px-1">POST</code> gegen die{" "}
              <strong className="text-foreground">Next.js-Origin</strong> (nicht nur die FastAPI), z. B.{" "}
              <code className="rounded bg-muted px-1">
                {typeof process.env.NEXT_PUBLIC_APP_URL === "string"
                  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/v1/integrations/pdf-detect`
                  : "https://pdffabrik.de/api/v1/integrations/pdf-detect"}
              </code>
              , mit <code className="rounded bg-muted px-1">Authorization: Bearer pdffabrik_sk_…</code>{" "}
              und <code className="rounded bg-muted px-1">multipart/form-data</code>-Feld{" "}
              <code className="rounded bg-muted px-1">file</code>. Optional Query{" "}
              <code className="rounded bg-muted px-1">categories</code> (kommagetrennt, siehe unten).
              Jeder erfolgreiche Aufruf erhöht den Zähler <strong className="text-foreground">API (PDF-Analyse)</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Browser-CORS von fremden Origins nur, wenn{" "}
              <code className="rounded bg-muted px-1">INTEGRATION_CORS_ORIGINS</code> gesetzt ist;
              empfohlen ist der Aufruf <strong className="text-foreground">vom eigenen Backend</strong>{" "}
              (kein CORS).
            </p>
          </section>

          <Endpoint
            id="post-detect"
            method="POST"
            path="/v1/detect"
            title="PDF analysieren (synchron, JSON)"
            description="Direkt gegen die FastAPI: liefert Text + Fundstellen wie die Analyse-Job-Antwort. Query categories optional (kommagetrennt); Aliase z. B. schadennummer → claim_number, versicherungsnummer → insurance_number, kennzeichen → license_plate. Ohne categories werden alle erkannten Typen zurückgegeben."
          >
            <p className="mt-2 text-sm text-muted-foreground">
              Erlaubte Kategorien (intern):{" "}
              <code className="rounded bg-muted px-1">
                name, address, email, phone, iban, date, license_plate, vin, insurance_number,
                claim_number
              </code>
              .
            </p>
          </Endpoint>

          <section id="umgebung" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold">Umgebungsvariablen (API, Auszug)</h2>
            <p className="text-sm text-muted-foreground">
              Konfiguration liegt in <code className="rounded bg-muted px-1">lib/settings.py</code> bzw.
              Detection/OCR-Hilfen in weiteren Modulen.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <code className="text-foreground">REDIS_URL</code> — Redis-Verbindung (Standard{" "}
                <code className="rounded bg-muted px-1">redis://127.0.0.1:6379/0</code>).
              </li>
              <li>
                <code className="text-foreground">RQ_QUEUE_NAME</code> — Queue-Name (Standard{" "}
                <code className="rounded bg-muted px-1">pdf_jobs</code>).
              </li>
              <li>
                <code className="text-foreground">JOBS_DIR</code> — Verzeichnis für Job-Artefakte.
              </li>
              <li>
                <code className="text-foreground">JOB_MAX_AGE_HOURS</code>,{" "}
                <code className="text-foreground">JOB_CLEANUP_INTERVAL_SEC</code> — automatische
                Bereinigung alter Job-Ordner.
              </li>
              <li>
                <code className="text-foreground">OCR_ENABLED</code>,{" "}
                <code className="text-foreground">OCR_DPI</code>,{" "}
                <code className="text-foreground">OCR_LANGUAGE</code>,{" "}
                <code className="text-foreground">OCR_MAX_PAGES</code> — Tesseract/PyMuPDF-OCR.
              </li>
              <li>
                Weitere Schwellen: <code className="text-foreground">PRESIDIO_SCORE_THRESHOLD</code>,{" "}
                <code className="text-foreground">PII_CHUNK_CHARS</code>, usw. (siehe Code).
              </li>
            </ul>
          </section>
      </main>
    </div>
  )
}

function Endpoint({
  id,
  method,
  path,
  title,
  description,
  children,
}: {
  id: string
  method: string
  path: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-border pb-10 last:border-0"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
          {method}
        </span>
        <code className="font-mono text-sm font-medium">{path}</code>
      </div>
      <h2 className="mt-2 text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </section>
  )
}

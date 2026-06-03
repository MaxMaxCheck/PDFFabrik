import { LegalPageCard, LegalSection } from "@/components/legal/legal-page-card"

export const metadata = {
  title: "Widerrufserklärung",
  description: "Informationen zum Widerrufsrecht — PDFFabrik.de",
}

export default function WiderrufPage() {
  return (
    <LegalPageCard
      title="Widerrufserklärung"
      description="Informationen zum Widerrufsrecht"
    >
      <LegalSection title="Widerrufsrecht bei digitalen Dienstleistungen">
        <p>
          Bei der Nutzung von MaxCheck handelt es sich um eine digitale Dienstleistung, bei der die
          Analyse von Kfz-Schadengutachten mittels künstlicher Intelligenz durchgeführt wird.
        </p>
        <p>
          <strong>
            Gemäß § 356 Abs. 5 BGB besteht kein Widerrufsrecht bei Dienstleistungen in Bezug auf
            nicht auf einem körperlichen Datenträger befindliche digitale Inhalte, wenn der
            Unternehmer mit der Ausführung der Dienstleistung mit ausdrücklicher Zustimmung des
            Verbrauchers begonnen hat und der Verbraucher bestätigt hat, dass er mit der Ausführung
            vor Ablauf der Widerrufsfrist einverstanden ist.
          </strong>
        </p>
        <p>
          Da die KI-Analyse unmittelbar nach dem Hochladen des PDFs durchgeführt wird und die
          Ergebnisse sofort zur Verfügung gestellt werden, ist die Dienstleistung vollständig
          erbracht, bevor ein Widerruf möglich wäre. Durch die Nutzung des Dienstes bestätigen Sie,
          dass Sie mit der sofortigen Ausführung der Dienstleistung einverstanden sind.
        </p>
      </LegalSection>

      <LegalSection title="Verarbeitung von Daten durch KI">
        <p>
          MaxCheck nutzt künstliche Intelligenz zur Analyse der hochgeladenen Gutachten. Die
          Verarbeitung erfolgt automatisiert und die Ergebnisse werden unmittelbar nach der Analyse
          generiert. Durch die Nutzung des Dienstes stimmen Sie der Verarbeitung Ihrer Daten durch
          KI-Systeme zu.
        </p>
        <p>
          Ein Widerruf nach Erhalt der Analyseergebnisse ist nicht möglich, da die Dienstleistung
          bereits vollständig erbracht wurde. Die Analyseergebnisse sind digitale Inhalte, die
          unmittelbar nach der Verarbeitung zur Verfügung stehen.
        </p>
      </LegalSection>

      <LegalSection title="Kontakt bei Fragen">
        <p>
          Bei Fragen zum Widerrufsrecht oder zur Nutzung unseres Dienstes können Sie uns jederzeit
          kontaktieren:
        </p>
        <p>
          <strong>MaxCheck</strong>
          <br />
          Inh. Max Messmann
          <br />
          Hubertusstr. 38
          <br />
          32429 Minden
          <br />
          E-Mail:{" "}
          <a href="mailto:info@maxcheck.de" className="text-primary hover:underline">
            info@maxcheck.de
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Rechtliche Grundlage">
        <p>
          Diese Regelung entspricht den Bestimmungen des Bürgerlichen Gesetzbuches (BGB) und der
          Verbraucherrechterichtlinie der Europäischen Union. Bei digitalen Dienstleistungen, die
          sofort nach Bestätigung des Verbrauchers ausgeführt werden, besteht kein Widerrufsrecht,
          um den Schutz des Unternehmers vor missbräuchlicher Nutzung zu gewährleisten.
        </p>
      </LegalSection>
    </LegalPageCard>
  )
}

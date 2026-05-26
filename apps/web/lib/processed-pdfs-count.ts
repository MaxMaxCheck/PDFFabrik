import { prisma } from "@workspace/prisma"

/**
 * Zähler für Marketing: abgeschlossene Anonymisierungen (Voll-PDF + Nur-Text),
 * aus Nutzungsstatistik aggregiert.
 */
export async function getProcessedPdfsCount(): Promise<number> {
  const r = await prisma.userPdfToolStat.aggregate({
    where: {
      tool: { in: ["anonymize_full", "anonymize_text"] },
    },
    _sum: { count: true },
  })
  return r._sum.count ?? 0
}

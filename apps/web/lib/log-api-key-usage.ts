import { prisma } from "@workspace/prisma"

export type ApiIntegrationEndpoint = "pdf-redact-json" | "pdf-detect"

export function logApiKeyUsage(
  apiKeyId: string,
  userId: string,
  endpoint: ApiIntegrationEndpoint,
): void {
  void prisma.apiKeyUsageEvent
    .create({
      data: { apiKeyId, userId, endpoint },
    })
    .catch((e) => {
      console.error("[logApiKeyUsage]", e)
    })
}

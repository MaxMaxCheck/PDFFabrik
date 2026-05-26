import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

/** Pepper ausschließlich serverseitig; min. 16 Zeichen empfohlen. */
export function getApiTokenPepper(): string {
  const p =
    process.env.PDFFABRIK_API_TOKEN_PEPPER?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim()
  if (!p || p.length < 16) {
    throw new Error(
      "PDFFABRIK_API_TOKEN_PEPPER (oder BETTER_AUTH_SECRET) muss für API-Schlüssel gesetzt sein.",
    )
  }
  return p
}

export function hashApiToken(fullToken: string): string {
  const pepper = getApiTokenPepper()
  return createHash("sha256").update(pepper).update("\0").update(fullToken).digest("hex")
}

export function verifyApiToken(fullToken: string, storedHex: string): boolean {
  let a: Buffer
  let b: Buffer
  try {
    a = Buffer.from(hashApiToken(fullToken), "hex")
    b = Buffer.from(storedHex, "hex")
  } catch {
    return false
  }
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function newApiKeySecret(): string {
  return randomBytes(24).toString("base64url")
}

export function formatApiKey(id: string, secret: string): string {
  return `pdffabrik_sk_${id}.${secret}`
}

/** Erwartet `Bearer pdffabrik_sk_….…` */
export function parseBearerApiKey(authorization: string | null): string | null {
  if (!authorization) return null
  const m = /^Bearer\s+(\S+)$/i.exec(authorization.trim())
  return m?.[1] ?? null
}

/** `pdffabrik_sk_<id>.<secret>` */
export function parseApiKeyParts(full: string): { id: string; secret: string } | null {
  const raw = full.trim()
  if (!raw.startsWith("pdffabrik_sk_")) return null
  const rest = raw.slice("pdffabrik_sk_".length)
  const dot = rest.indexOf(".")
  if (dot <= 0 || dot === rest.length - 1) return null
  const id = rest.slice(0, dot)
  const secret = rest.slice(dot + 1)
  if (!id || !secret) return null
  return { id, secret }
}

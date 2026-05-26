const KEY = "pdffabrik.cookie_consent_v1"

export type CookieConsentV1 = {
  v: 1
  /** Immer wahr – technisch notwendig */
  necessary: true
  analytics: boolean
  marketing: boolean
  updatedAt: string
}

export function readCookieConsent(): CookieConsentV1 | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== "object") return null
    const o = p as Record<string, unknown>
    if (o.v !== 1) return null
    if (o.necessary !== true) return null
    if (typeof o.analytics !== "boolean" || typeof o.marketing !== "boolean") {
      return null
    }
    if (typeof o.updatedAt !== "string") return null
    return o as CookieConsentV1
  } catch {
    return null
  }
}

export function writeCookieConsent(
  analytics: boolean,
  marketing: boolean
): void {
  const v: CookieConsentV1 = {
    v: 1,
    necessary: true,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* Quota, private mode */
  }
}

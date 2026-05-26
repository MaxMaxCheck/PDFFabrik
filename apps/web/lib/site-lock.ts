export const SITE_LOCK_COOKIE_NAME = "pdffabrik_site_unlock"

const SITE_LOCK_COOKIE_VALUE = "granted-2026"
const SITE_LOCK_PASSWORD = "EsWirdEndlichZeitFürEinenGemeinsamenTornado2026!"

export function hasSiteUnlock(value: string | undefined | null): boolean {
  return value === SITE_LOCK_COOKIE_VALUE
}

export function isSiteUnlockPassword(value: string): boolean {
  return value === SITE_LOCK_PASSWORD
}

export function normalizeSiteLockNext(value: string | null | undefined): string {
  if (!value) return "/"
  if (!value.startsWith("/")) return "/"
  if (value.startsWith("//")) return "/"
  if (value === "/locked" || value.startsWith("/locked?")) return "/"
  return value
}

export function siteUnlockCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  }
}

export function siteUnlockCookieValue(): string {
  return SITE_LOCK_COOKIE_VALUE
}

/**
 * Einstellungen & Onboarding-Status (z. B. „erstes PDF in der App hochgeladen“).
 * localStorage: JSON, Cookie: spiegelt wichtige Flags für SSR/Layout.
 */
export const FIRST_UPLOAD_COOKIE = "pdffabrik_first_upload"
/** Client-Event: App-Chrome soll umschalten, ohne `router.refresh()` (behält Upload-State). */
export const FIRST_UPLOAD_CHROME_EVENT = "pdffabrik:first-upload"
export const SITE_PREFS_KEY = "pdffabrik.site.v1"
export const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400

export type SitePrefsV1 = {
  first_pdf_upload?: boolean
} & Record<string, unknown>

export function readSitePrefsFromStorage(): SitePrefsV1 {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(SITE_PREFS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SitePrefsV1
  } catch {
    return {}
  }
}

function writePrefs(prefs: SitePrefsV1) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(SITE_PREFS_KEY, JSON.stringify(prefs))
  const v = prefs.first_pdf_upload ? "1" : "0"
  document.cookie = `${FIRST_UPLOAD_COOKIE}=${v}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`
}

export function patchSitePrefs(partial: Partial<SitePrefsV1>) {
  const next = { ...readSitePrefsFromStorage(), ...partial } as SitePrefsV1
  writePrefs(next)
  return next
}

/** Erstes sinnvolles PDF in der Anonymisierungs-App (nach erfolgreichem API-Read). */
export function markFirstPdfUpload() {
  patchSitePrefs({ first_pdf_upload: true })
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FIRST_UPLOAD_CHROME_EVENT))
  }
}

export function hasFirstPdfUploadFromStorage(): boolean {
  return readSitePrefsFromStorage().first_pdf_upload === true
}

/** Cookie lesen (nur client), z. B. Abgleich nach Navigation. */
export function readFirstUploadCookieClient(): boolean {
  if (typeof document === "undefined") return false
  return new RegExp(`(?:^|; )${FIRST_UPLOAD_COOKIE}=1(?:;|$)`).test(document.cookie)
}

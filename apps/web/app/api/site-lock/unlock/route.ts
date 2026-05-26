import {
  isSiteUnlockPassword,
  normalizeSiteLockNext,
  SITE_LOCK_COOKIE_NAME,
  siteUnlockCookieOptions,
  siteUnlockCookieValue,
} from "@/lib/site-lock"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const form = await request.formData()
  const password = String(form.get("password") ?? "")
  const next = normalizeSiteLockNext(String(form.get("next") ?? "/"))

  if (!isSiteUnlockPassword(password)) {
    const url = new URL("/locked", request.url)
    url.searchParams.set("error", "1")
    if (next !== "/") {
      url.searchParams.set("next", next)
    }
    return NextResponse.redirect(url)
  }

  const url = new URL(next, request.url)
  const response = NextResponse.redirect(url)
  response.cookies.set(
    SITE_LOCK_COOKIE_NAME,
    siteUnlockCookieValue(),
    siteUnlockCookieOptions()
  )
  return response
}

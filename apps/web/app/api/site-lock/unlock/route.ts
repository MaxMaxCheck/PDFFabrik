import {
  isSiteUnlockPassword,
  normalizeSiteLockNext,
  SITE_LOCK_COOKIE_NAME,
  siteUnlockCookieOptions,
  siteUnlockCookieValue,
} from "@/lib/site-lock"
import { NextResponse } from "next/server"

function requestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim()
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim()
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  const host = request.headers.get("host")?.trim()
  if (host) {
    const proto = forwardedProto || "https"
    return `${proto}://${host}`
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    request.url
  )
}

export async function POST(request: Request) {
  const form = await request.formData()
  const password = String(form.get("password") ?? "")
  const next = normalizeSiteLockNext(String(form.get("next") ?? "/"))
  const origin = requestOrigin(request)

  if (!isSiteUnlockPassword(password)) {
    const url = new URL("/locked", origin)
    url.searchParams.set("error", "1")
    if (next !== "/") {
      url.searchParams.set("next", next)
    }
    return NextResponse.redirect(url)
  }

  const url = new URL(next, origin)
  const response = NextResponse.redirect(url)
  response.cookies.set(
    SITE_LOCK_COOKIE_NAME,
    siteUnlockCookieValue(),
    siteUnlockCookieOptions()
  )
  return response
}

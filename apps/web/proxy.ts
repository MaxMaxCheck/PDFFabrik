import { getSessionCookie } from "better-auth/cookies"
import { hasSiteUnlock, normalizeSiteLockNext, SITE_LOCK_COOKIE_NAME } from "@/lib/site-lock"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const needsLogin = (pathname: string) =>
  pathname === "/pdf-redact" ||
  pathname.startsWith("/pdf-redact/") ||
  pathname === "/pdf-redact-json" ||
  pathname.startsWith("/pdf-redact-json/") ||
  pathname === "/dashboard" ||
  pathname.startsWith("/dashboard/")

/**
 * Next.js: früher `middleware.ts` — jetzt `proxy.ts` (Edge-Layer vor der App).
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  if (pathname === "/locked") {
    if (hasSiteUnlock(request.cookies.get(SITE_LOCK_COOKIE_NAME)?.value)) {
      const url = request.nextUrl.clone()
      url.pathname = normalizeSiteLockNext(request.nextUrl.searchParams.get("next"))
      url.search = ""
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (!hasSiteUnlock(request.cookies.get(SITE_LOCK_COOKIE_NAME)?.value)) {
    const url = request.nextUrl.clone()
    url.pathname = "/locked"
    url.search = ""
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  if (!needsLogin(pathname)) {
    return NextResponse.next()
  }

  if (getSessionCookie(request)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)",
  ],
}

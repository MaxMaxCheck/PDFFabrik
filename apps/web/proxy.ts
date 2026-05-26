import { getSessionCookie } from "better-auth/cookies"
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
    "/pdf-redact",
    "/pdf-redact/:path*",
    "/pdf-redact-json",
    "/pdf-redact-json/:path*",
    "/dashboard",
    "/dashboard/:path*",
  ],
}

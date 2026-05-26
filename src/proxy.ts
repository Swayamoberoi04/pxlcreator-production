/**
 * src/proxy.ts
 *
 * Next.js Proxy (formerly "middleware") — runs before every matched request.
 *
 * Responsibilities:
 *  1. Protect all /admin/* page routes (except /admin/login)
 *     — checks the pxl_admin_session HMAC cookie
 *  2. Protect all /api/admin/* API routes
 *     — same HMAC cookie check; returns 401 JSON instead of redirect
 *  3. Redirect unauthenticated admin page requests to /admin/login
 *
 * Defence-in-depth note:
 *   Each /api/admin/* route handler also calls requireAdmin() from
 *   src/lib/admin/guard.ts. This proxy is a first-line filter
 *   that short-circuits the request before it even reaches the handler,
 *   but the per-handler guard ensures protection even if this
 *   proxy is ever misconfigured or the matcher is changed.
 */

import { type NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth"

export const config = {
  matcher: [
    // Admin page routes
    "/admin/:path*",
    // Admin API routes — catches /api/admin and all sub-paths
    "/api/admin/:path*",
  ],
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const isApiRoute   = pathname.startsWith("/api/admin")

  /* ── Always allow the login page ── */
  if (pathname === "/admin/login") {
    return NextResponse.next()
  }

  /* ── Check session cookie ── */
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)
  const token         = sessionCookie?.value ?? ""
  const isValid       = token ? await verifySessionToken(token) : false

  if (!isValid) {
    if (isApiRoute) {
      /* API callers expect JSON — never redirect them to a login page */
      return NextResponse.json(
        { error: "Unauthorized. Admin session required." },
        { status: 401 }
      )
    }

    /* Page routes — redirect to login, clearing any stale cookie */
    const response = NextResponse.redirect(new URL("/admin/login", request.url))
    if (token) response.cookies.delete(ADMIN_COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

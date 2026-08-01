/**
 * src/proxy.ts
 *
 * Next.js Proxy (formerly "middleware") — the first gate for the admin
 * surface. Runs before any admin page or API handler.
 *
 * Responsibilities:
 *  1. /admin/*      → require a valid admin session, else redirect to
 *                     /admin/login (login page itself is exempt).
 *  2. /api/admin/*  → require a valid admin session, else 401 JSON
 *                     (the /api/admin/auth login/logout endpoint is exempt).
 *  3. CSRF          → reject cross-origin unsafe methods on any admin API,
 *                     centrally (covers every admin API without per-route code).
 *  4. Publish `x-pathname` / `x-http-method` so the admin layout can do a
 *     second server-side check (incl. revocation) without a redirect loop.
 *  5. Stamp hardened no-cache / DENY-frame / noindex headers on the admin
 *     surface.
 *
 * This is the STATELESS layer (signature + expiry + email allowlist) so it
 * stays Edge-safe — it imports only auth.ts / config.ts / csrf.ts (no Node
 * built-ins, no Supabase). DB-backed session REVOCATION is enforced in the
 * Node-runtime guard (guard.ts) and the admin layout.
 *
 * Defence in depth: every /api/admin/* handler also calls requireAdmin().
 */

import { type NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth"
import { sameOrigin } from "@/lib/api/csrf"

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
}

const LOGIN_PAGE = "/admin/login"
const AUTH_API   = "/api/admin/auth"

function harden(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private")
  res.headers.set("Pragma", "no-cache")
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return res
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const isApiRoute   = pathname.startsWith("/api/admin")

  // Expose path + method to server components (layout re-check, guard audit).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)
  requestHeaders.set("x-http-method", request.method)
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } })

  // ── CSRF: unsafe methods on any admin API must be same-origin ──
  if (isApiRoute && !sameOrigin(request)) {
    return harden(
      NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 }),
    )
  }

  // ── Exemptions: the login page and the session-creating auth endpoint ──
  if (pathname === LOGIN_PAGE || pathname === AUTH_API) {
    return harden(pass())
  }

  // ── Verify the session (stateless layer) ──
  const token  = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const claims = token ? await verifySessionToken(token) : null

  if (!claims) {
    if (isApiRoute) {
      return harden(
        NextResponse.json(
          { error: "Unauthorized. Admin session required." },
          { status: 401 },
        ),
      )
    }
    // Page route — redirect to login, clearing any stale cookie.
    const response = NextResponse.redirect(new URL(LOGIN_PAGE, request.url))
    if (token) response.cookies.delete(ADMIN_COOKIE_NAME)
    return harden(response)
  }

  return harden(pass())
}

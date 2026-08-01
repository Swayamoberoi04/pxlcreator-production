/**
 * src/lib/admin/guard.ts
 *
 * The self-guard every /api/admin/* route calls. Defense in depth on top
 * of edge middleware — handlers reject direct calls (curl/Postman)
 * regardless of whether middleware ran.
 *
 * Layers enforced here (Node runtime):
 *   • Auth   — valid v2 session cookie (signature + expiry + email allowlist).
 *   • Revoke — the session jti is not revoked/expired in the server store.
 *
 * CSRF (same-origin for unsafe methods) is enforced centrally in
 * src/middleware.ts, so it covers every admin API in one place.
 *
 * Usage (unchanged call shape):
 *   const deny = await requireAdmin()
 *   if (deny) return deny
 *
 * When a handler needs the acting admin's email (e.g. for an audit entry):
 *   const session = await getAdminSession()
 */

import { cookies, headers } from "next/headers"
import { NextResponse }     from "next/server"
import { ADMIN_COOKIE_NAME, verifySessionToken, type SessionClaims } from "@/lib/admin/auth"
import { isSessionActive, audit } from "@/lib/admin/audit"

/** Decode + fully validate the current admin session (or null). */
export async function getAdminSession(): Promise<SessionClaims | null> {
  const cookieStore = await cookies()
  const token       = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  const claims      = await verifySessionToken(token)
  if (!claims) return null
  if (!(await isSessionActive(claims.jti))) return null
  return claims
}

/**
 * Guard an admin route.
 * @returns null when authorised, or a 401 NextResponse to return as-is.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getAdminSession()

  if (!session) {
    // Best-effort audit of the denied attempt (headers give path/ip/ua).
    try {
      const h = await headers()
      await audit({
        event:     "admin.auth_fail",
        outcome:   "denied",
        method:    h.get("x-http-method") ?? undefined,
        path:      h.get("x-pathname") ?? undefined,
        ip:        h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent"),
      })
    } catch { /* headers() unavailable — ignore */ }

    const res = NextResponse.json(
      { error: "Unauthorized. Valid admin session required." },
      { status: 401 },
    )
    res.headers.set("Cache-Control", "no-store")
    return res
  }

  return null
}

/**
 * src/lib/api/csrf.ts
 *
 * Origin-based CSRF defense for state-changing requests.
 *
 * The admin session cookie is SameSite=Strict, which already blocks the
 * classic cross-site CSRF vector. This adds a second, explicit layer:
 * every mutating admin request (POST/PUT/PATCH/DELETE) must carry an
 * Origin (or Referer) header whose origin matches the request's own host.
 * Browsers set Origin on all cross-origin and same-origin unsafe requests,
 * so a forged cross-site form/fetch is rejected here even if a cookie leaks.
 */

import type { NextRequest } from "next/server"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * @returns true when the request passes the same-origin check (or is a safe
 *          method that needs no check); false when it should be rejected.
 */
export function sameOrigin(req: NextRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return true

  // Trust the platform-forwarded host first (set by the proxy/CDN), then Host.
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    ""
  if (!host) return false

  const origin = req.headers.get("origin")
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }

  // Fall back to Referer when Origin is absent.
  const referer = req.headers.get("referer")
  if (referer) {
    try {
      return new URL(referer).host === host
    } catch {
      return false
    }
  }

  // No Origin and no Referer on an unsafe method → reject.
  return false
}

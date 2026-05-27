/**
 * src/middleware.ts
 *
 * Next.js Edge Middleware — runs before every matched request.
 *
 * Responsibility:
 *   - Protect all /admin/* routes behind an HMAC-signed session cookie.
 *   - If the cookie is missing or invalid → redirect to /admin/login.
 *   - /admin/login itself is always allowed through (prevents redirect loop).
 *   - /api/admin/auth is always allowed through (the login endpoint itself).
 *
 * Cookie: pxl_admin_session = {timestamp}.{hmac_sha256}
 * Verified via: ADMIN_SECRET_KEY env var (same key used in lib/admin/auth.ts)
 *
 * NOTE: This runs in the Edge Runtime so only Web Crypto APIs are available
 * (no Node.js built-ins like crypto module). verifySessionToken in
 * lib/admin/auth.ts already uses Web Crypto — safe to call here.
 */

import { NextRequest, NextResponse } from "next/server"

const ADMIN_COOKIE_NAME = "pxl_admin_session"
const TOKEN_TTL_MS      = 24 * 60 * 60 * 1000  // 24 hours (must match lib/admin/auth.ts)

/* ── HMAC verification (Web Crypto — works in Edge Runtime) ── */

async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false

  const parts = token.split(".")
  if (parts.length !== 2) return false

  const [timestamp, hmacHex] = parts
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false

  // Check expiry
  if (Date.now() - ts > TOKEN_TTL_MS) return false

  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false

  try {
    const encoder = new TextEncoder()
    const keyMat  = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    const expectedBytes = Buffer.from(hmacHex, "hex")
    return await crypto.subtle.verify(
      "HMAC",
      keyMat,
      expectedBytes,
      encoder.encode(timestamp)
    )
  } catch {
    return false
  }
}

/* ── Middleware handler ── */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow the login page and the auth API through (prevent redirect loops)
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/auth")
  ) {
    return NextResponse.next()
  }

  // All other /admin/* routes require a valid session cookie
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? ""

  const isValid = await verifyToken(sessionCookie)

  if (!isValid) {
    // Redirect to login, preserving the intended destination in `next` param
    const loginUrl = new URL("/admin/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

/* ── Route matcher ── */
export const config = {
  matcher: [
    // Match all /admin routes (including the root /admin)
    "/admin",
    "/admin/:path*",
    // Also protect admin API routes from direct access without the cookie
    // (API routes have their own auth checks too, but defence-in-depth)
    "/api/admin/:path*",
  ],
}

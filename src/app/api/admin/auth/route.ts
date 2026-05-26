/**
 * POST /api/admin/auth
 *
 * Admin login endpoint.
 * Validates the password and sets the session cookie.
 *
 * Body: { password: string }
 */

import type { NextRequest }  from "next/server"
import {
  checkAdminPassword,
  createSessionToken,
  getSessionCookieOptions,
  ADMIN_COOKIE_NAME,
} from "@/lib/admin/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { log }                           from "@/lib/api/logger"

// Strict rate limit: 10 login attempts per 15 minutes per IP
// to slow brute-force attacks on the admin password.
const loginLimiter = makeRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 })

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)

  /* ── Rate limit login attempts ── */
  if (loginLimiter.check(ip)) {
    log.security("admin-auth", "login rate limit exceeded", { ip })
    return Response.json(
      { success: false, error: "Too many login attempts. Please wait 15 minutes." },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { password } = body ?? {}

    if (!password || typeof password !== "string") {
      return Response.json(
        { success: false, error: "Password is required." },
        { status: 400 }
      )
    }

    if (!checkAdminPassword(password)) {
      // Intentional 1-second delay to slow brute-force attempts
      await new Promise((r) => setTimeout(r, 1000))
      log.security("admin-auth", "failed login attempt", { ip })
      return Response.json(
        { success: false, error: "Incorrect password." },
        { status: 401 }
      )
    }

    log.info("admin-auth", "successful admin login", { ip })

    // Generate signed session token
    const token = await createSessionToken()

    const response = Response.json({ success: true })
    const cookieOpts = getSessionCookieOptions()

    // Set the session cookie
    response.headers.set(
      "Set-Cookie",
      `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; Path=${cookieOpts.path}; Max-Age=${cookieOpts.maxAge}; SameSite=${cookieOpts.sameSite}${cookieOpts.secure ? "; Secure" : ""}`
    )

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/auth
 * Log out — clears the session cookie.
 */
export async function DELETE(): Promise<Response> {
  const response = Response.json({ success: true })
  response.headers.set(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=lax`
  )
  return response
}

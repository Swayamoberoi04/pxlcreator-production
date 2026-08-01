/**
 * POST   /api/admin/auth   — admin login  (two-factor)
 * DELETE /api/admin/auth   — admin logout (revokes the server session)
 *
 * ── Login is TWO independent factors ─────────────────────────────────
 *   1. Firebase identity : a valid Firebase ID token whose email matches
 *      ADMIN_EMAIL and is email_verified. Proves *who* you are.
 *   2. Admin password    : the shared ADMIN_PASSWORD. A second secret.
 *
 * Both must pass. Knowing the password alone is not enough; being signed
 * into Firebase as a non-admin email is not enough. Nobody can become an
 * admin without being the configured email AND holding the password.
 *
 * On success we mint a signed, email-bound, revocable session (v2) and
 * record it server-side so logout can invalidate it immediately.
 */

import type { NextRequest } from "next/server"
import {
  checkAdminPassword,
  createSessionToken,
  buildSessionCookie,
  buildClearCookie,
  verifySessionToken,
  ADMIN_COOKIE_NAME,
  TOKEN_TTL_MS,
} from "@/lib/admin/auth"
import { isAdminEmail, isAdminConfigured, validateAdminEnv } from "@/lib/admin/config"
import { verifyFirebaseToken } from "@/lib/firebase/admin-server"
import { audit, recordSession, revokeSession } from "@/lib/admin/audit"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { sameOrigin } from "@/lib/api/csrf"

export const runtime = "nodejs"

// Brute-force throttle: 8 attempts / 15 min per IP, plus a global ceiling.
const ipLimiter     = makeRateLimiter({ max: 8,  windowMs: 15 * 60 * 1000 })
const globalLimiter = makeRateLimiter({ max: 40, windowMs: 15 * 60 * 1000 })

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  const ua = request.headers.get("user-agent")

  // ── CSRF: login is a state-changing POST → same-origin only ──
  if (!sameOrigin(request)) {
    await audit({ event: "admin.login", outcome: "denied", ip, userAgent: ua, meta: { reason: "cross-origin" } })
    return Response.json({ success: false, error: "Cross-origin request rejected." }, { status: 403 })
  }

  // ── Fail closed if the admin subsystem is not fully configured ──
  if (!isAdminConfigured()) {
    const report = validateAdminEnv()
    await audit({ event: "admin.login", outcome: "error", ip, userAgent: ua, meta: { reason: "misconfigured", missing: report.missing } })
    return Response.json(
      { success: false, error: "Admin login is not configured on this server." },
      { status: 503 },
    )
  }

  // ── Rate limit ──
  if (ipLimiter.check(ip) || globalLimiter.check("global")) {
    await audit({ event: "admin.login", outcome: "denied", ip, userAgent: ua, meta: { reason: "rate_limited" } })
    return Response.json(
      { success: false, error: "Too many login attempts. Please wait 15 minutes." },
      { status: 429 },
    )
  }

  let body: { idToken?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  const idToken  = typeof body.idToken === "string" ? body.idToken : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!idToken || !password) {
    return Response.json(
      { success: false, error: "Firebase sign-in and admin password are both required." },
      { status: 400 },
    )
  }

  // ── Factor 1: Firebase identity ──
  const fb = await verifyFirebaseToken(idToken)
  const identityOk = !!fb && isAdminEmail(fb.email) && fb.emailVerified === true

  // ── Factor 2: admin password (constant-time) ──
  const passwordOk = await checkAdminPassword(password)

  // Evaluate BOTH factors before responding — uniform failure, no oracle
  // telling an attacker which factor failed, and a fixed delay on failure.
  if (!identityOk || !passwordOk) {
    await new Promise((r) => setTimeout(r, 700))
    await audit({
      event: "admin.login",
      outcome: "denied",
      email: fb?.email ?? null,
      ip,
      userAgent: ua,
      meta: {
        identity_ok: identityOk,
        password_ok: passwordOk,
        email_verified: fb?.emailVerified ?? null,
      },
    })
    return Response.json({ success: false, error: "Invalid credentials." }, { status: 401 })
  }

  // ── Success: mint an email-bound, revocable session ──
  const email = fb!.email!.toLowerCase()
  const { token, claims } = await createSessionToken(email)

  await recordSession({
    jti: claims.jti,
    email,
    ip,
    userAgent: ua,
    expiresAt: new Date(claims.iat + TOKEN_TTL_MS),
  })

  await audit({ event: "admin.login", outcome: "success", email, ip, userAgent: ua })

  const response = Response.json({ success: true })
  response.headers.set("Set-Cookie", buildSessionCookie(token))
  response.headers.set("Cache-Control", "no-store")
  return response
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  const ua = request.headers.get("user-agent")

  // Revoke the server-side session so the token cannot be replayed.
  const token  = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const claims = await verifySessionToken(token)
  if (claims) {
    await revokeSession(claims.jti, "logout")
    await audit({ event: "admin.logout", outcome: "success", email: claims.email, ip, userAgent: ua })
  }

  const response = Response.json({ success: true })
  response.headers.set("Set-Cookie", buildClearCookie())
  response.headers.set("Cache-Control", "no-store")
  return response
}

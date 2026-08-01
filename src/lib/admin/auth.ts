/**
 * src/lib/admin/auth.ts
 *
 * Admin session tokens — HMAC-signed and bound to the admin's identity.
 *
 * Token format (v2):
 *     v2.{payloadHex}.{sigHex}
 *   payload = `${iat}|${jti}|${email}`   (pipe-delimited, email is ASCII)
 *   sig     = HMAC-SHA256(ADMIN_SECRET_KEY, payloadString)
 *
 * WHY v2:
 *   • Binds every session to a specific admin email (authorization travels
 *     inside the signed token — a valid token for a non-admin email is
 *     rejected even if the signature checks out).
 *   • Carries a unique `jti` so the server-side session store can REVOKE a
 *     session on logout and refuse replayed tokens.
 *   • No `Buffer` / Node built-ins → safe to run in Edge middleware.
 *
 * FAIL CLOSED: if ADMIN_SECRET_KEY is missing there is NO fallback secret.
 * Token creation throws and verification returns null.
 */

import { ADMIN_COOKIE_NAME, isAdminEmail, TOKEN_TTL_MS } from "@/lib/admin/config"

export { ADMIN_COOKIE_NAME, TOKEN_TTL_MS } from "@/lib/admin/config"

/* ── Edge-safe hex helpers ─────────────────────────────────── */

function bytesToHex(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0")
  return s
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) return new Uint8Array(0)
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

/** Constant-time equality for two equal-or-unequal-length byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // Compare into a fixed accumulator; length difference is folded in so a
  // length mismatch cannot short-circuit the comparison.
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

/* ── HMAC (Web Crypto — Edge + Node) ───────────────────────── */

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  return bytesToHex(new Uint8Array(sig))
}

function getSecret(): string | null {
  const secret = process.env.ADMIN_SECRET_KEY
  // Fail closed: no default. A missing/placeholder secret disables admin.
  if (!secret || secret === "default-secret-change-me" || secret.length < 32) return null
  return secret
}

/* ── Password check — constant time, no length leak ────────── */

/**
 * Verify the supplied admin password against ADMIN_PASSWORD.
 *
 * Both candidate and expected are HMAC'd under an ephemeral random key
 * (fixed 32-byte digests), so the comparison is constant-time AND does not
 * leak the password length via an early return.
 */
export async function checkAdminPassword(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  if (typeof password !== "string") return false

  const ephemeralKey = bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
  const a = await hmacHex(ephemeralKey, password)
  const b = await hmacHex(ephemeralKey, expected)
  return timingSafeEqual(hexToBytes(a), hexToBytes(b))
}

/* ── Session token ─────────────────────────────────────────── */

export interface SessionClaims {
  email: string
  jti: string
  iat: number
}

/**
 * Create a signed session token bound to `email` with a fresh `jti`.
 * @returns { token, claims } or throws if the secret is unavailable.
 */
export async function createSessionToken(email: string): Promise<{ token: string; claims: SessionClaims }> {
  const secret = getSecret()
  if (!secret) throw new Error("ADMIN_SECRET_KEY is not configured — admin sessions are disabled.")

  const claims: SessionClaims = {
    email: email.trim().toLowerCase(),
    jti: crypto.randomUUID(),
    iat: Date.now(),
  }
  const payload = `${claims.iat}|${claims.jti}|${claims.email}`
  const payloadHex = bytesToHex(new TextEncoder().encode(payload))
  const sig = await hmacHex(secret, payload)
  return { token: `v2.${payloadHex}.${sig}`, claims }
}

/**
 * Verify a session token: signature, expiry, and email authorization.
 *
 * This is the STATELESS layer (safe for Edge middleware). It does NOT check
 * the server-side revocation store — callers running in the Node runtime
 * should additionally consult the session store (see guard.ts).
 *
 * @returns the decoded claims when valid, otherwise null.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null
  const secret = getSecret()
  if (!secret) return null

  const parts = token.split(".")
  if (parts.length !== 3 || parts[0] !== "v2") return null

  const payloadStr = new TextDecoder().decode(hexToBytes(parts[1]))
  const fields = payloadStr.split("|")
  if (fields.length !== 3) return null

  const [iatStr, jti, email] = fields
  const iat = parseInt(iatStr, 10)
  if (!Number.isFinite(iat) || !jti || !email) return null

  // Expiry
  if (Date.now() - iat > TOKEN_TTL_MS) return null

  // Signature (constant-time via subtle.verify semantics)
  const expectedSig = await hmacHex(secret, payloadStr)
  if (!timingSafeEqual(hexToBytes(parts[2]), hexToBytes(expectedSig))) return null

  // Authorization: the email inside the signed token must be a configured admin.
  if (!isAdminEmail(email)) return null

  return { email, jti, iat }
}

/* ── Cookie options ────────────────────────────────────────── */

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: TOKEN_TTL_MS / 1000,
  }
}

/** Build the Set-Cookie header value for a session token. */
export function buildSessionCookie(token: string): string {
  const o = getSessionCookieOptions()
  return [
    `${ADMIN_COOKIE_NAME}=${token}`,
    "HttpOnly",
    `Path=${o.path}`,
    `Max-Age=${o.maxAge}`,
    `SameSite=Strict`,
    o.secure ? "Secure" : "",
  ].filter(Boolean).join("; ")
}

/** Build the Set-Cookie header value that clears the session cookie. */
export function buildClearCookie(): string {
  const o = getSessionCookieOptions()
  return [
    `${ADMIN_COOKIE_NAME}=`,
    "HttpOnly",
    `Path=${o.path}`,
    "Max-Age=0",
    "SameSite=Strict",
    o.secure ? "Secure" : "",
  ].filter(Boolean).join("; ")
}

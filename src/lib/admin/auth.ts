/**
 * src/lib/admin/auth.ts
 *
 * Admin session management using HMAC-signed cookies.
 *
 * Token format:  {timestamp}.{hmac_hex}
 * HMAC input:    SHA-256(ADMIN_SECRET_KEY + ":" + timestamp)
 * Cookie name:   pxl_admin_session
 * Token TTL:     24 hours
 *
 * The ADMIN_PASSWORD and ADMIN_SECRET_KEY env vars are set in .env.local.
 * They never leave the server — no exposure to the browser.
 */

export const ADMIN_COOKIE_NAME = "pxl_admin_session"
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours

/* ── HMAC helpers using Web Crypto API ─────────────────── */

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder   = new TextEncoder()
  const keyMat    = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", keyMat, encoder.encode(data))
  return Buffer.from(sig).toString("hex")
}

async function hmacVerify(secret: string, data: string, expectedHex: string): Promise<boolean> {
  const encoder   = new TextEncoder()
  const keyMat    = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  )
  try {
    const expectedBytes = Buffer.from(expectedHex, "hex")
    return await crypto.subtle.verify(
      "HMAC",
      keyMat,
      expectedBytes,
      encoder.encode(data)
    )
  } catch {
    return false
  }
}

/* ── Public API ─────────────────────────────────────────── */

/**
 * Verify the admin password against ADMIN_PASSWORD env var.
 */
export function checkAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  // Constant-time comparison to prevent timing attacks
  if (password.length !== adminPassword.length) return false
  let same = true
  for (let i = 0; i < password.length; i++) {
    if (password[i] !== adminPassword[i]) same = false
  }
  return same
}

/**
 * Generate a signed session token.
 */
export async function createSessionToken(): Promise<string> {
  const secret    = process.env.ADMIN_SECRET_KEY ?? "default-secret-change-me"
  const timestamp = String(Date.now())
  const hmac      = await hmacSign(secret, timestamp)
  return `${timestamp}.${hmac}`
}

/**
 * Verify a session token.
 * Returns true if the token is valid and not expired.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token) return false

  const parts = token.split(".")
  if (parts.length !== 2) return false

  const [timestamp, hmac] = parts
  const ts = parseInt(timestamp, 10)

  if (isNaN(ts)) return false

  // Check expiry
  if (Date.now() - ts > TOKEN_TTL_MS) return false

  const secret = process.env.ADMIN_SECRET_KEY ?? "default-secret-change-me"
  return hmacVerify(secret, timestamp, hmac)
}

/**
 * Cookie options for the session cookie.
 */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
    maxAge:   TOKEN_TTL_MS / 1000,  // seconds
  }
}

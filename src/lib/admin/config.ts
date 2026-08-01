/**
 * src/lib/admin/config.ts
 *
 * Single source of truth for admin identity + admin env validation.
 *
 * ── Who is an admin? ──────────────────────────────────────────────────
 * Admin access is granted ONLY to the email(s) configured in ADMIN_EMAIL.
 * Nobody can become an admin without a config/code change — there is no
 * "grant admin" path anywhere in the product surface.
 *
 * ADMIN_EMAIL may contain a single email or a comma-separated list
 * (kept as a list so a backup owner address can be added deliberately,
 * still only via env config).
 *
 * This module is Edge-runtime safe (no Node built-ins) so it can be
 * imported from middleware as well as Node route handlers.
 */

/** Lower-cased, trimmed set of allowed admin emails from ADMIN_EMAIL. */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** True when `email` is a configured admin (case-insensitive). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = getAdminEmails()
  if (list.length === 0) return false
  return list.includes(email.trim().toLowerCase())
}

/** Admin session cookie name. */
export const ADMIN_COOKIE_NAME = "pxl_admin_session"

/** Session lifetime. Kept short — admin is high-value. */
export const TOKEN_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

/**
 * Required env vars for the admin subsystem. Missing any of these means
 * admin login MUST fail closed (never fall back to an insecure default).
 */
export const REQUIRED_ADMIN_ENV = [
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const

export interface AdminEnvReport {
  ok: boolean
  missing: string[]
  weak: string[]
}

/**
 * Validate admin env configuration. Returns a structured report rather
 * than throwing, so callers can log/deny gracefully.
 *
 *  • missing — a required var is absent/empty
 *  • weak    — present but below the minimum security bar
 */
export function validateAdminEnv(): AdminEnvReport {
  const missing: string[] = []
  const weak: string[] = []

  for (const key of REQUIRED_ADMIN_ENV) {
    const v = process.env[key]
    if (!v || v.trim() === "") missing.push(key)
  }

  const secret = process.env.ADMIN_SECRET_KEY ?? ""
  if (secret && secret.length < 32) weak.push("ADMIN_SECRET_KEY (should be >= 32 chars)")
  if (secret === "default-secret-change-me") weak.push("ADMIN_SECRET_KEY (default placeholder value)")

  const pw = process.env.ADMIN_PASSWORD ?? ""
  if (pw && pw.length < 12) weak.push("ADMIN_PASSWORD (should be >= 12 chars)")

  if (getAdminEmails().length === 0) missing.push("ADMIN_EMAIL")

  return { ok: missing.length === 0 && weak.length === 0, missing, weak }
}

/** True only when the admin subsystem is fully configured (no missing vars). */
export function isAdminConfigured(): boolean {
  return validateAdminEnv().missing.length === 0
}

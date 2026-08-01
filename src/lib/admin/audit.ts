/**
 * src/lib/admin/audit.ts
 *
 * Durable admin audit log + server-side session store.
 *
 * Writes to the `admin_audit_log` / `admin_sessions` tables via the
 * service-role key (migration 023). Every write is BEST-EFFORT: if the
 * tables do not exist yet (migration not applied) or the DB is briefly
 * unavailable, we log a warning to stdout and continue — admin access is
 * never blocked by an audit-write failure, and the failure is still
 * captured in the structured stdout log.
 *
 * Node runtime only (imports the service-role client). Never import from
 * Edge middleware or client components.
 */

import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { log } from "@/lib/api/logger"

let _client: SupabaseClient | null = null

/** Untyped service-role client for the internal admin security tables. */
function svc(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  if (!_client) {
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _client
}

/* ── Audit log ─────────────────────────────────────────────── */

export interface AuditEntry {
  event: string
  outcome?: "success" | "denied" | "error"
  email?: string | null
  ip?: string | null
  userAgent?: string | null
  method?: string | null
  path?: string | null
  targetId?: string | null
  meta?: Record<string, unknown>
}

/**
 * Record an admin audit event. Awaitable but safe to fire-and-forget.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  // Always emit to the structured stdout log (picked up by the platform
  // log drain even if the DB write fails).
  log.security("admin-audit", entry.event, {
    outcome: entry.outcome ?? "success",
    email: entry.email ?? undefined,
    ip: entry.ip ?? undefined,
    path: entry.path ?? undefined,
    method: entry.method ?? undefined,
    target_id: entry.targetId ?? undefined,
    ...entry.meta,
  })

  const client = svc()
  if (!client) return
  try {
    await client.from("admin_audit_log").insert({
      event: entry.event,
      outcome: entry.outcome ?? "success",
      email: entry.email ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
      method: entry.method ?? null,
      path: entry.path ?? null,
      target_id: entry.targetId ?? null,
      meta: entry.meta ?? {},
    })
  } catch (e) {
    log.warn("admin-audit", "audit DB write failed (continuing)", {
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

/* ── Session store ─────────────────────────────────────────── */

export interface NewSession {
  jti: string
  email: string
  ip?: string | null
  userAgent?: string | null
  expiresAt: Date
}

/** Persist a new admin session (enables later revocation). Best-effort. */
export async function recordSession(s: NewSession): Promise<void> {
  const client = svc()
  if (!client) return
  try {
    await client.from("admin_sessions").insert({
      jti: s.jti,
      email: s.email,
      ip: s.ip ?? null,
      user_agent: s.userAgent ?? null,
      expires_at: s.expiresAt.toISOString(),
    })
  } catch (e) {
    log.warn("admin-session", "session record failed (continuing)", {
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

/**
 * Is this session (by jti) still active?
 *
 * Returns:
 *   • false  → row exists AND is revoked/expired  → REJECT (hard).
 *   • true   → row exists and is active, OR the store is unavailable
 *              (table missing / DB error). Availability failures fall
 *              back to the stateless HMAC guarantee already enforced by
 *              the caller, so we never lock the owner out pre-migration.
 */
export async function isSessionActive(jti: string): Promise<boolean> {
  const client = svc()
  if (!client) return true // store not configured → rely on stateless layer
  try {
    const { data, error } = await client
      .from("admin_sessions")
      .select("jti, revoked_at, expires_at")
      .eq("jti", jti)
      .maybeSingle()

    if (error) return true // e.g. table missing → don't hard-fail the owner
    if (!data) return true // no row (pre-migration login) → allow stateless
    if (data.revoked_at) return false
    if (new Date(data.expires_at).getTime() < Date.now()) return false
    return true
  } catch {
    return true
  }
}

/** Revoke a single session (logout). Best-effort. */
export async function revokeSession(jti: string, reason = "logout"): Promise<void> {
  const client = svc()
  if (!client) return
  try {
    await client
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("jti", jti)
  } catch (e) {
    log.warn("admin-session", "session revoke failed", {
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

/** Revoke ALL active sessions for an email (e.g. password rotation). */
export async function revokeAllSessions(email: string, reason = "revoke-all"): Promise<void> {
  const client = svc()
  if (!client) return
  try {
    await client
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("email", email.toLowerCase())
      .is("revoked_at", null)
  } catch (e) {
    log.warn("admin-session", "revoke-all failed", {
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

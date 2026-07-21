/**
 * GET /api/health/ready — readiness probe (§3).
 *
 * Verifies the dependencies a request actually needs before this
 * instance should receive traffic:
 *   - database  (preview_jobs count head query — the migration-020
 *     tables also prove the schema is applied)
 *   - storage   (ai-previews bucket reachable)
 *   - AI preview provider availability (informational, non-fatal — the
 *     platform degrades to Sharp previews, so a missing key is degraded
 *     not unready)
 *
 * Also opportunistically evaluates alert rules (self-rate-limited) so a
 * regular readiness poll doubles as the monitoring heartbeat.
 *
 * 200 = ready, 503 = a hard dependency is down. Probe results feed the
 * alert engine via metric counters.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { increment } from "@/lib/observability/metrics"
import { evaluateAlerts } from "@/lib/observability/alerts"
import { getActivePreviewProvider } from "@/lib/ai/preview/provider"
import { APP_VERSION } from "@/lib/version"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Check { ok: boolean; ms: number; detail?: string }

async function timedCheck(fn: () => Promise<string | void>): Promise<Check> {
  const t0 = performance.now()
  try {
    const detail = await fn()
    return { ok: true, ms: Math.round(performance.now() - t0), detail: detail || undefined }
  } catch (err) {
    return { ok: false, ms: Math.round(performance.now() - t0), detail: err instanceof Error ? err.message : String(err) }
  }
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

export async function GET(): Promise<Response> {
  const configured = supabaseConfigured()

  const [db, storage] = configured
    ? await Promise.all([
        timedCheck(async () => {
          const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
          const { error } = await supabase.from("preview_jobs").select("id", { count: "exact", head: true })
          if (error) throw new Error(error.message)
        }),
        timedCheck(async () => {
          const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
          const { error } = await supabase.storage.from("ai-previews").list("", { limit: 1 })
          if (error) throw new Error(error.message)
        }),
      ])
    : [{ ok: true, ms: 0, detail: "supabase not configured (dev)" } as Check,
       { ok: true, ms: 0, detail: "supabase not configured (dev)" } as Check]

  const provider = await timedCheck(async () => {
    const p = await getActivePreviewProvider()
    return p ? `${p.providerId} available` : "no provider (Sharp-only degraded mode)"
  })

  /* Feed probe outcomes to the alert engine */
  if (!db.ok)      increment("health.dbDown")
  if (!storage.ok) increment("health.storageDown")

  const ready = db.ok && storage.ok   // provider is non-fatal by design
  void evaluateAlerts().catch(() => undefined)

  return Response.json(
    {
      status:  ready ? "ready" : "not_ready",
      version: APP_VERSION,
      ts:      new Date().toISOString(),
      checks: {
        database:       db,
        storage,
        previewProvider: provider,   // informational
      },
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  )
}

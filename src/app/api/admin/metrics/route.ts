/**
 * GET /api/admin/metrics — platform observability report (§2, admin-guarded).
 *
 * The single dashboard-ready aggregation: process uptime + memory,
 * in-process latency histograms + counters, Phase 4E cache/cost
 * intelligence, and provider_logs ledger aggregates (AI/worker/QA
 * latency, retries, failure categories, cache hits) over the requested
 * window. Read-only — composes telemetry other subsystems already emit.
 *
 * Query: ?hours=24 (default, clamped 1–168).
 *
 * Guarded twice: the proxy matcher on /api/admin/* + requireAdmin here.
 */

import type { NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { getPlatformMetrics } from "@/lib/observability/metrics"
import { evaluateAlerts } from "@/lib/observability/alerts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const hoursParam = Number(request.nextUrl.searchParams.get("hours"))
  const hours = Math.min(Math.max(Number.isFinite(hoursParam) ? hoursParam : 24, 1), 168)

  const metrics = await getPlatformMetrics(hours)
  const activeAlerts = await evaluateAlerts({ force: true, metrics })

  return Response.json(
    { success: true, metrics, activeAlerts },
    { headers: { "Cache-Control": "no-store" } }
  )
}

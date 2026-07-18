/**
 * src/lib/ai/preview/cleanup.ts
 *
 * Phase 4D — Cleanup Service (§7).
 *
 * Removes, on a configuration-driven schedule:
 *   1. TTL-expired previews  — ready/degraded/failed jobs past
 *      expires_at → status expired, bucket asset deleted, inline
 *      data-URI cleared (frees row bytes)
 *   2. Old terminal rows     — hard-deleted after the 30-day analytics
 *      retention window (blueprint §10)
 *   3. Expired cache entries — preview_cache rows past expires_at
 *   4. Orphaned payloads     — pending/*.json whose job is terminal or
 *      gone (abandoned uploads)
 *
 * Invocation model is serverless-friendly: runCleanup() is called
 * opportunistically from every worker tick but self-rate-limits to one
 * pass per cleanup.minIntervalMs per process. A platform cron can call
 * it with force=true for guaranteed cadence.
 */

import {
  listJobs, transitionJob, purgeJobs, purgeExpiredCache,
  deletePreviewAsset, getJob, supabaseConfigured,
} from "./job-service"
import { deletePayload } from "./payload-store"
import { resolveWorkerConfig, type WorkerConfig } from "./worker-config"
import { isTerminal } from "./lifecycle"

export interface CleanupReport {
  ran:            boolean
  expiredJobs:    number
  purgedJobs:     number
  purgedCache:    number
  orphanPayloads: number
  ms:             number
}

let _lastRunAt = 0

export async function runCleanup(
  cfgOrOverride?: WorkerConfig | { force?: boolean },
  force = false
): Promise<CleanupReport> {
  const isForce = force || (cfgOrOverride && "force" in cfgOrOverride && cfgOrOverride.force === true)
  const cfg = cfgOrOverride && "worker" in cfgOrOverride
    ? cfgOrOverride
    : resolveWorkerConfig()

  const report: CleanupReport = {
    ran: false, expiredJobs: 0, purgedJobs: 0, purgedCache: 0, orphanPayloads: 0, ms: 0,
  }

  const now = Date.now()
  if (!isForce && now - _lastRunAt < cfg.cleanup.minIntervalMs) return report
  _lastRunAt = now
  report.ran = true
  const started = Date.now()

  const nowIso = new Date(now).toISOString()

  /* ── 1. TTL-expired previews ── */
  const ttlExpired = await listJobs({
    statuses:      ["ready", "degraded", "failed"],
    expiresBefore: nowIso,
    limit:         cfg.cleanup.batchLimit,
  })
  for (const job of ttlExpired) {
    if (job.previewPath) await deletePreviewAsset(job.previewPath)
    const moved = await transitionJob(job.id, [job.status], {
      status: "expired", previewPath: null, previewDataUri: null,
    })
    if (moved) {
      await deletePayload(job.id)
      report.expiredJobs++
    }
  }

  /* ── 2. Purge old terminal rows (30d analytics retention) ── */
  const purgeCutoff = new Date(now - cfg.cleanup.purgeTerminalAfterMs).toISOString()
  const oldTerminal = await listJobs({
    statuses:      ["expired", "deleted", "failed", "degraded", "ready"],
    updatedBefore: purgeCutoff,
    limit:         cfg.cleanup.batchLimit,
  })
  if (oldTerminal.length > 0) {
    for (const job of oldTerminal) {
      if (job.previewPath) await deletePreviewAsset(job.previewPath)
    }
    report.purgedJobs = await purgeJobs(oldTerminal.map((j) => j.id))
  }

  /* ── 3. Expired cache rows ── */
  report.purgedCache = await purgeExpiredCache(nowIso, cfg.cleanup.batchLimit)

  /* ── 4. Orphaned pending payloads (bounded bucket listing) ── */
  report.orphanPayloads = await sweepOrphanPayloads(cfg)

  report.ms = Date.now() - started
  if (report.expiredJobs || report.purgedJobs || report.purgedCache || report.orphanPayloads) {
    console.log(`[ai:preview] ${JSON.stringify({ event: "cleanup_ran", ...report })}`)
  }
  return report
}

async function sweepOrphanPayloads(cfg: WorkerConfig): Promise<number> {
  if (!supabaseConfigured()) return 0
  let removed = 0
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
    const { data, error } = await supabase.storage
      .from("ai-previews")
      .list("pending", { limit: Math.min(cfg.cleanup.batchLimit, 100) })
    if (error || !data) return 0

    for (const file of data) {
      const jobId = file.name.replace(/\.json$/, "")
      if (!/^[0-9a-f-]{36}$/i.test(jobId)) continue
      const job = await getJob(jobId)
      if (!job || isTerminal(job.status)) {
        await deletePayload(jobId)
        removed++
      }
    }
  } catch { /* best-effort */ }
  return removed
}

/** Test hook — allow the next runCleanup() to execute immediately. */
export function resetCleanupClock(): void {
  _lastRunAt = 0
}

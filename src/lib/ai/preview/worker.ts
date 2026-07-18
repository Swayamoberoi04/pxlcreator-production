/**
 * src/lib/ai/preview/worker.ts
 *
 * Phase 4D — Background Worker.
 *
 * Separates request lifecycle from execution: the POST route only
 * VALIDATES, persists the job + payload, and kicks a worker tick. The
 * tick claims queued jobs ATOMICALLY (transitionJob's conditional
 * update = the lock), so any number of instances can run ticks
 * concurrently — each job has exactly one winner. That property is the
 * horizontal-scaling story: adding instances adds claim competitors,
 * nothing else changes.
 *
 *   tick ─→ claim(queued→generating) ─→ load payload ─→ watchdog[
 *             runGenerationJob(finalizeFailures:false)
 *           ] ─→ outcome:
 *                 ready/finalized  → delete payload, done
 *                 retryable        → policy check:
 *                     attempts left → status queued (RETRYING),
 *                                     backoff, re-claim, run again
 *                     exhausted     → degraded (Sharp fallback)
 *
 * Recovery (§10): every tick also sweeps for jobs stuck in
 * generating/qa beyond the staleness window (worker crash, instance
 * recycle) — with a payload they are re-queued, without one they are
 * degraded. QUEUED jobs need no special recovery: the claim loop IS
 * their recovery.
 */

import type { PreviewJob } from "@/types/preview"
import {
  getJob, transitionJob, listJobs, runGenerationJob, logProviderCall,
} from "./job-service"
import { loadPayload, deletePayload, bumpPayloadAttempts } from "./payload-store"
import type { JobPayload } from "./payload-store"
import { savePayload } from "./payload-store"
import {
  resolveWorkerConfig, computeBackoffMs, WORKER_CONFIG_VERSION,
  type WorkerConfig, type FailureCategory,
} from "./worker-config"
import { ACTIVE_STATUSES } from "./lifecycle"
import { runCleanup } from "./cleanup"

/* ─────────────────────────────────────────────────────────────
   Enqueue — called by the POST route inside after()
───────────────────────────────────────────────────────────── */

export async function enqueuePreviewJob(
  payload: Omit<JobPayload, "attempts" | "createdAt">
): Promise<void> {
  await savePayload({ ...payload, attempts: 0, createdAt: new Date().toISOString() })
  await runWorkerTick({ priorityJobId: payload.jobId })
}

/* ─────────────────────────────────────────────────────────────
   Worker tick
───────────────────────────────────────────────────────────── */

export interface TickResult {
  claimed:    number
  completed:  number
  retried:    number
  degraded:   number
  recovered:  number
  configVersion: string
}

export async function runWorkerTick(
  opts?: { priorityJobId?: string; config?: Partial<WorkerConfig> }
): Promise<TickResult> {
  const cfg = resolveWorkerConfig(opts?.config)
  const result: TickResult = {
    claimed: 0, completed: 0, retried: 0, degraded: 0, recovered: 0,
    configVersion: WORKER_CONFIG_VERSION,
  }

  /* ── Recovery sweep first: orphans re-enter the queue this tick ── */
  result.recovered = await recoverStaleJobs(cfg)

  /* ── Build the candidate list (priority job first, then FIFO) ── */
  const queued = await listJobs({ statuses: ["queued"], limit: cfg.worker.maxJobsPerTick * 2 })
  const candidateIds = [
    ...(opts?.priorityJobId ? [opts.priorityJobId] : []),
    ...queued.map((j) => j.id),
  ]
  const seen = new Set<string>()
  const candidates = candidateIds.filter((id) => !seen.has(id) && (seen.add(id), true))

  /* ── Claim + process with bounded concurrency ── */
  let index = 0
  const runners: Promise<void>[] = []
  const runNext = async (): Promise<void> => {
    while (index < candidates.length && result.claimed < cfg.worker.maxJobsPerTick) {
      const jobId = candidates[index++]
      const claimed = await transitionJob(jobId, ["queued"], { status: "generating" })
      if (!claimed) continue   // lost the race or no longer queued — not our job
      result.claimed++
      await processClaimedJob(jobId, cfg, result)
    }
  }
  for (let i = 0; i < Math.max(1, cfg.worker.maxConcurrent); i++) runners.push(runNext())
  await Promise.all(runners)

  /* ── Opportunistic maintenance (rate-limited internally) ── */
  await runCleanup(cfg)

  if (result.claimed > 0 || result.recovered > 0) {
    log("worker_tick", { ...result })
  }
  return result
}

/* ─────────────────────────────────────────────────────────────
   Per-job processing: watchdog + retry policy
───────────────────────────────────────────────────────────── */

async function processClaimedJob(jobId: string, cfg: WorkerConfig, result: TickResult): Promise<void> {
  const job = await getJob(jobId)
  if (!job) return

  const payload = await loadPayload(jobId)
  if (!payload) {
    /* Enqueued by an instance that died before persisting, or payload
       swept — nothing to work with. */
    await transitionJob(jobId, ["generating"], { status: "degraded", errorCode: "PAYLOAD_LOST" })
    result.degraded++
    logError("worker_payload_lost", { jobId })
    return
  }

  const queueWaitMs = Date.now() - new Date(job.createdAt).getTime()

  /* Retry loop — the ONLY loop that re-runs a full pipeline. */
  for (;;) {
    const attempt = await bumpPayloadAttempts(jobId)
    if (attempt < 0) return   // payload gone (concurrent cancel) — abandon
    const runStart = Date.now()

    const outcome = await withWatchdog(
      runGenerationJob(
        {
          jobId,
          imageBuffer: Buffer.from(payload.imageBase64, "base64"),
          imagePhash:  payload.imagePhash,
          analysis:    payload.analysis,
          presetSlug:  payload.presetSlug,
          userPrompt:  payload.userPrompt,
        },
        { finalizeFailures: false }
      ),
      cfg.worker.jobTimeoutMs
    )
    const workerMs = Date.now() - runStart

    /* Worker-time observability into the existing ledger (§9) */
    await logProviderCall({
      jobId, provider: "worker-4d", operation: "worker",
      latencyMs: workerMs,
      tokensOrUnits: {
        queueWaitMs, attempt, outcome: outcome.outcome,
        category: outcome.category, configVersion: WORKER_CONFIG_VERSION,
      },
      costUsd: null,
      error: outcome.outcome === "ready" ? null : `${outcome.errorCode}:${outcome.category}`,
    })

    if (outcome.outcome === "ready") {
      result.completed++
      await deletePayload(jobId)
      log("worker_job_done", { jobId, attempt, queueWaitMs, workerMs })
      return
    }

    if (outcome.finalized || !outcome.retryable || outcome.category === null) {
      /* Terminal state already written (or unwritable failure class) */
      if (!outcome.finalized) {
        await transitionJob(jobId, ["generating", "qa"], {
          status: "degraded", errorCode: outcome.errorCode ?? "INTERNAL",
        })
      }
      result.degraded++
      await deletePayload(jobId)
      return
    }

    /* ── Retryable: consult the per-category policy ── */
    const policy = cfg.retry[outcome.category as Exclude<FailureCategory, "permanent" | "qa">]
    if (!policy || attempt >= policy.maxAttempts) {
      await transitionJob(jobId, ["generating", "qa"], {
        status:    "degraded",
        errorCode: outcome.errorCode ?? "PROVIDER_FAILED",
        imageMeta: { ...job.imageMeta, workerAttempts: attempt, failureCategory: outcome.category },
      })
      result.degraded++
      await deletePayload(jobId)
      log("worker_retries_exhausted", { jobId, attempt, category: outcome.category })
      return
    }

    /* Back to the queue (lifecycle: RETRYING) for the backoff window —
       another instance may legitimately claim it after the sleep. */
    const requeued = await transitionJob(jobId, ["generating", "qa"], {
      status:    "queued",
      imageMeta: { ...job.imageMeta, workerAttempts: attempt, failureCategory: outcome.category },
    })
    if (!requeued) return   // cancelled/expired concurrently — respect it

    const backoffMs = computeBackoffMs(policy, attempt)
    result.retried++
    log("worker_retry_scheduled", { jobId, attempt, category: outcome.category, backoffMs })
    await sleep(backoffMs)

    const reclaimed = await transitionJob(jobId, ["queued"], { status: "generating" })
    if (!reclaimed) return  // another instance (or cancellation) took over
  }
}

/* ─────────────────────────────────────────────────────────────
   Recovery sweep (§6, §10)
───────────────────────────────────────────────────────────── */

export async function recoverStaleJobs(cfg: WorkerConfig): Promise<number> {
  let recovered = 0
  const now = Date.now()

  /* Hung generating/qa jobs — worker crash or provider stall */
  const hung = await listJobs({
    statuses:      ["generating", "qa"],
    updatedBefore: new Date(now - cfg.staleness.hungAfterMs).toISOString(),
    limit:         cfg.cleanup.batchLimit,
  })
  for (const job of hung) {
    const payload = await loadPayload(job.id)
    if (payload) {
      const requeued = await transitionJob(job.id, ["generating", "qa"], {
        status:    "queued",
        imageMeta: { ...job.imageMeta, workerAttempts: payload.attempts },
      })
      if (requeued) {
        recovered++
        log("job_recovered", { jobId: job.id, from: job.status, attempts: payload.attempts })
      }
    } else {
      const marked = await transitionJob(job.id, ["generating", "qa"], {
        status: "degraded", errorCode: "TIMEOUT",
      })
      if (marked) {
        logError("job_hung_no_payload", { jobId: job.id, from: job.status })
      }
    }
  }

  /* Abandoned queued jobs — nothing will ever claim them usefully */
  const abandoned = await listJobs({
    statuses:      ["queued"],
    updatedBefore: new Date(now - cfg.staleness.queuedExpireAfterMs).toISOString(),
    limit:         cfg.cleanup.batchLimit,
  })
  for (const job of abandoned) {
    const expired = await transitionJob(job.id, ["queued"], { status: "expired", errorCode: "QUEUE_TIMEOUT" })
    if (expired) {
      await deletePayload(job.id)
      log("job_queue_expired", { jobId: job.id })
    }
  }

  return recovered
}

/* ─────────────────────────────────────────────────────────────
   Cancellation (§4) — idempotent
───────────────────────────────────────────────────────────── */

export async function cancelJob(jobId: string): Promise<{ ok: boolean; job: PreviewJob | null }> {
  const job = await getJob(jobId)
  if (!job) return { ok: false, job: null }

  /* Terminal (incl. already-cancelled) → idempotent no-op success */
  if (!ACTIVE_STATUSES.includes(job.status)) {
    return { ok: true, job }
  }

  const won = await transitionJob(jobId, [...ACTIVE_STATUSES], {
    status: "deleted", errorCode: "CANCELLED",
  })
  /* An in-flight worker discovers the cancellation at its next atomic
     transition (which will match zero rows) — no corruption, its work
     is simply discarded. */
  if (won) {
    await deletePayload(jobId)
    log("job_cancelled", { jobId })
  }
  return { ok: true, job: await getJob(jobId) }
}

export async function resumeJob(jobId: string): Promise<{ ok: boolean; job: PreviewJob | null; reason?: string }> {
  const job = await getJob(jobId)
  if (!job) return { ok: false, job: null, reason: "NOT_FOUND" }
  if (ACTIVE_STATUSES.includes(job.status)) return { ok: true, job }        // already running
  if (job.status === "ready") return { ok: true, job }                       // nothing to resume
  if (job.status !== "deleted" || job.errorCode !== "CANCELLED") {
    return { ok: false, job, reason: "NOT_RESUMABLE" }
  }

  const payload = await loadPayload(jobId)
  if (!payload) return { ok: false, job, reason: "PAYLOAD_LOST" }

  const won = await transitionJob(jobId, ["deleted"], { status: "queued", errorCode: null })
  if (won) {
    log("job_resumed", { jobId })
    void runWorkerTick({ priorityJobId: jobId })
  }
  return { ok: true, job: await getJob(jobId) }
}

/* ─────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────── */

class WatchdogTimeout extends Error {
  readonly name = "WatchdogTimeout"
}

/**
 * Job-level watchdog (§6). On expiry the pipeline may still be running
 * as a zombie — its remaining writes are unconditional, so a very late
 * SUCCESS can still upgrade the row to ready (harmless: the client's
 * poll budget has long expired, and the preview lands in the cache for
 * future requests). Failures cannot regress a watchdog verdict because
 * the worker owns failure finalization.
 */
async function withWatchdog(
  pipeline: Promise<import("./job-service").GenerationOutcome>,
  timeoutMs: number
): Promise<import("./job-service").GenerationOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      pipeline,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new WatchdogTimeout(`Job watchdog fired after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } catch (err) {
    if (err instanceof WatchdogTimeout) {
      return { outcome: "degraded", errorCode: "TIMEOUT", category: "timeout", retryable: true, finalized: false }
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[ai:preview] ${JSON.stringify({ event, ...data })}`)
}

function logError(event: string, data: Record<string, unknown>): void {
  console.error(`[ai:preview] ${JSON.stringify({ event, ...data })}`)
}

/**
 * src/lib/ai/preview/worker-config.ts
 *
 * Phase 4D — central, versioned configuration for the async job system.
 *
 * Every timeout, retry limit, poll interval, cleanup schedule, and
 * concurrency bound lives here. WORKER_CONFIG_VERSION is emitted in
 * worker telemetry so historical behaviour stays attributable after
 * tuning. Bump the version whenever a number changes.
 */

export const WORKER_CONFIG_VERSION = "w4d.1.0.0"

export type FailureCategory =
  | "provider"    // upstream 429/5xx — the provider itself failed
  | "timeout"     // watchdog fired or the provider stalled
  | "network"     // fetch/socket-level failure
  | "qa"          // QA rejected (its own one-retry already happened)
  | "permanent"   // ENGINE_DISABLED, PRESET_NOT_FOUND, PAYLOAD_LOST, …

export interface RetryPolicy {
  /** Total pipeline attempts (first run + worker-level retries) */
  maxAttempts: number
  /** Base delay before a worker-level retry */
  backoffMs: number
  /** Exponential factor per additional attempt */
  backoffFactor: number
  /** Random jitter added to every backoff (0–jitterMs) */
  jitterMs: number
}

export interface WorkerConfig {
  /* ── Execution ─────────────────────────────────────────── */
  worker: {
    /** Jobs processed concurrently inside one worker tick */
    maxConcurrent: number
    /** Hard cap of jobs one tick may claim (bounds serverless runtime) */
    maxJobsPerTick: number
    /** Watchdog: total wall-clock budget for one pipeline run
        (must exceed provider timeout × attempts + QA retry ≈ 90s) */
    jobTimeoutMs: number
  }

  /* ── Retry policies per failure category (§3) ──────────── */
  retry: Record<Exclude<FailureCategory, "permanent" | "qa">, RetryPolicy> & {
    /** QA retry is owned by the Phase 4C gate (max ONE, inside the
        pipeline) — the worker never re-runs a QA_REJECTED job. */
    qa: { maxAttempts: 1 }
  }

  /* ── Staleness / hang detection (§6) ───────────────────── */
  staleness: {
    /** A generating/qa job whose updated_at is older than this is
        considered orphaned (worker crash / instance recycle) */
    hungAfterMs: number
    /** A queued job older than this that still has a payload gets
        picked up by recovery; without a payload it is failed */
    queuedRecoverAfterMs: number
    /** Queued jobs older than this are expired outright */
    queuedExpireAfterMs: number
  }

  /* ── Polling hints (§5) — consumed by the status endpoint ── */
  polling: {
    minIntervalMs: number
    maxIntervalMs: number
    /** Interval grows by elapsed/divisor — adaptive backoff */
    adaptiveDivisor: number
    /** Server-suggested total polling budget for clients */
    maxDurationMs: number
  }

  /* ── Cleanup service (§7) ──────────────────────────────── */
  cleanup: {
    /** Opportunistic cleanup runs at most once per this interval */
    minIntervalMs: number
    /** Ready/degraded/failed jobs past expires_at → expired + asset delete */
    expireAfterTtl: true
    /** Terminal rows older than this are hard-deleted (blueprint §10: 30d) */
    purgeTerminalAfterMs: number
    /** Expired cache rows older than this are deleted */
    purgeCacheAfterMs: number
    /** Max rows handled per cleanup pass (bounds runtime) */
    batchLimit: number
  }

  /* ── Memory bounds (§11) ───────────────────────────────── */
  memory: {
    /** In-memory job store cap — terminal jobs evicted first */
    maxJobs: number
    /** In-memory payload cache cap in bytes (hot path only; the
        durable payload store is the bucket) */
    maxPayloadBytes: number
  }
}

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  worker: {
    maxConcurrent:  2,
    maxJobsPerTick: 5,
    jobTimeoutMs:   120_000,
  },
  retry: {
    provider: { maxAttempts: 2, backoffMs: 2_000, backoffFactor: 2, jitterMs: 500 },
    timeout:  { maxAttempts: 2, backoffMs: 1_000, backoffFactor: 2, jitterMs: 500 },
    network:  { maxAttempts: 3, backoffMs: 1_500, backoffFactor: 2, jitterMs: 500 },
    qa:       { maxAttempts: 1 },
  },
  staleness: {
    hungAfterMs:          180_000,   // > jobTimeoutMs so the watchdog wins first
    queuedRecoverAfterMs: 15_000,
    queuedExpireAfterMs:  10 * 60_000,
  },
  polling: {
    minIntervalMs:   1_200,
    maxIntervalMs:   5_000,
    adaptiveDivisor: 6,
    maxDurationMs:   45_000,
  },
  cleanup: {
    minIntervalMs:        5 * 60_000,
    expireAfterTtl:       true,
    purgeTerminalAfterMs: 30 * 24 * 60 * 60_000,
    purgeCacheAfterMs:    24 * 60 * 60_000,
    batchLimit:           200,
  },
  memory: {
    maxJobs:         12_000,
    maxPayloadBytes: 96 * 1024 * 1024,
  },
}

export function resolveWorkerConfig(override?: Partial<WorkerConfig>): WorkerConfig {
  if (!override) return DEFAULT_WORKER_CONFIG
  return {
    worker:    { ...DEFAULT_WORKER_CONFIG.worker,    ...override.worker },
    retry:     { ...DEFAULT_WORKER_CONFIG.retry,     ...override.retry },
    staleness: { ...DEFAULT_WORKER_CONFIG.staleness, ...override.staleness },
    polling:   { ...DEFAULT_WORKER_CONFIG.polling,   ...override.polling },
    cleanup:   { ...DEFAULT_WORKER_CONFIG.cleanup,   ...override.cleanup },
    memory:    { ...DEFAULT_WORKER_CONFIG.memory,    ...override.memory },
  }
}

/** Deterministic backoff (jitter must be injected for testability). */
export function computeBackoffMs(
  policy: RetryPolicy,
  attempt: number,
  random: () => number = Math.random
): number {
  return Math.round(
    policy.backoffMs * policy.backoffFactor ** Math.max(0, attempt - 1) +
    random() * policy.jitterMs
  )
}

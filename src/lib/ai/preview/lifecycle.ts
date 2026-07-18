/**
 * src/lib/ai/preview/lifecycle.ts
 *
 * Phase 4D — Job Lifecycle Manager.
 *
 * Ten logical lifecycle states over the UNCHANGED migration-020 schema.
 * The persisted `status` column keeps its existing CHECK-constrained
 * vocabulary; the richer states are a deterministic projection of
 * (status, error_code, qa_retries, image_meta.workerAttempts):
 *
 *   Lifecycle    Persisted representation
 *   ─────────    ────────────────────────────────────────────
 *   QUEUED       status=queued, workerAttempts=0
 *   VALIDATING   (pre-persistence: the POST route validates and
 *                 normalizes BEFORE a row exists — an invalid image
 *                 never becomes a job, so this state is transient by
 *                 construction and surfaces only in the API contract)
 *   GENERATING   status=generating, qa_retries=0
 *   QA           status=qa
 *   RETRYING     status=queued with workerAttempts>0 (worker-level)
 *                OR status=generating with qa_retries>0 (QA-level)
 *   READY        status=ready
 *   FAILED       status=failed
 *   DEGRADED     status=degraded
 *   CANCELLED    status=deleted + error_code=CANCELLED
 *                ('deleted' was reserved by migration 020 and unused)
 *   EXPIRED      status=expired
 *
 * Transitions are validated against an explicit table — an illegal
 * transition is a programming error and throws. Atomicity is enforced
 * one level down by jobService.transitionJob (conditional UPDATE).
 */

import type { PreviewJob, PreviewJobStatus } from "@/types/preview"

export type JobLifecycleState =
  | "QUEUED" | "VALIDATING" | "GENERATING" | "QA" | "RETRYING"
  | "READY" | "FAILED" | "DEGRADED" | "CANCELLED" | "EXPIRED"

export const TERMINAL_STATES: ReadonlySet<JobLifecycleState> =
  new Set(["READY", "FAILED", "DEGRADED", "CANCELLED", "EXPIRED"])

/** Deterministic projection: persisted row → lifecycle state. */
export function toLifecycleState(job: Pick<PreviewJob, "status" | "errorCode" | "qaRetries" | "imageMeta">): JobLifecycleState {
  switch (job.status) {
    case "queued":     return (job.imageMeta.workerAttempts ?? 0) > 0 ? "RETRYING" : "QUEUED"
    case "generating": return job.qaRetries > 0 ? "RETRYING" : "GENERATING"
    case "qa":         return "QA"
    case "ready":      return "READY"
    case "failed":     return "FAILED"
    case "degraded":   return "DEGRADED"
    case "expired":    return "EXPIRED"
    case "deleted":    return job.errorCode === "CANCELLED" ? "CANCELLED" : "EXPIRED"
  }
}

/**
 * Allowed transitions over the PERSISTED status vocabulary — the level
 * at which atomic conditional updates operate. Every arrow the worker,
 * cancellation, recovery, or cleanup service takes must be listed here.
 */
const TRANSITIONS: Record<PreviewJobStatus, ReadonlySet<PreviewJobStatus>> = {
  queued:     new Set(["generating", "deleted", "expired", "failed", "degraded"]),
  generating: new Set(["qa", "queued", "degraded", "failed", "deleted", "expired"]),  // → queued = worker retry
  qa:         new Set(["generating", "queued", "ready", "degraded", "deleted", "expired"]), // → generating = QA retry
  ready:      new Set(["expired", "deleted"]),
  degraded:   new Set(["queued", "expired", "deleted"]),   // → queued = explicit resume
  failed:     new Set(["expired", "deleted"]),
  expired:    new Set([]),
  deleted:    new Set(["queued"]),                          // → queued = resume after cancel
}

export function isTransitionAllowed(from: PreviewJobStatus, to: PreviewJobStatus): boolean {
  return TRANSITIONS[from]?.has(to) ?? false
}

/** Throwing guard for programmatic use — illegal transitions are bugs. */
export function assertTransition(from: PreviewJobStatus, to: PreviewJobStatus): void {
  if (!isTransitionAllowed(from, to)) {
    throw new Error(`Illegal job transition ${from} → ${to}`)
  }
}

/** All persisted statuses a given persisted status may move to. */
export function allowedTargets(from: PreviewJobStatus): PreviewJobStatus[] {
  return [...(TRANSITIONS[from] ?? [])]
}

/** Persisted statuses that represent in-flight (recoverable) work. */
export const ACTIVE_STATUSES: readonly PreviewJobStatus[] = ["queued", "generating", "qa"]

export function isTerminal(status: PreviewJobStatus): boolean {
  return !ACTIVE_STATUSES.includes(status)
}

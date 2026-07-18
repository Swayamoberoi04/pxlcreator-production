/**
 * POST /api/ai/preview/cancel
 *
 * Phase 4D §4 — job cancellation and resume.
 *
 * Body: { jobId: string, action?: "cancel" | "resume" }   (default cancel)
 *
 * Semantics:
 *   cancel — idempotent. Active jobs (queued/generating/qa) move to
 *            CANCELLED atomically; an in-flight worker discovers the
 *            cancellation at its next conditional transition and
 *            abandons the job without corruption. Terminal jobs
 *            (including already-cancelled) return 200 with the current
 *            state. Cancelling never errors twice.
 *   resume — a CANCELLED job whose payload still exists returns to the
 *            queue and a worker tick is kicked. Jobs that are active or
 *            ready are returned as-is (nothing to resume).
 *
 * Stale polling after cancellation is inherently safe: the status
 * endpoint reports the terminal state with retryAfterMs 0 and clients
 * stop.
 */

import type { NextRequest } from "next/server"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { cancelJob, resumeJob } from "@/lib/ai/preview/worker"
import { toLifecycleState } from "@/lib/ai/preview/lifecycle"
import type { PreviewErrorResponse } from "@/types/preview"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const cancelLimiter = makeRateLimiter({ max: 60, windowMs: 60 * 1000 })

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  if (cancelLimiter.check(ip)) {
    const body: PreviewErrorResponse = { success: false, error: "Too many requests.", code: "RATE_LIMITED" }
    return Response.json(body, { status: 429 })
  }

  let payload: { jobId?: unknown; action?: unknown }
  try {
    payload = await request.json()
  } catch {
    const body: PreviewErrorResponse = { success: false, error: "Invalid JSON body.", code: "JOB_NOT_FOUND" }
    return Response.json(body, { status: 400 })
  }

  const jobId  = typeof payload.jobId === "string" ? payload.jobId : ""
  const action = payload.action === "resume" ? "resume" : "cancel"
  if (!UUID_RE.test(jobId)) {
    const body: PreviewErrorResponse = { success: false, error: "Invalid jobId.", code: "JOB_NOT_FOUND" }
    return Response.json(body, { status: 400 })
  }

  const result = action === "cancel" ? await cancelJob(jobId) : await resumeJob(jobId)

  if (!result.job) {
    const body: PreviewErrorResponse = { success: false, error: "Job not found.", code: "JOB_NOT_FOUND" }
    return Response.json(body, { status: 404 })
  }

  return Response.json({
    success:   result.ok,
    jobId:     result.job.id,
    action,
    status:    result.job.status,
    lifecycle: toLifecycleState(result.job),
    ...("reason" in result && result.reason ? { reason: result.reason } : {}),
  }, { headers: { "Cache-Control": "no-store" } })
}

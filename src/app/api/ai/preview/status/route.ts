/**
 * GET /api/ai/preview/status?jobId=<uuid>
 *
 * Polling endpoint for async preview jobs (blueprint §12).
 * Cheap job-store read; previewUrl is populated only when the job is
 * ready (signed bucket URL, or inline data URI when storage is not
 * configured). Clients poll every ~1.5s and stop on ready/degraded/failed.
 */

import type { NextRequest } from "next/server"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { getJob, resolvePreviewUrl } from "@/lib/ai/preview/job-service"
import { toLifecycleState, isTerminal } from "@/lib/ai/preview/lifecycle"
import { DEFAULT_WORKER_CONFIG } from "@/lib/ai/preview/worker-config"
import type { PreviewStatusResponse, PreviewErrorResponse } from "@/types/preview"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const statusLimiter = makeRateLimiter({ max: 120, windowMs: 60 * 1000 })

export async function GET(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  if (statusLimiter.check(ip)) {
    const body: PreviewErrorResponse = { success: false, error: "Too many requests.", code: "RATE_LIMITED" }
    return Response.json(body, { status: 429 })
  }

  const jobId = request.nextUrl.searchParams.get("jobId") ?? ""
  if (!UUID_RE.test(jobId)) {
    const body: PreviewErrorResponse = { success: false, error: "Invalid jobId.", code: "JOB_NOT_FOUND" }
    return Response.json(body, { status: 400 })
  }

  const job = await getJob(jobId)
  if (!job) {
    const body: PreviewErrorResponse = { success: false, error: "Job not found.", code: "JOB_NOT_FOUND" }
    return Response.json(body, { status: 404 })
  }

  const previewUrl = job.status === "ready" ? await resolvePreviewUrl(job) : null
  const elapsedMs  = Date.now() - new Date(job.createdAt).getTime()

  /* Phase 4D §5 — adaptive polling hint: the interval grows with job
     age (early polls are cheap and responsive, long waits back off),
     capped by config; 0 on terminal states = stop polling. */
  const cfgPoll = DEFAULT_WORKER_CONFIG.polling
  const retryAfterMs = isTerminal(job.status)
    ? 0
    : Math.min(
        Math.max(Math.round(elapsedMs / cfgPoll.adaptiveDivisor), cfgPoll.minIntervalMs),
        cfgPoll.maxIntervalMs
      )

  const body: PreviewStatusResponse = {
    success:    true,
    jobId:      job.id,
    status:     job.status,
    previewUrl,
    provider:   job.provider,
    elapsedMs,
    qa:         job.qa ? { verdict: job.qa.verdict } : null,
    errorCode:  job.errorCode,
    lifecycle:  toLifecycleState(job),
    retryAfterMs,
  }
  return Response.json(body, { headers: { "Cache-Control": "no-store" } })
}

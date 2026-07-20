/**
 * POST /api/ai/preview
 *
 * Creates an async AI preview generation job (blueprint §12).
 *
 * multipart/form-data:
 *   image         — the studio's already-optimized photo (≤10MB guard,
 *                   re-normalized server-side to ≤1024px JPEG)
 *   presetSlug    — the recommended preset to visualize
 *   imageAnalysis — JSON ImageAnalysisResult from /api/studio/process
 *   prompt        — the user's original text (data only, sanitized in
 *                   the prompt builder)
 *
 * Responses:
 *   200 — exact-result cache hit: { status: "ready", previewUrl }
 *   202 — job created:            { jobId, status: "queued", etaSeconds }
 *   4xx/5xx — PreviewErrorResponse
 *
 * Generation runs AFTER the response is sent (next/server `after`) —
 * the studio is never blocked; the client polls /api/ai/preview/status.
 */

import type { NextRequest } from "next/server"
import { after } from "next/server"
import { z } from "zod"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { getActivePreviewProvider } from "@/lib/ai/preview/provider"
import { computePhash } from "@/lib/ai/preview/phash"
import {
  createJob, buildCacheKey, signPreviewUrl,
  hashClientIp, checkAndReserveSpend, findActiveJob,
} from "@/lib/ai/preview/job-service"
import { enqueuePreviewJob } from "@/lib/ai/preview/worker"
import { cacheGet } from "@/lib/ai/preview/cache/engine"
import { findNearDuplicate } from "@/lib/ai/preview/cache/duplicates"
import { recordCacheHit, recordCacheMiss } from "@/lib/ai/preview/cache/cost-intelligence"
import type { ImageAnalysisResult } from "@/types/ai"
import type { PreviewCreateResponse, PreviewErrorResponse } from "@/types/preview"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const PREVIEW_EDGE  = 1024

const previewLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

/* Only the fields the prompt builder reads — loose on everything else
   (same validation posture as /api/ai/recommendations-v2) */
const analysisSchema = z.object({
  styleProfileId: z.string(),
  scene:   z.object({ timeOfDay: z.string() }).loose(),
  subject: z.object({ hasSkinTones: z.boolean().catch(false) }).loose(),
  quality: z.object({ exposure: z.string() }).loose(),
}).loose()

function err(code: PreviewErrorResponse["code"], message: string, status: number): Response {
  const body: PreviewErrorResponse = { success: false, error: message, code }
  return Response.json(body, { status })
}

export async function POST(request: NextRequest): Promise<Response> {
  /* ── Engine availability ── */
  const provider = await getActivePreviewProvider()
  if (!provider) {
    return err("ENGINE_DISABLED", "AI preview generation is not available.", 503)
  }

  /* ── Rate limit ── */
  const ip = getClientIp(request)
  if (previewLimiter.check(ip)) {
    return err("RATE_LIMITED", "Too many preview requests. Please wait.", 429)
  }

  /* ── Parse form ── */
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return err("INVALID_FILE", "Invalid request body.", 400)
  }

  const imageField = formData.get("image")
  if (!imageField || typeof imageField === "string") {
    return err("INVALID_FILE", "No image provided.", 400)
  }
  const imageFile = imageField as File
  if (!ALLOWED_TYPES.has(imageFile.type) || imageFile.size > MAX_FILE_SIZE) {
    return err("INVALID_FILE", "Invalid image type or size.", 400)
  }

  const presetSlug = formData.get("presetSlug")
  if (typeof presetSlug !== "string" || presetSlug.trim().length === 0 || presetSlug.length > 120) {
    return err("PRESET_NOT_FOUND", "presetSlug is required.", 400)
  }

  const rawAnalysis = formData.get("imageAnalysis")
  let analysis: ImageAnalysisResult
  try {
    const parsed = analysisSchema.safeParse(JSON.parse(String(rawAnalysis)))
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.path.join("."))
    analysis = parsed.data as unknown as ImageAnalysisResult
  } catch {
    return err("INVALID_ANALYSIS", "imageAnalysis is missing or malformed.", 400)
  }

  const rawPrompt  = formData.get("prompt")
  const userPrompt = typeof rawPrompt === "string" ? rawPrompt.slice(0, 500) : ""

  /* ── Normalize: EXIF-rotate, ≤1024px, JPEG (blueprint image pipeline) ── */
  let normalized: Buffer
  let meta: { width: number; height: number }
  try {
    const sharp = (await import("sharp")).default
    normalized  = await sharp(Buffer.from(await imageFile.arrayBuffer()))
      .rotate()
      .resize(PREVIEW_EDGE, PREVIEW_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
    const m = await sharp(normalized).metadata()
    meta = { width: m.width ?? 0, height: m.height ?? 0 }
  } catch {
    return err("INVALID_FILE", "Image could not be processed.", 422)
  }

  /* ── Cache lookup pipeline (Phase 4E §3):
     exact key → near-duplicate → in-flight dedup → miss → worker ── */
  const phash = await computePhash(normalized)
  const slug  = presetSlug.trim()

  /* 1. Exact multi-level lookup (L0 → L1) */
  const cacheKey = buildCacheKey(phash, slug, provider.providerId, analysis.styleProfileId)
  const exact = await cacheGet("preview", cacheKey)
  if (exact) {
    const url = exact.kind === "path" ? await signPreviewUrl(exact.value) : exact.value
    if (url) {
      void recordCacheHit({ source: exact.level ?? "l1", presetSlug: slug, jobIdLike: exact.sourceJobId })
      console.log(`[ai:preview] ${JSON.stringify({ event: "cache_hit", level: exact.level, presetSlug: slug, phash })}`)
      const body: PreviewCreateResponse = {
        success: true, jobId: null, status: "ready",
        cached: true, etaSeconds: null, previewUrl: url,
      }
      return Response.json(body, { status: 200 })
    }
  }

  /* 2. Near-duplicate: the same photo re-encoded/renamed (§4) */
  const near = await findNearDuplicate(phash, slug)
  if (near) {
    const url = near.entry.kind === "path" ? await signPreviewUrl(near.entry.value) : near.entry.value
    if (url) {
      void recordCacheHit({ source: "near-duplicate", presetSlug: slug, jobIdLike: near.entry.sourceJobId })
      console.log(`[ai:preview] ${JSON.stringify({ event: "cache_hit_near_duplicate", distance: near.distance, presetSlug: slug, phash, twinPhash: near.twinPhash })}`)
      const body: PreviewCreateResponse = {
        success: true, jobId: null, status: "ready",
        cached: true, etaSeconds: null, previewUrl: url,
      }
      return Response.json(body, { status: 200 })
    }
  }

  /* 3. In-flight dedup: attach to an identical active job */
  const active = await findActiveJob(phash, slug)
  if (active) {
    void recordCacheHit({ source: "inflight-dedup", presetSlug: slug, jobIdLike: active.id })
    console.log(`[ai:preview] ${JSON.stringify({ event: "dedup_attached", jobId: active.id, presetSlug: slug })}`)
    const body: PreviewCreateResponse = {
      success: true, jobId: active.id, status: active.status,
      cached: false, etaSeconds: 8, previewUrl: null,
    }
    return Response.json(body, { status: 202 })
  }

  /* 4. Miss — proceed to the worker (§3 store-on-completion is owned
     by the untouched 4D pipeline via cacheStore) */
  recordCacheMiss(slug)

  /* ── Daily spend kill-switch (blueprint §7) ── */
  if (!checkAndReserveSpend(provider.costPerPreviewUsd)) {
    return err("ENGINE_DISABLED", "Preview generation is paused for today.", 503)
  }

  /* ── Create job + fire generation after the response is sent ── */
  const job = await createJob({
    clientIpHash:   hashClientIp(ip),
    imagePhash:     phash,
    imageMeta:      { ...meta, format: "jpeg", bytes: normalized.length },
    presetSlug:     presetSlug.trim(),
    styleProfileId: analysis.styleProfileId,
  })

  /* Phase 4D: the request only enqueues — the worker owns execution.
     enqueuePreviewJob persists the payload (restart-recoverable) and
     runs a claim-based worker tick that starts with this job. */
  after(() =>
    enqueuePreviewJob({
      jobId:       job.id,
      imageBase64: normalized.toString("base64"),
      imagePhash:  phash,
      analysis,
      presetSlug:  presetSlug.trim(),
      userPrompt,
    })
  )

  const body: PreviewCreateResponse = {
    success: true, jobId: job.id, status: "queued",
    cached: false, etaSeconds: 8, previewUrl: null,
  }
  return Response.json(body, { status: 202 })
}

/**
 * POST /api/ai/recommendations-v2
 *
 * The Preset Intelligence Engine endpoint.
 *
 * Body:  { imageAnalysis: ImageAnalysisResult, limit?: number }
 *        — the analysis object the client already holds from
 *          /api/studio/process or /api/ai/analyze. No image bytes,
 *          no Gemini call: pure in-memory scoring.
 *
 * Returns RecommendationsV2Response:
 *   top presets, confidence, reasons, chips, per-dimension breakdown,
 *   engine metadata, processing time.
 *
 * Latency budget: <150ms (knowledge base is cached per catalogue
 * version; scoring is O(n) arithmetic).
 *
 * v1 (/api/ai/recommendations) remains untouched for backward compat.
 */

import type { NextRequest } from "next/server"
import { z } from "zod"
import { getCachedCatalog } from "@/lib/ai/preset-intelligence/catalog-cache"
import { getKnowledgeBase, getRelationships } from "@/lib/ai/preset-intelligence/knowledge-base"
import { rankPresets, DEFAULT_WEIGHTS } from "@/lib/ai/preset-intelligence/scoring"
import { ENGINE_VERSION } from "@/lib/ai/preset-intelligence/metadata-generator"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import type { ImageAnalysisResult } from "@/types/ai"
import type { ScoredRecommendation, RecommendationsV2Response } from "@/types/preset-intelligence"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const limiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })

/* Validate only the fields the scoring engine reads — permissive on the
   rest so provider evolution never breaks this route. */
const analysisSchema = z.object({
  styleProfileId: z.string(),
  scene: z.object({
    type:      z.string(),
    timeOfDay: z.string(),
  }).loose(),
  lighting: z.object({
    quality:          z.string(),
    colorTemperature: z.string(),
    hasShadowCrush:   z.boolean().catch(false),
  }).loose(),
  colors: z.object({
    dominant:        z.array(z.string()).max(8),
    palette:         z.array(z.string()).max(8),
    grade:           z.string(),
    saturationLevel: z.string(),
    contrastLevel:   z.string(),
  }).loose(),
  subject: z.object({
    hasSkinTones: z.boolean().catch(false),
  }).loose(),
  mood: z.object({
    primary:    z.string(),
    secondary:  z.string().nullable().catch(null),
    energy:     z.string(),
    adjectives: z.array(z.string()).max(10),
  }).loose(),
  composition: z.object({
    orientation: z.string(),
  }).loose(),
  quality: z.object({
    exposure: z.string(),
  }).loose(),
  presetKeywords: z.array(z.string()).max(12),
}).loose()

export async function POST(request: NextRequest): Promise<Response> {
  const started = Date.now()

  const ip = getClientIp(request)
  if (limiter.check(ip)) {
    return Response.json({ success: false, error: "Too many requests.", code: "RATE_LIMITED" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const payload = body as { imageAnalysis?: unknown; limit?: unknown }
  const parsed = analysisSchema.safeParse(payload.imageAnalysis)
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "imageAnalysis is missing or malformed.", detail: parsed.error.issues[0]?.path.join(".") },
      { status: 400 }
    )
  }

  const limit = Math.min(Math.max(Number(payload.limit) || 5, 1), 10)

  /* ── Load catalogue (5-min TTL cache) + knowledge base (cached per catalogue version) ── */
  let presets
  try {
    presets = (await getCachedCatalog()).presets
  } catch (err) {
    console.error(`[ai:intelligence] ${JSON.stringify({ event: "catalog_load_failed", error: String(err) })}`)
    return Response.json({ success: false, error: "Could not load preset catalogue." }, { status: 503 })
  }

  const gradablePresets = presets

  const kb = getKnowledgeBase(gradablePresets)

  /* ── Rank ── */
  const ranked = rankPresets(parsed.data as unknown as ImageAnalysisResult, kb, { limit })

  /* ── Merge display data + lazy relationships for the top match ── */
  const recommendations: ScoredRecommendation[] = ranked.map((r, i) => {
    const preset = kb.presets.get(r.slug)
    return {
      rank:         i + 1,
      presetId:     preset?.id ?? "",
      slug:         r.slug,
      name:         preset?.name ?? r.slug,
      tagline:      preset?.tagline ?? "",
      category:     preset?.category ?? "",
      price:        preset?.price ?? 0,
      isFree:       preset?.isFree ?? false,
      thumbnailUrl: preset?.thumbnailUrl,
      rating:       preset?.rating,
      reviewCount:  preset?.reviewCount,
      confidence:   r.confidence,
      reasons:      r.reasons,
      chips:        r.chips,
      dimensions:   r.dimensions,
    }
  })

  const top = recommendations[0] ?? null
  const topRelationships = top ? getRelationships(kb, top.slug, 3) : null

  const processingMs = Date.now() - started

  console.log(`[ai:intelligence] ${JSON.stringify({
    event:            "recommendations_ok",
    engineVersion:    ENGINE_VERSION,
    presetsEvaluated: kb.entries.size,
    kbFromCache:      kb.fromCache,
    topSlug:          top?.slug,
    topConfidence:    top?.confidence,
    processingMs,
  })}`)

  const response: RecommendationsV2Response & { topRelationships: typeof topRelationships } = {
    success:         true,
    recommendations,
    topMatch:        top,
    topRelationships,
    meta: {
      presetsEvaluated: kb.entries.size,
      engineVersion:    ENGINE_VERSION,
      weights:          DEFAULT_WEIGHTS,
      processingMs,
      knowledgeBase: {
        entries:   kb.entries.size,
        builtAt:   kb.builtAt,
        fromCache: kb.fromCache,
      },
    },
  }

  return Response.json(response)
}

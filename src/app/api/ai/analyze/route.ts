/**
 * POST /api/ai/analyze
 *
 * Runs the AI analysis pipeline on an uploaded image.
 * This is the primary integration point for Phase 2 Vision AI.
 *
 * Accepts multipart/form-data:
 *   image           — image file (JPEG / PNG / WebP, ≤ 10 MB)
 *   prompt          — user's aesthetic description
 *   aesthetics      — JSON string[] of keyword chips
 *   styleProfileId  — optional: pre-select a StyleProfile ID
 *
 * Returns:
 *   { success, imageAnalysis: ImageAnalysisResult, styleProfile, processingMs }
 *
 * Phase 2 integration point:
 *   The active AIProvider is resolved in src/lib/ai/provider.ts → getActiveProvider().
 *   Swap to GeminiProvider there. This route never changes.
 */

import type { NextRequest }          from "next/server"
import { analyzeImage }              from "@/lib/ai/analyze"
import { getStyleProfile }           from "@/lib/studio/style-profiles"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_FILE_SIZE  = 10 * 1024 * 1024
const ALLOWED_TYPES  = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PROMPT_LEN = 500

const analyzeLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  if (analyzeLimiter.check(ip)) {
    return Response.json({ success: false, error: "Too many requests.", code: "RATE_LIMITED" }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  /* ── Image ── */
  const imageField = formData.get("image")
  if (!imageField || typeof imageField === "string") {
    return Response.json({ success: false, error: "No image provided." }, { status: 400 })
  }

  const imageFile = imageField as File

  if (!ALLOWED_TYPES.has(imageFile.type) || imageFile.size > MAX_FILE_SIZE) {
    return Response.json({ success: false, error: "Invalid file type or size." }, { status: 400 })
  }

  /* ── Prompt ── */
  const rawPrompt = formData.get("prompt")
  const prompt    = typeof rawPrompt === "string" ? rawPrompt.trim().slice(0, MAX_PROMPT_LEN) : ""

  /* ── Aesthetics ── */
  let aesthetics: string[] = []
  const rawAesthetics = formData.get("aesthetics")
  if (typeof rawAesthetics === "string") {
    try {
      const parsed = JSON.parse(rawAesthetics)
      if (Array.isArray(parsed)) aesthetics = parsed.map(String).filter(Boolean).slice(0, 10)
    } catch { /* ignore */ }
  }

  /* ── Convert + validate ── */
  const arrayBuffer = await imageFile.arrayBuffer()
  const imageBuffer = Buffer.from(arrayBuffer)

  let imageMetadata: { width?: number; height?: number; format?: string; size?: number }
  try {
    const sharp   = (await import("sharp")).default
    const meta    = await sharp(imageBuffer).metadata()
    imageMetadata = { width: meta.width, height: meta.height, format: meta.format, size: imageFile.size }
  } catch {
    return Response.json({ success: false, error: "Could not read image." }, { status: 422 })
  }

  /* ── Run analysis via active AIProvider ── */
  let result
  try {
    result = await analyzeImage(imageBuffer, prompt, aesthetics, imageMetadata)
  } catch (err) {
    console.error("[api/ai/analyze] failed:", err)
    return Response.json({ success: false, error: "Analysis failed. Please try again." }, { status: 503 })
  }

  /* Include the full StyleProfile so the client can show profile metadata */
  const profile = getStyleProfile(result.imageAnalysis.styleProfileId)

  return Response.json({
    success:       true,
    imageAnalysis: result.imageAnalysis,
    styleProfile:  profile ? { id: profile.id, name: profile.name, emoji: profile.emoji, tagline: profile.tagline, colorPalette: profile.colorPalette } : null,
    processingMs:  result.imageAnalysis.processingMs,
  })
}

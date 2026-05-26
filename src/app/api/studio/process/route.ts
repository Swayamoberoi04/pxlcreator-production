/**
 * src/app/api/studio/process/route.ts
 *
 * POST /api/studio/process
 *
 * Accepts multipart/form-data with:
 *   image      — image file (jpeg / png / webp, ≤ 10 MB)
 *   prompt     — user's aesthetic description string
 *   aesthetics — JSON-serialised string[] of chip keywords
 *
 * Pipeline:
 *   1. Validate request (type, size, prompt)
 *   2. Rate-limit by IP (5 req / hour in-memory)
 *   3. analyzeImage()   → AIAnalysis  (OpenAI GPT-4o Vision)
 *   4. processImage()   → Buffer      (Sharp color grading)  ┐ parallel
 *      recommendPreset()→ Recommendation (keyword matching)  ┘
 *   5. Return StudioSuccessResponse JSON
 *
 * Server-only. Sharp requires Node.js runtime — never Edge.
 */

import type { NextRequest } from "next/server"
import { analyzeImage }    from "@/lib/ai/analyze"
import { processImage }    from "@/lib/studio/process"
import { recommendPreset } from "@/lib/studio/recommend"
import { getPresets }      from "@/lib/presets/repository"
import { makeRateLimiter } from "@/lib/api/rate-limit"
import type { StudioAPIResponse, StudioErrorCode } from "@/types/studio"

/* ─────────────────────────────────────────────────────────────
   Route segment config
───────────────────────────────────────────────────────────── */

/** Sharp is a native Node.js module — must NOT run on the Edge runtime */
export const runtime = "nodejs"

/** This route handles live user uploads — never pre-render or cache */
export const dynamic = "force-dynamic"

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const MAX_FILE_SIZE    = 10 * 1024 * 1024              // 10 MB
const ALLOWED_TYPES    = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PROMPT_LEN   = 500

/* ─────────────────────────────────────────────────────────────
   Rate limiter — shared module (in-process, resets on restart).
   Phase 2: swap makeRateLimiter store for Upstash Redis client.
───────────────────────────────────────────────────────────── */

/** 5 AI processing requests per hour per IP */
const studioLimiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

/** Extract the real client IP from forwarded headers */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

/* ─────────────────────────────────────────────────────────────
   Response helpers
───────────────────────────────────────────────────────────── */

function errorResponse(
  message: string,
  code: StudioErrorCode,
  status: number
): Response {
  const body: StudioAPIResponse = { success: false, error: message, code }
  return Response.json(body, { status })
}

/* ─────────────────────────────────────────────────────────────
   POST handler
───────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest): Promise<Response> {
  const startMs = Date.now()

  /* ── 1. Rate limiting ── */
  const ip = getClientIp(request)
  if (studioLimiter.check(ip)) {
    return errorResponse(
      "Too many requests. Please wait before trying again.",
      "RATE_LIMITED",
      429
    )
  }

  /* ── 2. Parse FormData ── */
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse("Invalid request body.", "INVALID_FILE", 400)
  }

  /* ── 3. Extract + validate the image field ── */
  const imageField = formData.get("image")

  if (!imageField || typeof imageField === "string") {
    return errorResponse("No image file was provided.", "INVALID_FILE", 400)
  }

  const imageFile = imageField as File

  if (!ALLOWED_TYPES.has(imageFile.type)) {
    return errorResponse(
      `Unsupported file type "${imageFile.type}". Please upload a JPEG, PNG, or WebP image.`,
      "INVALID_FILE",
      415
    )
  }

  if (imageFile.size > MAX_FILE_SIZE) {
    return errorResponse(
      `File is too large (${(imageFile.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
      "FILE_TOO_LARGE",
      413
    )
  }

  /* ── 4. Extract + validate the prompt field ── */
  const rawPrompt = formData.get("prompt")

  if (!rawPrompt || typeof rawPrompt !== "string" || rawPrompt.trim().length === 0) {
    return errorResponse(
      "Please describe the look you want before submitting.",
      "PROMPT_MISSING",
      400
    )
  }

  const prompt = rawPrompt.trim().slice(0, MAX_PROMPT_LEN)

  /* ── 5. Extract aesthetic chip keywords ── */
  let aesthetics: string[] = []
  const rawAesthetics = formData.get("aesthetics")
  if (rawAesthetics && typeof rawAesthetics === "string") {
    try {
      const parsed = JSON.parse(rawAesthetics)
      if (Array.isArray(parsed)) {
        aesthetics = parsed.map(String).filter(Boolean).slice(0, 10)
      }
    } catch {
      // Malformed JSON — ignore, proceed without chips
    }
  }

  /* ── 6. Convert File → Node Buffer ── */
  const arrayBuffer  = await imageFile.arrayBuffer()
  const imageBuffer  = Buffer.from(arrayBuffer)

  /* ── 7. Validate image integrity with Sharp (catches corrupt files) ── */
  try {
    const sharp = (await import("sharp")).default
    await sharp(imageBuffer).metadata()
  } catch {
    return errorResponse(
      "The uploaded file could not be read as an image. Please try a different file.",
      "INVALID_FILE",
      422
    )
  }

  /* ── 8. AI analysis ── */
  let analysis
  try {
    analysis = await analyzeImage(imageBuffer, prompt, aesthetics)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[studio/process] analyzeImage failed:", message)
    return errorResponse(
      "The AI analysis service is temporarily unavailable. Please try again in a moment.",
      "AI_ERROR",
      503
    )
  }

  /* ── 9. Fetch preset pool + process image in parallel ── */
  /*
   * We fetch all published presets from Supabase (or the static fallback)
   * so the recommender works with live data, not hardcoded arrays.
   * getPresets() is fast: it's a simple indexed SELECT with no joins —
   * and the result is used immediately by recommendPreset() below.
   */
  let processedBuffer: Buffer
  let recommendation
  try {
    const [processedBuf, allPresets] = await Promise.all([
      processImage(imageBuffer, analysis.adjustments),
      getPresets({ orderBy: "order_index" }),
    ])
    processedBuffer = processedBuf
    recommendation  = recommendPreset(analysis.presetKeywords, allPresets)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[studio/process] processImage failed:", message)
    return errorResponse(
      "Image processing failed. Please try a different image.",
      "PROCESS_ERROR",
      500
    )
  }

  /* ── 10. Encode processed image as base64 data URI ── */
  const processedImage = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`

  /* ── 11. Build + return success response ── */
  const body: StudioAPIResponse = {
    success:        true,
    processedImage,
    analysis,
    recommendation,
    processingMs:   Date.now() - startMs,
  }

  return Response.json(body, { status: 200 })
}

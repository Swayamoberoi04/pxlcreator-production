/**
 * src/app/api/studio/process/route.ts
 *
 * POST /api/studio/process
 *
 * Accepts multipart/form-data:
 *   image      — image file (JPEG / PNG / WebP, ≤ 10 MB)
 *   prompt     — user's aesthetic description string
 *   aesthetics — JSON-serialised string[] of chip keywords
 *
 * Pipeline:
 *   1. Validate file (type, size, integrity)
 *   2. Rate-limit by IP
 *   3. Extract Sharp metadata (real composition data for analysis)
 *   4. analyzeImage() → { analysis, imageAnalysis }  (AIProvider)
 *   5. processImage() + recommendPreset() in parallel (Sharp + keyword engine)
 *   6. Return StudioSuccessResponse
 *
 * Server-only (Sharp requires Node.js runtime — never Edge).
 *
 * Phase 2: Step 4 automatically uses Gemini/OpenAI once the provider is
 * swapped in src/lib/ai/provider.ts. No changes required in this file.
 */

import type { NextRequest }   from "next/server"
import { analyzeImage }       from "@/lib/ai/analyze"
import { processImage }       from "@/lib/studio/process"
import { recommendPreset }    from "@/lib/studio/recommend"
import { getPresets }         from "@/lib/presets/repository"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import type { StudioAPIResponse, StudioErrorCode } from "@/types/studio"

/* ─────────────────────────────────────────────────────────────
   Route config — Node.js runtime required (Sharp)
───────────────────────────────────────────────────────────── */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

/*
 * This 10MB ceiling is a defense-in-depth sanity check, not the binding
 * constraint in production. Vercel Serverless Functions enforce a hard
 * ~4.5MB request-body limit upstream of any Next.js code — a request
 * over that size never reaches this handler at all (the platform
 * returns its own 413 first). That limit isn't configurable from
 * next.config.ts or here. The real fix is client-side: every upload is
 * resized/re-encoded in the browser before it's sent (see
 * src/lib/studio/client-image-prep.ts + UploadZone.tsx), which keeps
 * real-world uploads far under the platform ceiling.
 */
const MAX_FILE_SIZE  = 10 * 1024 * 1024
const ALLOWED_TYPES  = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PROMPT_LEN = 500

/* ─────────────────────────────────────────────────────────────
   Rate limiter — 5 requests / hour per IP
   Phase 2: swap store for Upstash Redis for distributed limiting
───────────────────────────────────────────────────────────── */

const studioLimiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function errorResponse(message: string, code: StudioErrorCode, status: number): Response {
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
    return errorResponse("Too many requests. Please wait before trying again.", "RATE_LIMITED", 429)
  }

  /* ── 2. Parse FormData ── */
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse("Invalid request body.", "INVALID_FILE", 400)
  }

  /* ── 3. Validate image field ── */
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

  /* ── 4. Validate prompt ── */
  const rawPrompt = formData.get("prompt")
  if (!rawPrompt || typeof rawPrompt !== "string" || rawPrompt.trim().length === 0) {
    return errorResponse("Please describe the look you want before submitting.", "PROMPT_MISSING", 400)
  }

  const prompt = rawPrompt.trim().slice(0, MAX_PROMPT_LEN)

  /* ── 5. Extract aesthetic keywords ── */
  let aesthetics: string[] = []
  const rawAesthetics = formData.get("aesthetics")
  if (rawAesthetics && typeof rawAesthetics === "string") {
    try {
      const parsed = JSON.parse(rawAesthetics)
      if (Array.isArray(parsed)) {
        aesthetics = parsed.map(String).filter(Boolean).slice(0, 10)
      }
    } catch { /* Malformed JSON — proceed without chips */ }
  }

  /* ── 6. Convert File → Node Buffer ── */
  const arrayBuffer = await imageFile.arrayBuffer()
  const imageBuffer = Buffer.from(arrayBuffer)

  /* ── 7. Validate image integrity + extract real metadata ── */
  let imageMetadata: { width?: number; height?: number; format?: string; size?: number }
  try {
    const sharp    = (await import("sharp")).default
    const meta     = await sharp(imageBuffer).metadata()
    imageMetadata  = {
      width:  meta.width,
      height: meta.height,
      format: meta.format,
      size:   imageFile.size,
    }
  } catch {
    return errorResponse(
      "The uploaded file could not be read as an image. Please try a different file.",
      "INVALID_FILE",
      422
    )
  }

  /* ── 8. AI analysis — uses active AIProvider (stub in Phase 1) ── */
  let analyzeResult
  try {
    analyzeResult = await analyzeImage(imageBuffer, prompt, aesthetics, imageMetadata)
  } catch (err) {
    console.error("[studio/process] analyzeImage failed:", err instanceof Error ? err.message : err)
    return errorResponse(
      "The AI analysis service is temporarily unavailable. Please try again in a moment.",
      "AI_ERROR",
      503
    )
  }

  const { analysis, imageAnalysis } = analyzeResult

  /* ── 9. Process image + fetch presets in parallel ── */
  let processedBuffer: Buffer
  let recommendation
  try {
    const [processedBuf, allPresets] = await Promise.all([
      processImage(imageBuffer, imageAnalysis.adjustments),
      getPresets({ orderBy: "order_index" }),
    ])
    processedBuffer = processedBuf
    recommendation  = recommendPreset(imageAnalysis.presetKeywords, allPresets)
  } catch (err) {
    console.error("[studio/process] processImage failed:", err instanceof Error ? err.message : err)
    return errorResponse("Image processing failed. Please try a different image.", "PROCESS_ERROR", 500)
  }

  /* ── 10. Encode processed image as base64 data URI ── */
  const processedImage = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`

  /* ── 11. Return full response ── */
  const body: StudioAPIResponse = {
    success: true,
    processedImage,
    analysis,
    imageAnalysis,
    recommendation,
    processingMs: Date.now() - startMs,
  }

  return Response.json(body, { status: 200 })
}

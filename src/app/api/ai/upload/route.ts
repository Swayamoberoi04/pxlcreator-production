/**
 * POST /api/ai/upload
 *
 * Phase 1: Validates an uploaded image and returns its metadata.
 * Does NOT store the image. Does NOT run AI analysis.
 *
 * Accepts multipart/form-data with:
 *   image — the image file
 *
 * Returns:
 *   { success, metadata: { width, height, format, size, aspectRatio, orientation } }
 *
 * Phase 2: This route could be extended to:
 *   - Store the image in Supabase Storage with a signed upload URL
 *   - Return an upload token for subsequent /api/ai/analyze calls
 *   - Support HEIC by converting via Sharp before validation
 */

import type { NextRequest } from "next/server"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/* HEIC is listed here for future readiness — Sharp can handle it with heif-convert */
const HEIC_TYPES    = new Set(["image/heic", "image/heif"])

const uploadLimiter = makeRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 })

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  if (uploadLimiter.check(ip)) {
    return Response.json({ success: false, error: "Too many uploads. Please wait." }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 })
  }

  const imageField = formData.get("image")
  if (!imageField || typeof imageField === "string") {
    return Response.json({ success: false, error: "No image file was provided." }, { status: 400 })
  }

  const imageFile = imageField as File

  /* HEIC future-readiness */
  if (HEIC_TYPES.has(imageFile.type)) {
    return Response.json({
      success: false,
      error:   "HEIC format coming soon. Please convert to JPEG or PNG first.",
      code:    "HEIC_NOT_YET",
    }, { status: 415 })
  }

  if (!ALLOWED_TYPES.has(imageFile.type)) {
    return Response.json({
      success: false,
      error:   `Unsupported file type. Please upload a JPEG, PNG, or WebP image.`,
      code:    "INVALID_FILE",
    }, { status: 415 })
  }

  if (imageFile.size > MAX_FILE_SIZE) {
    return Response.json({
      success: false,
      error:   `File is too large (${(imageFile.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`,
      code:    "FILE_TOO_LARGE",
    }, { status: 413 })
  }

  /* Validate and read metadata via Sharp */
  const arrayBuffer = await imageFile.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  let meta: { width?: number; height?: number; format?: string }
  try {
    const sharp = (await import("sharp")).default
    meta        = await sharp(buffer).metadata()
  } catch {
    return Response.json({
      success: false,
      error:   "File could not be read as a valid image.",
      code:    "CORRUPT_FILE",
    }, { status: 422 })
  }

  const w   = meta.width  ?? 0
  const h   = meta.height ?? 0
  const ratio = h > 0 ? w / h : 1.333

  const orientation = Math.abs(ratio - 1) < 0.05
    ? "square"
    : ratio < 1 ? "portrait" : "landscape"

  return Response.json({
    success: true,
    metadata: {
      width:       meta.width,
      height:      meta.height,
      format:      meta.format ?? imageFile.type.split("/")[1],
      size:        imageFile.size,
      sizeKb:      Math.round(imageFile.size / 1024),
      orientation,
      megapixels:  Math.round((w * h) / 1_000_000 * 10) / 10,
    },
  })
}

/**
 * src/lib/admin/validation.ts
 *
 * ONE shared validation module for every admin module (Presets, Bundles,
 * Media Library, and every future CMS module — Courses, Blog, etc.).
 *
 * Built on zod (already a project dependency). Client components use these
 * schemas to validate before submit; API routes use the SAME schemas to
 * validate on the server — one source of truth, matching the project's
 * existing "no duplicated logic" convention.
 *
 * Usage:
 *   const result = slugSchema.safeParse(value)
 *   if (!result.success) setError(result.error.issues[0].message)
 */

import { z } from "zod"

/* ── Primitive field schemas — reused across every module ─────────────── */

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters.")
  .max(160, "Slug must be 160 characters or fewer.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only.")

export const titleSchema = z
  .string()
  .trim()
  .min(2, "Title must be at least 2 characters.")
  .max(200, "Title must be 200 characters or fewer.")

export const priceSchema = z
  .number()
  .min(0, "Price cannot be negative.")
  .max(100_000, "Price must be 100,000 or less.")

export const currencySchema = z.enum(["USD", "INR", "EUR", "GBP"])

export const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^https?:\/\/.+/.test(v) || v.startsWith("/"),
    "Must be a valid URL or site-relative path."
  )

export const urlSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/.+/.test(v), "Must be a valid URL starting with http(s)://.")

export const emailSchema = z.string().trim().toLowerCase().email("Must be a valid email address.")

export const seoTitleSchema = z.string().trim().max(70, "SEO title should be 70 characters or fewer.")
export const seoDescriptionSchema = z.string().trim().max(160, "SEO description should be 160 characters or fewer.")

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color, e.g. #FFD60A.")

/* ── Upload validation ──────────────────────────────────────────────────
   Mirrors what the server enforces in the media upload API route, so the
   client can reject bad files before spending a round trip. ── */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"] as const
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf"] as const

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024   // 15 MB
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024  // 500 MB
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024 // 50 MB

export interface UploadValidationResult {
  ok: boolean
  error?: string
}

/** Validate a File/Blob-like object before or during upload. */
export function validateUpload(file: { type: string; size: number; name: string }): UploadValidationResult {
  const isImage = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)
  const isVideo = (ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)
  const isDoc   = (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)

  if (!isImage && !isVideo && !isDoc) {
    return { ok: false, error: `Unsupported file type: ${file.type || "unknown"}.` }
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` }
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: `Video must be under ${MAX_VIDEO_BYTES / 1024 / 1024}MB.` }
  }
  if (isDoc && file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: `Document must be under ${MAX_DOCUMENT_BYTES / 1024 / 1024}MB.` }
  }
  if (!file.name || file.name.length > 255) {
    return { ok: false, error: "File name is missing or too long." }
  }
  return { ok: true }
}

/* ── Publish-readiness ──────────────────────────────────────────────────
   Generic "is this record allowed to go live" check — every module (a
   preset, a course, a blog post) can define which fields are required to
   publish and reuse this evaluator instead of hand-rolling one each time. ── */

export interface PublishRequirement {
  field: string
  label: string
  present: boolean
}

export interface PublishReadiness {
  ready: boolean
  missing: string[]
}

/** Evaluate publish-readiness from a list of {field,label,present} checks. */
export function evaluatePublishReadiness(requirements: PublishRequirement[]): PublishReadiness {
  const missing = requirements.filter((r) => !r.present).map((r) => r.label)
  return { ready: missing.length === 0, missing }
}

/* ── Slugify helper (used by admin forms to auto-derive a slug from a title) ── */

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
}

/* ── Generic form-error shape shared by every admin form ── */

export type FieldErrors = Record<string, string>

/** Run a zod object schema and return a flat {fieldName: message} map. */
export function collectFieldErrors<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): FieldErrors {
  const result = schema.safeParse(data)
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form"
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

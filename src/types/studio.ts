/**
 * src/types/studio.ts
 *
 * All TypeScript interfaces for the PXL Creator AI Studio feature.
 * These types are shared across:
 *   - API route  (src/app/api/studio/process/route.ts)
 *   - AI library (src/lib/ai/analyze.ts)
 *   - Processor  (src/lib/studio/process.ts)
 *   - Recommender(src/lib/studio/recommend.ts)
 *   - UI         (src/components/studio/*)
 *
 * Keeping them in one file means a change to any data shape surfaces
 * as a compile error everywhere it's used — no silent mismatches.
 */

import type { Preset, PresetCategory } from "@/types/product"
import type { ImageAnalysisResult }    from "@/types/ai"

/* ─────────────────────────────────────────────────────────────────
   IMAGE ADJUSTMENTS
   Numeric parameters returned by OpenAI and consumed by Sharp.
   All values are multiplicative/additive relative to "no change".
───────────────────────────────────────────────────────────────── */
export interface ImageAdjustments {
  /** Luminance multiplier. 1.0 = unchanged. Range: 0.6 – 1.6 */
  brightness: number
  /** Contrast multiplier fed into Sharp's .linear(). 1.0 = unchanged. Range: 0.6 – 1.8 */
  contrast: number
  /** Saturation multiplier. 1.0 = unchanged. Range: 0.0 – 2.0 */
  saturation: number
  /** Hue rotation in degrees. 0 = unchanged. Range: -60 – 60 */
  hue: number
  /** Gamma correction. 1.0 = unchanged. Range: 0.5 – 2.5 */
  gamma: number
  /** Red channel tint offset. 0 = unchanged. Range: -40 – 40 */
  tintR: number
  /** Green channel tint offset. 0 = unchanged. Range: -40 – 40 */
  tintG: number
  /** Blue channel tint offset. 0 = unchanged. Range: -40 – 40 */
  tintB: number
}

/* ─────────────────────────────────────────────────────────────────
   AI ANALYSIS
   The structured response parsed from OpenAI's output.
───────────────────────────────────────────────────────────────── */
export interface AIAnalysis {
  /** Short mood label, e.g. "Warm Cinematic" or "Cool Editorial" */
  mood: string
  /** 1–2 sentence human-readable description of the applied look */
  description: string
  /** The numeric parameters to pass to the Sharp pipeline */
  adjustments: ImageAdjustments
  /** Keywords OpenAI identified as matching this aesthetic — used for preset matching */
  presetKeywords: string[]
  /** 0–1 confidence score for how well the edit matched the prompt */
  confidence: number
}

/* ─────────────────────────────────────────────────────────────────
   PRESET RECOMMENDATION
   The best-matching preset returned by the recommender.
───────────────────────────────────────────────────────────────── */
export interface PresetRecommendation {
  presetId:   string
  presetName: string
  slug:       string
  tagline:    string
  price:      number
  category:   PresetCategory
  /** 0–1 match score (intersection of keywords / max possible) */
  confidence: number
  /** Human-readable reason, e.g. "Matches warm golden tones in your prompt" */
  reason:     string
  /**
   * Full Preset object fetched from the database after matching.
   * Optional — populated by the API route so the client never needs
   * to look up static data. Falls back gracefully when absent.
   */
  preset?: Preset
}

/* ─────────────────────────────────────────────────────────────────
   API RESPONSE
   Discriminated union — success vs error.
   The route always returns one of these two shapes.
───────────────────────────────────────────────────────────────── */
export interface StudioSuccessResponse {
  success: true
  /** Base64 data URI of the Sharp-processed image, e.g. "data:image/jpeg;base64,..." */
  processedImage: string
  /** Backward-compatible analysis shape */
  analysis: AIAnalysis
  /** Rich vision analysis — powers the premium AnalysisCard UI */
  imageAnalysis: ImageAnalysisResult
  recommendation: PresetRecommendation
  /** Server-side wall-clock time in milliseconds — useful for telemetry */
  processingMs: number
}

export type StudioErrorCode =
  | "INVALID_FILE"     // Wrong MIME type or corrupt image
  | "FILE_TOO_LARGE"   // Exceeds 10 MB limit
  | "PROMPT_MISSING"   // Empty prompt submitted
  | "AI_ERROR"         // OpenAI call failed or returned unparseable JSON
  | "PROCESS_ERROR"    // Sharp threw during image processing
  | "RATE_LIMITED"     // Too many requests from this IP
  | "SERVICE_DISABLED" // Admin has temporarily disabled AI Studio

export interface StudioErrorResponse {
  success: false
  error: string
  code: StudioErrorCode
}

export type StudioAPIResponse = StudioSuccessResponse | StudioErrorResponse

/* ─────────────────────────────────────────────────────────────────
   UI STATE MACHINE
   The StudioShell component cycles through these steps in order.
   Each step maps to a distinct UI panel.

   idle ──► ready ──► processing ──► done
                                 └──► error
───────────────────────────────────────────────────────────────── */
export type StudioStep =
  | "idle"        // Empty state — upload zone is the only visible element
  | "ready"       // Image selected + prompt entered, submit button active
  | "processing"  // API call in flight — cinematic loading overlay shown
  | "done"        // Result received — before/after + recommendation visible
  | "error"       // Request failed — error message + retry option shown

/* ─────────────────────────────────────────────────────────────────
   UI STATE SHAPE
   Held by StudioShell via useReducer.
───────────────────────────────────────────────────────────────── */
export interface StudioState {
  step: StudioStep
  /** The raw File object selected by the user */
  file: File | null
  /** Object URL created from the file for in-browser preview — revoke on cleanup */
  previewUrl: string | null
  /** The user's text prompt */
  prompt: string
  /** IDs of the AestheticChip items the user has toggled on */
  selectedAesthetics: string[]
  /** Populated when step === "done" */
  result: StudioSuccessResponse | null
  /** Populated when step === "error" */
  errorMessage: string | null
}

/* ─────────────────────────────────────────────────────────────────
   AESTHETIC CHIPS
   Quick-select vibe buttons shown below the prompt input.
   Each chip contributes its keywords to the AI analysis call.
───────────────────────────────────────────────────────────────── */
export interface AestheticChip {
  id: string
  label: string
  /** Emoji glyph shown next to the label */
  icon: string
  /** Appended to the prompt as context for OpenAI */
  keywords: string[]
}

/* ─────────────────────────────────────────────────────────────────
   PROCESSING STEPS (for the animated loading overlay)
   A sequence of labels displayed during the API call to give
   the impression of live progress.
───────────────────────────────────────────────────────────────── */
export interface ProcessingStep {
  id: string
  label: string
  /** Approximate time in ms after submit that this step becomes "active" */
  startsAt: number
}

/* ─────────────────────────────────────────────────────────────────
   API REQUEST PAYLOAD
   What the StudioShell sends to /api/studio/process.
   Sent as multipart/form-data (not JSON) because it includes a File.
   These are the field names the route.ts handler reads.
───────────────────────────────────────────────────────────────── */
export interface StudioFormFields {
  /** The image file — jpeg / png / webp, max 10 MB */
  image: File
  /** User's text prompt */
  prompt: string
  /** JSON-serialised string[] of aesthetic keyword arrays */
  aesthetics: string
}

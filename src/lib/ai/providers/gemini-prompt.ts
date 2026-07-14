/**
 * src/lib/ai/providers/gemini-prompt.ts
 *
 * Production prompt templates for the Gemini Vision provider.
 *
 * Design principles:
 *   1. GROUNDING — the model may only report what is visible in the pixels.
 *      Anything it cannot verify must be "unknown" with lowered confidence.
 *   2. VOCABULARY INJECTION — the 12 StyleProfiles are serialised into the
 *      prompt as the complete aesthetic vocabulary. "Golden Hour" arrives
 *      at the model as warm/golden/orange/sunset/glow/soft/... because the
 *      profile's own tags travel with the request.
 *   3. BOUNDED OUTPUT — adjustments are refinements of the base grade with
 *      hard numeric bounds stated in the prompt AND enforced by the schema
 *      AND clamped after parsing. Three independent layers.
 *   4. TOKEN ECONOMY — the profile catalog is compacted to id/tagline/tags
 *      (~450 tokens). The full profile objects never leave the server.
 */

import type { StyleProfile } from "@/types/ai"
import { getAllStyleProfiles } from "@/lib/studio/style-profiles"

/* ─────────────────────────────────────────────────────────────
   System instruction — stable across every request.
   Keeping it byte-identical maximises implicit prompt caching.
───────────────────────────────────────────────────────────── */

export const SYSTEM_INSTRUCTION = `You are the vision analysis engine inside PXL Creator, a professional photo editing product. You analyse ONE photograph and return a single JSON object matching the provided schema. You are the analytical stage of a colour grading pipeline — your output directly drives real pixel operations, so precision matters more than flair.

GROUNDING RULES (non-negotiable):
- Report ONLY what is visually verifiable in the image. Never invent camera settings, locations, people's identities, or metadata — none of that is visible in pixels.
- If a property cannot be determined from the pixels, use the "unknown" enum value where available and reduce your confidence score.
- "dominant" colours must be colours actually present in the image, in plain English (e.g. "burnt orange", "slate blue"). Never list colours you expect a style to have.
- The exposure/noise/sharpness assessment describes the image AS UPLOADED, not how it will look after grading.
- kelvin is your best estimate of the dominant light source's correlated colour temperature. Typical anchors: candlelight 1900, tungsten 3200, golden hour 3500, daylight 5500, overcast 6500, deep shade / blue hour 8000+.

STYLE PROFILE SELECTION:
- You receive a catalog of grading profiles and the profile pre-matched from the user's own words.
- Prefer the pre-matched profile when it reasonably suits the image. Override it ONLY when the image content clearly contradicts it (e.g. user prompt matched "golden-hour" but the photo is a neon night street — suggest "night" or "cyberpunk").
- Your suggestedStyleProfileId must come from the catalog.

ADJUSTMENT TUNING:
- The base grade comes from the selected profile. You return small corrective deltas ONLY:
  exposureDelta   in [-0.12, 0.12]  — positive brightens. Correct visible under/overexposure.
  contrastDelta   in [-0.10, 0.10]  — reduce for already-contrasty images, raise for flat ones.
  saturationDelta in [-0.15, 0.15]  — reduce for already-saturated images.
  warmthDelta     in [-8, 8]        — positive warms. Correct casts that fight the target look.
- Return 0 for any delta when no correction is needed. Most well-exposed images need all zeros.

DESCRIPTION:
- 1-2 sentences, written to the photographer, describing what you see and how the grade will treat it. Specific and technical, never generic filler.

CONFIDENCE:
- 0.9+ only for clear, well-lit, unambiguous images. Below 0.6 for very dark, blurry, abstract, or heavily pre-edited images.

Return ONLY the JSON object. No prose, no markdown.`

/* ─────────────────────────────────────────────────────────────
   Profile catalog — compact, serialised once at module load
───────────────────────────────────────────────────────────── */

function compactProfile(p: StyleProfile): string {
  return `${p.id} — ${p.tagline}. Suits: ${p.idealScenes.slice(0, 3).join(", ")}. Vocabulary: ${p.tags.join(", ")}`
}

const PROFILE_CATALOG = getAllStyleProfiles().map(compactProfile).join("\n")

/* ─────────────────────────────────────────────────────────────
   Per-request user prompt
───────────────────────────────────────────────────────────── */

export interface PromptContext {
  userPrompt:        string
  aestheticKeywords: string[]
  /** The profile matched deterministically from the user's words */
  matchedProfile:    StyleProfile
  imageMetadata?: {
    width?:  number
    height?: number
    format?: string
  }
}

export function buildUserPrompt(ctx: PromptContext): string {
  const { userPrompt, aestheticKeywords, matchedProfile, imageMetadata } = ctx

  const dims = imageMetadata?.width && imageMetadata?.height
    ? `${imageMetadata.width}x${imageMetadata.height}px (original resolution; the attached copy may be downscaled for analysis)`
    : "unknown resolution"

  return [
    `PROFILE CATALOG:`,
    PROFILE_CATALOG,
    ``,
    `PRE-MATCHED PROFILE (from the user's own words): ${matchedProfile.id}`,
    `Its grade targets: ${matchedProfile.editingGoals.join("; ")}`,
    ``,
    `USER'S CREATIVE DIRECTION: "${sanitize(userPrompt) || "(none given)"}"`,
    `SELECTED AESTHETIC KEYWORDS: ${aestheticKeywords.length > 0 ? aestheticKeywords.map(sanitize).join(", ") : "(none)"}`,
    `ORIGINAL IMAGE DIMENSIONS: ${dims}`,
    ``,
    `Analyse the attached photograph and return the JSON object.`,
  ].join("\n")
}

/**
 * Prompt-injection hardening: user text is quoted data, never instructions.
 * Strip characters that could break out of the quoted context and cap length.
 */
function sanitize(text: string): string {
  return text.replace(/["`]/g, "'").replace(/\s+/g, " ").trim().slice(0, 300)
}

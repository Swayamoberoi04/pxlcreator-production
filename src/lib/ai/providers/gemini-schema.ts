/**
 * src/lib/ai/providers/gemini-schema.ts
 *
 * The contract between Gemini Vision and our type system.
 *
 * Two layers of enforcement:
 *   1. RESPONSE_JSON_SCHEMA  — sent WITH the request (response_format.schema).
 *      Gemini's constrained decoding guarantees the output parses as JSON
 *      matching this shape. Enums are enforced at generation time.
 *   2. geminiResponseSchema  — Zod validation applied AFTER the response.
 *      Defense-in-depth: every enum falls back to a safe default, every
 *      number is clamped to its legal range. A malformed field can never
 *      reach the Sharp pipeline or the UI.
 *
 * The model is never asked for anything it cannot see:
 *   - No EXIF / camera metadata (not visible in pixels)
 *   - No GPS or identity claims
 *   - Adjustment output is a bounded REFINEMENT of the StyleProfile grade,
 *     not a free-form invention.
 */

import { z } from "zod"

/* ─────────────────────────────────────────────────────────────
   Enum vocabularies — must mirror src/types/ai.ts exactly
───────────────────────────────────────────────────────────── */

export const SCENE_TYPES = [
  "landscape", "portrait", "street", "architecture", "macro", "wildlife",
  "travel", "product", "abstract", "interior", "event", "night",
  "underwater", "aerial", "unknown",
] as const

export const TIMES_OF_DAY = [
  "golden hour", "blue hour", "midday", "overcast", "night",
  "sunrise", "sunset", "dusk", "unknown",
] as const

export const WEATHER_TYPES = [
  "clear", "cloudy", "overcast", "foggy", "rainy", "snowy", "hazy", "stormy", "unknown",
] as const

export const LIGHTING_QUALITIES = [
  "soft diffused", "harsh directional", "warm directional", "cool diffused",
  "backlit", "silhouette", "dramatic", "flat", "mixed", "unknown",
] as const

export const COLOR_TEMPERATURES = ["very warm", "warm", "neutral", "cool", "very cool"] as const

export const MOOD_PRIMARIES = [
  "romantic", "melancholic", "dramatic", "peaceful", "energetic",
  "mysterious", "nostalgic", "luxurious", "raw", "playful", "eerie", "serene",
] as const

export const STYLE_PROFILE_IDS = [
  "cinematic", "golden-hour", "moody", "film", "portrait", "street",
  "travel", "luxury", "night", "cyberpunk", "anime", "vintage",
] as const

/* ─────────────────────────────────────────────────────────────
   Adjustment tuning bounds
   Gemini refines the StyleProfile grade — it does not replace it.
   These deltas are applied ON TOP of profile.defaultAdjustments
   and clamped server-side regardless of what the model returns.
───────────────────────────────────────────────────────────── */

export const TUNING_BOUNDS = {
  exposureDelta:   { min: -0.12, max: 0.12 },  // added to brightness multiplier
  contrastDelta:   { min: -0.10, max: 0.10 },  // added to contrast multiplier
  saturationDelta: { min: -0.15, max: 0.15 },  // added to saturation multiplier
  warmthDelta:     { min: -8,    max: 8    },  // added to tintR, subtracted from tintB
} as const

/* Absolute safety rails for the final merged adjustments */
export const ADJUSTMENT_RAILS = {
  brightness: { min: 0.70, max: 1.40 },
  contrast:   { min: 0.70, max: 1.55 },
  saturation: { min: 0.30, max: 1.70 },
  hue:        { min: -30,  max: 30   },
  gamma:      { min: 0.70, max: 1.40 },
  tint:       { min: -30,  max: 30   },
} as const

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/* ─────────────────────────────────────────────────────────────
   JSON Schema — sent with the request (constrained decoding)
───────────────────────────────────────────────────────────── */

export const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    scene: {
      type: "object",
      properties: {
        type:           { type: "string", enum: [...SCENE_TYPES] },
        timeOfDay:      { type: "string", enum: [...TIMES_OF_DAY] },
        weather:        { type: "string", enum: [...WEATHER_TYPES] },
        setting:        { type: "string", enum: ["indoor", "outdoor", "unknown"] },
        subjectPresent: { type: "boolean" },
        subjectType:    { type: "string", enum: ["person", "animal", "object", "landscape", "none", "mixed"] },
      },
      required: ["type", "timeOfDay", "weather", "setting", "subjectPresent", "subjectType"],
    },
    lighting: {
      type: "object",
      properties: {
        quality:              { type: "string", enum: [...LIGHTING_QUALITIES] },
        direction:            { type: "string", enum: ["front", "side", "back", "overhead", "mixed", "unknown"] },
        intensity:            { type: "string", enum: ["low", "medium", "high"] },
        colorTemperature:     { type: "string", enum: [...COLOR_TEMPERATURES] },
        kelvin:               { type: "number", description: "Estimated correlated colour temperature of the dominant light, 2000-12000" },
        hasHighlightClipping: { type: "boolean" },
        hasShadowCrush:       { type: "boolean" },
      },
      required: ["quality", "direction", "intensity", "colorTemperature", "kelvin", "hasHighlightClipping", "hasShadowCrush"],
    },
    colors: {
      type: "object",
      properties: {
        dominant:         { type: "array", items: { type: "string" }, description: "3-5 plain-English colour names actually visible in the image" },
        colorTemperature: { type: "string", enum: [...COLOR_TEMPERATURES] },
        saturationLevel:  { type: "string", enum: ["desaturated", "muted", "natural", "vibrant", "hypersaturated"] },
        contrastLevel:    { type: "string", enum: ["flat", "low", "medium", "high", "dramatic"] },
      },
      required: ["dominant", "colorTemperature", "saturationLevel", "contrastLevel"],
    },
    subject: {
      type: "object",
      properties: {
        present:        { type: "boolean" },
        type:           { type: "string", enum: ["person", "animal", "object", "landscape", "none", "mixed"] },
        frameFill:      { type: "number", description: "Proportion of frame occupied by the main subject, 0-1" },
        focusSharpness: { type: "string", enum: ["soft", "medium", "sharp"] },
        hasSkinTones:   { type: "boolean" },
      },
      required: ["present", "type", "frameFill", "focusSharpness", "hasSkinTones"],
    },
    mood: {
      type: "object",
      properties: {
        primary:    { type: "string", enum: [...MOOD_PRIMARIES] },
        secondary:  { type: "string", enum: [...MOOD_PRIMARIES, "none"] },
        energy:     { type: "string", enum: ["low", "medium", "high"] },
        adjectives: { type: "array", items: { type: "string" }, description: "3-6 adjectives describing the visual feel" },
      },
      required: ["primary", "secondary", "energy", "adjectives"],
    },
    composition: {
      type: "object",
      properties: {
        leadingLines: { type: "boolean" },
        ruleOfThirds: { type: "boolean" },
        symmetry:     { type: "boolean" },
        depth:        { type: "string", enum: ["shallow", "medium", "deep"] },
      },
      required: ["leadingLines", "ruleOfThirds", "symmetry", "depth"],
    },
    quality: {
      type: "object",
      properties: {
        overall:   { type: "number", description: "Overall technical + aesthetic quality, 0-1" },
        sharpness: { type: "string", enum: ["low", "medium", "high"] },
        noise:     { type: "string", enum: ["low", "medium", "high"] },
        exposure:  { type: "string", enum: ["underexposed", "well-exposed", "overexposed"] },
        detail:    { type: "number", description: "Detail retention estimate, 0-1" },
      },
      required: ["overall", "sharpness", "noise", "exposure", "detail"],
    },
    suggestedStyleProfileId: {
      type: "string",
      enum: [...STYLE_PROFILE_IDS],
      description: "The catalog profile that best suits THIS image and the user's intent",
    },
    adjustmentTuning: {
      type: "object",
      description: "Small refinements to the base grade, derived from what you actually observe (e.g. underexposure -> positive exposureDelta). Use 0 when no correction is needed.",
      properties: {
        exposureDelta:   { type: "number", description: "-0.12 to 0.12" },
        contrastDelta:   { type: "number", description: "-0.10 to 0.10" },
        saturationDelta: { type: "number", description: "-0.15 to 0.15" },
        warmthDelta:     { type: "number", description: "-8 to 8" },
      },
      required: ["exposureDelta", "contrastDelta", "saturationDelta", "warmthDelta"],
    },
    presetKeywords: {
      type: "array",
      items: { type: "string" },
      description: "4-8 lowercase style keywords for preset matching, e.g. warm, cinematic, teal, moody",
    },
    description: {
      type: "string",
      description: "1-2 sentences describing the image and how the grade will treat it. Written for the photographer.",
    },
    confidence: {
      type: "number",
      description: "Your confidence in this analysis, 0-1. Lower it when the image is ambiguous, low-res, or heavily edited already.",
    },
  },
  required: [
    "scene", "lighting", "colors", "subject", "mood", "composition",
    "quality", "suggestedStyleProfileId", "adjustmentTuning",
    "presetKeywords", "description", "confidence",
  ],
} as const

/* ─────────────────────────────────────────────────────────────
   Zod validation layer — post-response defense
   .catch() = safe default when the field is invalid
   .transform(clamp) = out-of-range numbers are clamped, not rejected
───────────────────────────────────────────────────────────── */

const clamped = (min: number, max: number, fallback: number) =>
  z.number().catch(fallback).transform((v) => clamp(v, min, max))

export const geminiResponseSchema = z.object({
  scene: z.object({
    type:           z.enum(SCENE_TYPES).catch("unknown"),
    timeOfDay:      z.enum(TIMES_OF_DAY).catch("unknown"),
    weather:        z.enum(WEATHER_TYPES).catch("unknown"),
    setting:        z.enum(["indoor", "outdoor", "unknown"]).catch("unknown"),
    subjectPresent: z.boolean().catch(false),
    subjectType:    z.enum(["person", "animal", "object", "landscape", "none", "mixed"]).catch("none"),
  }),
  lighting: z.object({
    quality:              z.enum(LIGHTING_QUALITIES).catch("unknown"),
    direction:            z.enum(["front", "side", "back", "overhead", "mixed", "unknown"]).catch("unknown"),
    intensity:            z.enum(["low", "medium", "high"]).catch("medium"),
    colorTemperature:     z.enum(COLOR_TEMPERATURES).catch("neutral"),
    kelvin:               clamped(2000, 12000, 5500),
    hasHighlightClipping: z.boolean().catch(false),
    hasShadowCrush:       z.boolean().catch(false),
  }),
  colors: z.object({
    dominant:         z.array(z.string().max(40)).max(5).catch([]),
    colorTemperature: z.enum(COLOR_TEMPERATURES).catch("neutral"),
    saturationLevel:  z.enum(["desaturated", "muted", "natural", "vibrant", "hypersaturated"]).catch("natural"),
    contrastLevel:    z.enum(["flat", "low", "medium", "high", "dramatic"]).catch("medium"),
  }),
  subject: z.object({
    present:        z.boolean().catch(false),
    type:           z.enum(["person", "animal", "object", "landscape", "none", "mixed"]).catch("none"),
    frameFill:      clamped(0, 1, 0.4),
    focusSharpness: z.enum(["soft", "medium", "sharp"]).catch("medium"),
    hasSkinTones:   z.boolean().catch(false),
  }),
  mood: z.object({
    primary:    z.enum(MOOD_PRIMARIES).catch("serene"),
    secondary:  z.enum([...MOOD_PRIMARIES, "none"]).catch("none"),
    energy:     z.enum(["low", "medium", "high"]).catch("medium"),
    adjectives: z.array(z.string().max(30)).max(6).catch([]),
  }),
  composition: z.object({
    leadingLines: z.boolean().catch(false),
    ruleOfThirds: z.boolean().catch(false),
    symmetry:     z.boolean().catch(false),
    depth:        z.enum(["shallow", "medium", "deep"]).catch("medium"),
  }),
  quality: z.object({
    overall:   clamped(0, 1, 0.7),
    sharpness: z.enum(["low", "medium", "high"]).catch("medium"),
    noise:     z.enum(["low", "medium", "high"]).catch("low"),
    exposure:  z.enum(["underexposed", "well-exposed", "overexposed"]).catch("well-exposed"),
    detail:    clamped(0, 1, 0.7),
  }),
  suggestedStyleProfileId: z.enum(STYLE_PROFILE_IDS).catch("cinematic"),
  adjustmentTuning: z.object({
    exposureDelta:   clamped(TUNING_BOUNDS.exposureDelta.min,   TUNING_BOUNDS.exposureDelta.max,   0),
    contrastDelta:   clamped(TUNING_BOUNDS.contrastDelta.min,   TUNING_BOUNDS.contrastDelta.max,   0),
    saturationDelta: clamped(TUNING_BOUNDS.saturationDelta.min, TUNING_BOUNDS.saturationDelta.max, 0),
    warmthDelta:     clamped(TUNING_BOUNDS.warmthDelta.min,     TUNING_BOUNDS.warmthDelta.max,     0),
  }),
  presetKeywords: z.array(z.string().max(30)).max(10).catch([]),
  description:    z.string().max(600).catch(""),
  confidence:     clamped(0, 1, 0.5),
})

export type GeminiVisionResponse = z.infer<typeof geminiResponseSchema>

/**
 * Parses and validates the raw model output.
 * Throws GeminiParseError only when the payload is not JSON at all or the
 * top-level shape is missing — individual bad fields degrade to defaults.
 */
export function parseGeminiResponse(rawText: string): GeminiVisionResponse {
  let json: unknown
  try {
    /* Strip accidental markdown fences — belt-and-braces, JSON mode should prevent this */
    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    json = JSON.parse(cleaned)
  } catch {
    throw new GeminiParseError("Model output was not valid JSON")
  }

  const result = geminiResponseSchema.safeParse(json)
  if (!result.success) {
    throw new GeminiParseError(`Model output failed schema validation: ${result.error.issues[0]?.path.join(".")}`)
  }
  return result.data
}

export class GeminiParseError extends Error {
  readonly name = "GeminiParseError"
}

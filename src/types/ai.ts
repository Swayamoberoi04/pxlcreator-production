/**
 * src/types/ai.ts
 *
 * Production-ready type system for the PXL Creator AI Vision layer.
 *
 * These interfaces define the full contract between every module:
 *   AIProvider  →  ImageAnalysisResult
 *   StyleProfile → analysisTemplate + defaultAdjustments
 *   PresetMatchingEngine → RecommendationResult
 *   UI components → display-ready data
 *
 * Phase 2 integration: AIProvider.analyzeImage() returns ImageAnalysisResult.
 * Gemini Vision / GPT-4o Vision populates these fields from actual image analysis.
 * StubProvider (Phase 1) populates them from StyleProfile metadata + real image metadata.
 */

/* ═══════════════════════════════════════════════════════════════
   SCENE ANALYSIS
═══════════════════════════════════════════════════════════════ */

export type SceneType =
  | "landscape"    | "portrait"     | "street"       | "architecture"
  | "macro"        | "wildlife"     | "travel"       | "product"
  | "abstract"     | "interior"     | "event"        | "night"
  | "underwater"   | "aerial"       | "unknown"

export type TimeOfDay =
  | "golden hour"  | "blue hour"   | "midday"
  | "overcast"     | "night"       | "sunrise"
  | "sunset"       | "dusk"        | "unknown"

export type Weather =
  | "clear" | "cloudy" | "overcast" | "foggy"
  | "rainy" | "snowy"  | "hazy"     | "stormy" | "unknown"

export interface SceneAnalysis {
  type:           SceneType
  timeOfDay:      TimeOfDay
  weather:        Weather
  setting:        "indoor" | "outdoor" | "unknown"
  subjectPresent: boolean
  subjectType:    "person" | "animal" | "object" | "landscape" | "none" | "mixed"
}

/* ═══════════════════════════════════════════════════════════════
   LIGHTING ANALYSIS
═══════════════════════════════════════════════════════════════ */

export type LightingQuality =
  | "soft diffused"       | "harsh directional"  | "warm directional"
  | "cool diffused"       | "backlit"            | "silhouette"
  | "dramatic"            | "flat"               | "mixed" | "unknown"

export type ColorTemperature = "very warm" | "warm" | "neutral" | "cool" | "very cool"

export interface LightingAnalysis {
  quality:              LightingQuality
  direction:            "front" | "side" | "back" | "overhead" | "mixed" | "unknown"
  intensity:            "low" | "medium" | "high"
  colorTemperature:     ColorTemperature
  /** Approximate Kelvin value — e.g. 3200 (candlelight) to 10000 (blue sky) */
  kelvin:               number
  hasHighlightClipping: boolean
  hasShadowCrush:       boolean
}

/* ═══════════════════════════════════════════════════════════════
   COLOR ANALYSIS
═══════════════════════════════════════════════════════════════ */

export interface ColorAnalysis {
  /** 3–5 dominant color names */
  dominant:         string[]
  /** Hex palette (3–5 colors) — from style profile or extracted */
  palette:          string[]
  colorTemperature: ColorTemperature
  /** Grade name, e.g. "Orange-teal split tone" */
  grade:            string
  saturationLevel:  "desaturated" | "muted" | "natural" | "vibrant" | "hypersaturated"
  contrastLevel:    "flat" | "low" | "medium" | "high" | "dramatic"
}

/* ═══════════════════════════════════════════════════════════════
   SUBJECT ANALYSIS
═══════════════════════════════════════════════════════════════ */

export interface SubjectAnalysis {
  present:        boolean
  type:           "person" | "animal" | "object" | "landscape" | "none" | "mixed"
  /** Approximate proportion of frame occupied: 0–1 */
  frameFill:      number
  focusSharpness: "soft" | "medium" | "sharp"
  /** Detected skin tones — determines portrait-specific adjustments */
  hasSkinTones:   boolean
}

/* ═══════════════════════════════════════════════════════════════
   MOOD ANALYSIS
═══════════════════════════════════════════════════════════════ */

export type MoodPrimary =
  | "romantic"   | "melancholic" | "dramatic"  | "peaceful"
  | "energetic"  | "mysterious"  | "nostalgic" | "luxurious"
  | "raw"        | "playful"     | "eerie"     | "serene"

export interface MoodAnalysis {
  primary:    MoodPrimary
  secondary:  MoodPrimary | null
  energy:     "low" | "medium" | "high"
  /** 3–6 descriptive adjectives for the overall look */
  adjectives: string[]
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSITION ANALYSIS
═══════════════════════════════════════════════════════════════ */

export interface CompositionAnalysis {
  orientation:    "portrait" | "landscape" | "square"
  /** e.g. "16:9", "4:3", "3:2" */
  aspectRatio:    string
  leadingLines:   boolean
  ruleOfThirds:   boolean
  symmetry:       boolean
  depth:          "shallow" | "medium" | "deep"
}

/* ═══════════════════════════════════════════════════════════════
   QUALITY SCORE
═══════════════════════════════════════════════════════════════ */

export interface QualityScore {
  /** 0–1 overall quality estimate */
  overall:    number
  sharpness:  "low" | "medium" | "high"
  noise:      "low" | "medium" | "high"
  exposure:   "underexposed" | "well-exposed" | "overexposed"
  /** 0–1 detail retention score */
  detail:     number
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE ADJUSTMENTS
   Matches the existing ImageAdjustments type in studio.ts.
   Kept here so ai.ts has no dependency on studio.ts.
═══════════════════════════════════════════════════════════════ */

export interface AIAdjustments {
  brightness: number   // multiplier, 1.0 = unchanged
  contrast:   number   // multiplier, 1.0 = unchanged
  saturation: number   // multiplier, 1.0 = unchanged
  hue:        number   // rotation in degrees, 0 = unchanged
  gamma:      number   // correction, 1.0 = unchanged
  tintR:      number   // red channel offset, 0 = unchanged
  tintG:      number   // green channel offset
  tintB:      number   // blue channel offset
}

/* ═══════════════════════════════════════════════════════════════
   FULL IMAGE ANALYSIS RESULT
   Returned by every AIProvider implementation.
═══════════════════════════════════════════════════════════════ */

export interface ImageAnalysisResult {
  /** Unique analysis session ID (UUID or timestamp-based) */
  analysisId:     string
  /** ISO-8601 timestamp */
  analysedAt:     string
  /** Which StyleProfile was applied */
  styleProfileId: StyleProfileId
  /** Which provider performed the analysis */
  providerId:     AIProviderId
  /** Structured scene understanding */
  scene:          SceneAnalysis
  /** Lighting characteristics */
  lighting:       LightingAnalysis
  /** Color palette and grade */
  colors:         ColorAnalysis
  /** Subject in the frame */
  subject:        SubjectAnalysis
  /** Emotional tone */
  mood:           MoodAnalysis
  /** Framing and composition */
  composition:    CompositionAnalysis
  /** Technical image quality */
  quality:        QualityScore
  /** Keywords fed into the preset matching engine */
  presetKeywords: string[]
  /** The actual Sharp adjustments to apply */
  adjustments:    AIAdjustments
  /** Human-readable summary of the applied grade */
  description:    string
  /** 0–1 overall confidence in this analysis */
  confidence:     number
  /** Wall-clock time for the analysis step in ms */
  processingMs:   number
}

/* ═══════════════════════════════════════════════════════════════
   STYLE PROFILES
═══════════════════════════════════════════════════════════════ */

export type StyleProfileId =
  | "cinematic"
  | "golden-hour"
  | "moody"
  | "film"
  | "portrait"
  | "street"
  | "travel"
  | "luxury"
  | "night"
  | "cyberpunk"
  | "anime"
  | "vintage"

export interface StyleProfile {
  id:           StyleProfileId
  name:         string
  emoji:        string
  tagline:      string
  description:  string
  /** 3–5 hex colors representing the visual palette */
  colorPalette: string[]
  /** Human-readable lighting description */
  lighting:     string
  mood:         string
  colors:       string
  contrast:     string
  tone:         string
  /** Ideal use-case scenes */
  idealScenes:  string[]
  /** What the grade is designed to achieve */
  editingGoals: string[]
  /** Keyword tags used for preset matching */
  tags:         string[]
  /** Sharp pipeline parameters */
  defaultAdjustments: AIAdjustments
  /** Template analysis fields for the stub provider */
  analysisTemplate: {
    lighting:     Pick<LightingAnalysis, "quality" | "colorTemperature" | "kelvin" | "intensity">
    colors:       Pick<ColorAnalysis, "dominant" | "palette" | "grade" | "saturationLevel" | "contrastLevel" | "colorTemperature">
    mood:         Pick<MoodAnalysis, "primary" | "secondary" | "energy" | "adjectives">
    scene:        Pick<SceneAnalysis, "timeOfDay" | "weather">
    quality:      Pick<QualityScore, "sharpness" | "noise" | "exposure">
  }
}

/* ═══════════════════════════════════════════════════════════════
   AI PROVIDER INTERFACE
═══════════════════════════════════════════════════════════════ */

export type AIProviderId =
  | "stub"
  | "gemini-vision"
  | "openai-gpt4v"
  | "custom"

export interface AIAnalysisRequest {
  imageBuffer:       Buffer
  /** Optional pre-selected style profile — skips matching if provided */
  styleProfileId?:   StyleProfileId
  userPrompt:        string
  aestheticKeywords: string[]
  /** Pre-computed by Sharp in the route handler */
  imageMetadata?: {
    width?:   number
    height?:  number
    format?:  string
    /** File size in bytes */
    size?:    number
  }
}

/* ═══════════════════════════════════════════════════════════════
   PRESET MATCHING
═══════════════════════════════════════════════════════════════ */

export interface PresetMatch {
  presetId:    string
  presetSlug:  string
  presetName:  string
  /** 0–1 match score */
  score:       number
  matchedTags: string[]
  reason:      string
  /** Rank in the result list (1 = best) */
  rank:        number
}

export interface RecommendationResult {
  analysisId:  string
  matches:     PresetMatch[]
  topMatch:    PresetMatch
  explanation: string
  generatedAt: string
}

/* ═══════════════════════════════════════════════════════════════
   AI PROVIDER CONFIG
═══════════════════════════════════════════════════════════════ */

export interface AIProviderConfig {
  providerId: AIProviderId
  apiKey?:    string
  model?:     string
  options?:   Record<string, unknown>
}

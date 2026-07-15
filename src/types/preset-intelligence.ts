/**
 * src/types/preset-intelligence.ts
 *
 * Phase 3 — Preset Intelligence Engine type system.
 *
 * PresetIntelligence is the machine-readable "understanding" of one preset:
 * generated automatically from the preset's own catalogue data (never
 * hardcoded per preset), cached in the knowledge base, and compared
 * against ImageAnalysisResult by the scoring engine.
 *
 * Every field is embedding-friendly: flat strings, enums, and numeric
 * scores that can later be projected into a vector space without
 * changing this contract or any public API.
 */

import type { ColorTemperature } from "@/types/ai"

/* ═══════════════════════════════════════════════════════════════
   ATTRIBUTE VOCABULARIES
═══════════════════════════════════════════════════════════════ */

export type IntensityLevel   = "low" | "medium" | "high"
export type LevelTendency    = "reduced" | "neutral" | "boosted"
export type SettingAffinity  = "indoor" | "outdoor" | "both"
export type SkinCompat       = "excellent" | "good" | "neutral" | "not-recommended"
export type SeasonAffinity   = "spring" | "summer" | "autumn" | "winter" | "all-season"
export type DifficultyLevel  = "Beginner" | "Intermediate" | "Advanced"

/* ═══════════════════════════════════════════════════════════════
   SCENE AFFINITY SCORES
   0–1 per genre. Derived from category priors + tag evidence.
═══════════════════════════════════════════════════════════════ */

export interface SceneAffinityScores {
  cinematic:    number
  portrait:     number
  landscape:    number
  street:       number
  travel:       number
  fashion:      number
  food:         number
  car:          number
  architecture: number
}

/* ═══════════════════════════════════════════════════════════════
   PRESET INTELLIGENCE — the full knowledge-base entry
═══════════════════════════════════════════════════════════════ */

export interface PresetIntelligence {
  /* ── Identity ── */
  presetId:   string
  slug:       string
  name:       string
  category:   string

  /* ── Aesthetic character ── */
  mood:            string[]          // e.g. ["dramatic", "mysterious"]
  style:           string[]          // e.g. ["cinematic", "noir"]
  aestheticTags:   string[]          // free-form aesthetic vocabulary
  instagramTags:   string[]          // e.g. ["#moodygrams", "#streettones"]
  filmInspiration: string[]          // e.g. ["Blade Runner", "Kodak Portra"]

  /* ── Shooting conditions ── */
  lightingConditions: string[]       // e.g. ["golden hour", "harsh sun", "backlit"]
  timeOfDay:          string[]       // e.g. ["golden hour", "midday"]
  setting:            SettingAffinity
  season:             SeasonAffinity[]
  skinToneCompat:     SkinCompat

  /* ── Tonal character ── */
  whiteBalance:      ColorTemperature       // grade's colour lean
  contrastLevel:     IntensityLevel
  saturationLevel:   LevelTendency
  exposureTendency:  "lifts" | "neutral" | "darkens"
  highlightRecovery: IntensityLevel
  shadowDepth:       IntensityLevel         // how deep shadows are pushed
  blackLevel:        "lifted" | "neutral" | "crushed"

  /* ── Colour ── */
  dominantColors: string[]           // plain-English colour names
  colorPalette:   string[]           // hex swatches

  /* ── Genre affinity ── */
  sceneScores: SceneAffinityScores

  /* ── Practical guidance ── */
  recommendedCameras: string[]
  recommendedPhones:  string[]
  difficulty:         DifficultyLevel

  /* ── Relationships (computed lazily, never hardcoded) ── */
  similarPresets:       string[]     // slugs, most-similar first
  complementaryPresets: string[]     // slugs — different look, same shooting context

  /* ── Search / SEO ── */
  seoTags: string[]

  /* ── Embedding readiness ── */
  /** Flat descriptor string — feed to any embedding model later.
      The scoring engine today uses the structured fields; a vector
      engine can consume this text without any schema change. */
  embeddingText: string

  /** Knowledge-base bookkeeping */
  generatedAt: string
}

/* ═══════════════════════════════════════════════════════════════
   SCORING ENGINE
═══════════════════════════════════════════════════════════════ */

/** The 14 similarity dimensions and their weights. */
export interface ScoringWeights {
  lighting:       number
  colorPalette:   number
  scene:          number
  mood:           number
  composition:    number
  exposure:       number
  style:          number
  subject:        number
  whiteBalance:   number
  dominantColors: number
  contrast:       number
  saturation:     number
  tone:           number
  keywords:       number
}

export type ScoringDimension = keyof ScoringWeights

/** One dimension's contribution to a preset's score. */
export interface DimensionScore {
  dimension: ScoringDimension
  /** 0–1 raw similarity for this dimension */
  score:     number
  /** weighted contribution = score × weight */
  weighted:  number
  /** Human-readable evidence, present when this dimension matched meaningfully */
  reason?:   string
}

/* ═══════════════════════════════════════════════════════════════
   RECOMMENDATION OUTPUT
═══════════════════════════════════════════════════════════════ */

export interface RecommendationChips {
  lighting: string[]
  mood:     string[]
  color:    string[]
  scene:    string[]
}

export interface ScoredRecommendation {
  rank:        number
  presetId:    string
  slug:        string
  name:        string
  tagline:     string
  category:    string
  price:       number
  isFree:      boolean
  thumbnailUrl?: string
  rating?:       number
  reviewCount?:  number

  /** 0–1 weighted-similarity confidence */
  confidence:  number
  /** Why this preset was recommended — ordered, most decisive first */
  reasons:     string[]
  /** Attribute chips grouped for the UI */
  chips:       RecommendationChips
  /** Per-dimension breakdown for debugging / future tuning */
  dimensions:  DimensionScore[]
}

export interface RecommendationsV2Response {
  success:         true
  recommendations: ScoredRecommendation[]
  topMatch:        ScoredRecommendation | null
  /** Engine metadata */
  meta: {
    presetsEvaluated: number
    engineVersion:    string
    weights:          ScoringWeights
    processingMs:     number
    knowledgeBase:    { entries: number; builtAt: string; fromCache: boolean }
  }
}

/**
 * src/lib/ai/preset-intelligence/scoring.ts
 *
 * The weighted similarity engine — compares a Gemini ImageAnalysisResult
 * against every PresetIntelligence entry and ranks the catalogue.
 *
 * 14 dimensions, each scored 0–1 by its own comparator, combined as a
 * weighted average → confidence. Reasons are generated from the
 * top-contributing dimensions using the ACTUAL matched values, never
 * canned strings detached from evidence.
 *
 * Future-ready: rankPresets() is the single public entry point. A vector
 * embedding engine can replace the internals (compare embeddingText
 * vectors instead of structured fields) without changing this signature
 * or any public API.
 *
 * Performance: pure in-memory arithmetic. O(catalogue size) per request,
 * ~1–3µs per preset — thousands of presets stay well under the 150ms
 * latency budget.
 */

import type { ImageAnalysisResult } from "@/types/ai"
import type {
  PresetIntelligence,
  ScoringWeights,
  DimensionScore,
  RecommendationChips,
} from "@/types/preset-intelligence"
import type { KnowledgeBase } from "./knowledge-base"

/* ═══════════════════════════════════════════════════════════════
   WEIGHTS — sum is normalised automatically; relative size matters
═══════════════════════════════════════════════════════════════ */

export const DEFAULT_WEIGHTS: ScoringWeights = {
  lighting:       1.4,
  colorPalette:   1.1,
  scene:          1.5,
  mood:           1.3,
  composition:    0.5,
  exposure:       0.7,
  style:          1.0,
  subject:        1.0,
  whiteBalance:   0.9,
  dominantColors: 1.2,
  contrast:       0.6,
  saturation:     0.6,
  tone:           0.8,
  keywords:       1.2,
}

export interface RankedPreset {
  slug:       string
  confidence: number
  reasons:    string[]
  chips:      RecommendationChips
  dimensions: DimensionScore[]
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC ENTRY POINT
═══════════════════════════════════════════════════════════════ */

export function rankPresets(
  analysis: ImageAnalysisResult,
  kb:       KnowledgeBase,
  options:  { limit?: number; weights?: Partial<ScoringWeights> } = {}
): RankedPreset[] {
  const limit   = options.limit ?? 5
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights }
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0)

  const ranked: RankedPreset[] = []

  for (const [slug, intel] of kb.entries) {
    const dims = scoreAllDimensions(analysis, intel, weights)
    const weightedSum = dims.reduce((s, d) => s + d.weighted, 0)
    const confidence  = clamp01(weightedSum / totalWeight)

    ranked.push({
      slug,
      confidence: Math.round(confidence * 100) / 100,
      reasons:    buildReasons(dims),
      chips:      buildChips(analysis, intel, dims),
      dimensions: dims,
    })
  }

  ranked.sort((a, b) => b.confidence - a.confidence)
  return ranked.slice(0, limit)
}

/* ═══════════════════════════════════════════════════════════════
   DIMENSION COMPARATORS
═══════════════════════════════════════════════════════════════ */

function scoreAllDimensions(
  img:     ImageAnalysisResult,
  intel:   PresetIntelligence,
  weights: ScoringWeights
): DimensionScore[] {
  const raw: Array<{ dimension: keyof ScoringWeights; score: number; reason?: string }> = [
    scoreLighting(img, intel),
    scoreColorPalette(img, intel),
    scoreScene(img, intel),
    scoreMood(img, intel),
    scoreComposition(img, intel),
    scoreExposure(img, intel),
    scoreStyle(img, intel),
    scoreSubject(img, intel),
    scoreWhiteBalance(img, intel),
    scoreDominantColors(img, intel),
    scoreContrast(img, intel),
    scoreSaturation(img, intel),
    scoreTone(img, intel),
    scoreKeywords(img, intel),
  ]

  return raw.map((r) => ({
    dimension: r.dimension,
    score:     Math.round(r.score * 1000) / 1000,
    weighted:  r.score * weights[r.dimension],
    reason:    r.reason,
  }))
}

type Dim = { dimension: keyof ScoringWeights; score: number; reason?: string }

/* ── 1. Lighting ── */
function scoreLighting(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const imgTerms = [img.lighting.quality, img.scene.timeOfDay].filter((t) => t !== "unknown")
  if (imgTerms.length === 0 || intel.lightingConditions.length === 0) {
    return { dimension: "lighting", score: 0.4 }
  }
  const overlap = softOverlap(imgTerms, [...intel.lightingConditions, ...intel.timeOfDay])
  const timeHit = img.scene.timeOfDay !== "unknown" && intel.timeOfDay.some((t) => t === img.scene.timeOfDay)
  const score = clamp01(0.3 + overlap * 0.5 + (timeHit ? 0.2 : 0))
  return {
    dimension: "lighting", score,
    reason: timeHit ? `${capitalise(img.scene.timeOfDay)} lighting` :
            overlap > 0.3 ? `Suits ${img.lighting.quality} light` : undefined,
  }
}

/* ── 2. Colour palette (hex distance) ── */
function scoreColorPalette(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  if (img.colors.palette.length === 0 || intel.colorPalette.length === 0) {
    return { dimension: "colorPalette", score: 0.4 }
  }
  /* Average best-pair distance between the two palettes */
  let total = 0
  for (const hexA of img.colors.palette) {
    let best = Infinity
    for (const hexB of intel.colorPalette) {
      best = Math.min(best, hexDistance(hexA, hexB))
    }
    total += best
  }
  const avg = total / img.colors.palette.length          // 0 (identical) … ~441 (max RGB distance)
  const score = clamp01(1 - avg / 300)
  return {
    dimension: "colorPalette", score,
    reason: score > 0.65 ? "Closely matched colour palette" : undefined,
  }
}

/* ── 3. Scene genre ── */
function scoreScene(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const genreMap: Record<string, keyof PresetIntelligence["sceneScores"] | undefined> = {
    landscape: "landscape", portrait: "portrait", street: "street",
    architecture: "architecture", travel: "travel", product: "food",
    interior: "architecture", event: "portrait", night: "street",
    wildlife: "landscape", macro: "food", aerial: "landscape",
  }
  const genre = genreMap[img.scene.type]
  if (!genre) return { dimension: "scene", score: 0.45 }
  const score = clamp01(0.2 + intel.sceneScores[genre] * 0.8)
  return {
    dimension: "scene", score,
    reason: intel.sceneScores[genre] >= 0.5 ? `Strong ${genre} affinity` : undefined,
  }
}

/* ── 4. Mood ── */
function scoreMood(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const imgMoods = [img.mood.primary, img.mood.secondary, ...img.mood.adjectives].filter(Boolean) as string[]
  const overlap = softOverlap(imgMoods, [...intel.mood, ...intel.aestheticTags])
  const primaryHit = intel.mood.includes(img.mood.primary)
  const score = clamp01(0.25 + overlap * 0.45 + (primaryHit ? 0.3 : 0))
  return {
    dimension: "mood", score,
    reason: primaryHit ? `${capitalise(img.mood.primary)} mood` :
            overlap > 0.25 ? `Matches the ${imgMoods[0]} feel` : undefined,
  }
}

/* ── 5. Composition ── */
function scoreComposition(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  /* Weak signal: portrait-orientation images pair slightly better with
     portrait/fashion-affine presets; landscapes with landscape/travel. */
  const o = img.composition.orientation
  const affinity =
    o === "portrait"  ? Math.max(intel.sceneScores.portrait, intel.sceneScores.fashion) :
    o === "landscape" ? Math.max(intel.sceneScores.landscape, intel.sceneScores.travel, intel.sceneScores.cinematic) :
    0.5
  return { dimension: "composition", score: clamp01(0.4 + affinity * 0.4) }
}

/* ── 6. Exposure ── */
function scoreExposure(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  /* A preset that lifts suits an underexposed image; one that darkens
     suits a bright/overexposed image; neutral suits well-exposed. */
  const e = img.quality.exposure
  const t = intel.exposureTendency
  const score =
    e === "underexposed" ? (t === "lifts" ? 0.95 : t === "neutral" ? 0.6 : 0.3) :
    e === "overexposed"  ? (t === "darkens" ? 0.9 : intel.highlightRecovery === "high" ? 0.85 : 0.45) :
                           (t === "neutral" ? 0.8 : 0.65)
  return {
    dimension: "exposure", score,
    reason:
      e === "underexposed" && t === "lifts"   ? "Lifts underexposed shots" :
      e === "overexposed" && intel.highlightRecovery === "high" ? "Strong highlight recovery" : undefined,
  }
}

/* ── 7. Style ── */
function scoreStyle(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const styleTerms = [img.styleProfileId.replace("-", " "), ...img.colors.grade.toLowerCase().split(/\s+/)]
  const overlap = softOverlap(styleTerms, [...intel.style, ...intel.aestheticTags])
  const score = clamp01(0.3 + overlap * 0.7)
  return {
    dimension: "style", score,
    reason: overlap > 0.2 ? `${capitalise(img.styleProfileId.replace("-", " "))} style match` : undefined,
  }
}

/* ── 8. Subject ── */
function scoreSubject(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  if (img.subject.hasSkinTones) {
    const score =
      intel.skinToneCompat === "excellent" ? 0.95 :
      intel.skinToneCompat === "good"      ? 0.8  :
      intel.skinToneCompat === "neutral"   ? 0.5  : 0.15
    return {
      dimension: "subject", score,
      reason: score >= 0.8 ? "Skin-friendly grading" : undefined,
    }
  }
  /* No skin in frame — skin compatibility is irrelevant, everything passes */
  return { dimension: "subject", score: 0.7 }
}

/* ── 9. White balance ── */
function scoreWhiteBalance(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const score = temperatureAffinity(img.lighting.colorTemperature, intel.whiteBalance)
  return {
    dimension: "whiteBalance", score,
    reason: score >= 0.85 && intel.whiteBalance !== "neutral"
      ? `${capitalise(intel.whiteBalance)} grade for ${img.lighting.colorTemperature} light`
      : undefined,
  }
}

/* ── 10. Dominant colours (name/family overlap) ── */
function scoreDominantColors(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  if (img.colors.dominant.length === 0 || intel.dominantColors.length === 0) {
    return { dimension: "dominantColors", score: 0.4 }
  }
  const imgColorWords = img.colors.dominant.flatMap((c) => c.toLowerCase().split(/\s+/))
  const overlapCount = intel.dominantColors.filter((c) =>
    imgColorWords.some((w) => w.includes(c) || c.includes(w))
  )
  const score = clamp01(0.25 + (overlapCount.length / Math.min(intel.dominantColors.length, 4)) * 0.75)
  return {
    dimension: "dominantColors", score,
    reason: overlapCount.length >= 2
      ? `${overlapCount.slice(0, 2).map(capitalise).join(" and ")} tones`
      : overlapCount.length === 1 ? `${capitalise(overlapCount[0])} tones` : undefined,
  }
}

/* ── 11. Contrast ── */
function scoreContrast(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const map: Record<string, number> = { flat: 0, low: 1, medium: 2, high: 3, dramatic: 4 }
  const intelMap: Record<string, number> = { low: 1, medium: 2, high: 3.5 }
  const dist = Math.abs((map[img.colors.contrastLevel] ?? 2) - (intelMap[intel.contrastLevel] ?? 2))
  return { dimension: "contrast", score: clamp01(1 - dist / 4) }
}

/* ── 12. Saturation ── */
function scoreSaturation(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const map: Record<string, number> = { desaturated: 0, muted: 1, natural: 2, vibrant: 3, hypersaturated: 4 }
  const intelMap: Record<string, number> = { reduced: 1, neutral: 2, boosted: 3 }
  const dist = Math.abs((map[img.colors.saturationLevel] ?? 2) - (intelMap[intel.saturationLevel] ?? 2))
  return { dimension: "saturation", score: clamp01(1 - dist / 4) }
}

/* ── 13. Tone (energy + shadow character) ── */
function scoreTone(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  let score = 0.5
  /* Low-energy images pair with deep-shadow, moody blacks; high-energy with lifted/neutral */
  if (img.mood.energy === "low"  && intel.shadowDepth === "high")   score += 0.3
  if (img.mood.energy === "high" && intel.blackLevel !== "crushed") score += 0.25
  if (img.mood.energy === "medium")                                 score += 0.15
  if (img.lighting.hasShadowCrush && intel.shadowDepth === "low")   score += 0.2   // rescue crushed shadows
  return { dimension: "tone", score: clamp01(score) }
}

/* ── 14. Keywords ── */
function scoreKeywords(img: ImageAnalysisResult, intel: PresetIntelligence): Dim {
  const presetVocab = [...intel.aestheticTags, ...intel.seoTags, ...intel.style]
  const hits = img.presetKeywords.filter((k) => presetVocab.includes(k))
  const score = clamp01(0.2 + (hits.length / Math.max(Math.min(img.presetKeywords.length, 6), 1)) * 0.8)
  return {
    dimension: "keywords", score,
    reason: hits.length >= 2
      ? `Matches your ${hits.slice(0, 2).join(" + ")} keywords`
      : undefined,
  }
}

/* ═══════════════════════════════════════════════════════════════
   REASONS + CHIPS
═══════════════════════════════════════════════════════════════ */

function buildReasons(dims: DimensionScore[]): string[] {
  return dims
    .filter((d) => d.reason)
    .sort((a, b) => b.weighted - a.weighted)
    .map((d) => d.reason as string)
    .slice(0, 6)
}

function buildChips(
  img:   ImageAnalysisResult,
  intel: PresetIntelligence,
  dims:  DimensionScore[]
): RecommendationChips {
  const dimScore = (d: string) => dims.find((x) => x.dimension === d)?.score ?? 0

  return {
    lighting: dimScore("lighting") > 0.5
      ? dedupe([...intel.timeOfDay, ...intel.lightingConditions]).slice(0, 2).map(capitalise)
      : [],
    mood: intel.mood.slice(0, 2).map(capitalise),
    color: dimScore("dominantColors") > 0.45 || dimScore("colorPalette") > 0.55
      ? intel.dominantColors.slice(0, 3).map(capitalise)
      : intel.dominantColors.slice(0, 1).map(capitalise),
    scene: topGenres(intel, 2).map(capitalise),
  }
}

function topGenres(intel: PresetIntelligence, n: number): string[] {
  return (Object.entries(intel.sceneScores) as Array<[string, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .filter(([, score]) => score >= 0.3)
    .map(([genre]) => genre)
}

/* ═══════════════════════════════════════════════════════════════
   Utilities
═══════════════════════════════════════════════════════════════ */

/** Overlap where terms match on substring containment either way. */
function softOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const normA = a.map((x) => x.toLowerCase())
  const normB = b.map((x) => x.toLowerCase())
  let hits = 0
  for (const x of normA) {
    if (normB.some((y) => y.includes(x) || x.includes(y))) hits++
  }
  return hits / normA.length
}

function hexDistance(hexA: string, hexB: string): number {
  const a = parseHex(hexA)
  const b = parseHex(hexB)
  if (!a || !b) return 300
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  }
}

function temperatureAffinity(imgTemp: string, presetTemp: string): number {
  const scale: Record<string, number> = {
    "very warm": 0, "warm": 1, "neutral": 2, "cool": 3, "very cool": 4,
  }
  const a = scale[imgTemp] ?? 2
  const b = scale[presetTemp] ?? 2
  /* A warm image + warm preset = reinforcing match. Neutral preset is safe everywhere. */
  return clamp01(1 - Math.abs(a - b) / 3)
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1)
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

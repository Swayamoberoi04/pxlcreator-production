/**
 * src/lib/studio/recommend.ts
 *
 * Matches AI-generated keywords against preset aiTags and returns the
 * single best-matching preset as a PresetRecommendation.
 *
 * Algorithm: set intersection scored by overlap ratio.
 *   score(preset) = |keywords ∩ preset.aiTags| / min(|keywords|, |preset.aiTags|)
 *
 * Design:
 *   - Pure function — no I/O, no imports of static data.
 *   - Caller is responsible for supplying the preset list (from DB or fallback).
 *   - This makes the function fully testable and data-source agnostic.
 */

import type { Preset }                from "@/types/product"
import type { PresetRecommendation }  from "@/types/studio"

/* ── Main export ────────────────────────────────────────────── */

/**
 * Finds the preset whose aiTags best overlap with the provided keywords.
 *
 * @param keywords - Lowercase keyword array from AIAnalysis.presetKeywords
 * @param presets  - Full preset list to search (fetched from DB by the caller)
 * @returns        - PresetRecommendation with match score and human reason
 */
export function recommendPreset(
  keywords: string[],
  presets:  Preset[]
): PresetRecommendation {
  /* Normalise input — lowercase, trim, deduplicate */
  const normalised = [...new Set(
    keywords.map((k) => k.toLowerCase().trim()).filter(Boolean)
  )]

  /* Ensure we always have something to match against */
  if (presets.length === 0) {
    return {
      presetId:   "",
      presetName: "PXL Starter Pack",
      slug:       "desert-gold-pack",
      tagline:    "A great starting point for any editing style",
      price:      0,
      category:   "Cinematic",
      confidence: 0.3,
      reason:     "No presets available — check back soon",
    }
  }

  if (normalised.length === 0) {
    /* No keywords — fall back to best-seller or first */
    const fallback =
      presets.find((p) => p.badge === "Best Seller") ??
      presets.find((p) => p.isFeatured) ??
      presets[0]
    return buildRecommendation(fallback, 0.5, "Recommended as a versatile starting point")
  }

  let bestPreset: Preset  = presets[0]
  let bestScore           = -1
  let bestMatches: string[] = []

  for (const preset of presets) {
    const tags = (preset.aiTags ?? []).map((t) => t.toLowerCase())
    if (tags.length === 0) continue

    /* Matched keywords */
    const matches   = normalised.filter((k) => tags.includes(k))

    /*
     * Score = intersection size / min(keywords, tags)
     * Rewards precise matches over presets with very long tag lists.
     * Tie-break: prefer featured presets.
     */
    const denominator = Math.min(normalised.length, tags.length)
    const score       = denominator > 0 ? matches.length / denominator : 0

    const isBetter =
      score > bestScore ||
      (score === bestScore && preset.isFeatured && !bestPreset.isFeatured)

    if (isBetter) {
      bestScore   = score
      bestPreset  = preset
      bestMatches = matches
    }
  }

  /* No overlap at all — fall back to best-seller */
  if (bestScore <= 0) {
    const fallback =
      presets.find((p) => p.badge === "Best Seller") ??
      presets.find((p) => p.isFeatured) ??
      presets[0]
    return buildRecommendation(fallback, 0.4, "Best overall match for your photo style")
  }

  return buildRecommendation(
    bestPreset,
    Math.min(bestScore, 1),
    buildReason(bestMatches)
  )
}

/* ── Helpers ────────────────────────────────────────────────── */

function buildReason(matches: string[]): string {
  if (matches.length === 0) {
    return `Best overall match for your photo style`
  }

  const display = matches
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))

  return display.length === 1
    ? `Matches the ${display[0]} aesthetic in your photo`
    : `Matches ${display.join(" and ")} tones in your edit`
}

function buildRecommendation(
  preset:     Preset,
  confidence: number,
  reason:     string
): PresetRecommendation {
  return {
    presetId:   preset.id,
    presetName: preset.name,
    slug:       preset.slug,
    tagline:    preset.tagline,
    price:      preset.price,
    category:   preset.category,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    preset,     // carry the full object so callers never need static lookup
  }
}

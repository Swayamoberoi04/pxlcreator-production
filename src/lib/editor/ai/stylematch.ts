/**
 * src/lib/editor/ai/stylematch.ts
 *
 * "Match this reference." Analyse a reference image with the same CV pipeline,
 * compare its statistics to the current image, and derive the slider moves that
 * pull the current image toward the reference's white balance, exposure,
 * contrast and colour intensity. Transparent and additive like every AI edit.
 */

import { computeStats, toAnalysisImageData, type ImageStats } from "./analyze"
import type { AiEdit } from "./patch"

/** Compute stats for a reference image element. */
export function analyzeReference(img: HTMLImageElement): ImageStats {
  const data = toAnalysisImageData(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
  return computeStats(data, img.naturalWidth || img.width, img.naturalHeight || img.height)
}

const clamp = (v: number, lo = -100, hi = 100) => Math.round(Math.min(hi, Math.max(lo, v)))

/**
 * Build an additive edit that moves `current` toward `ref`.
 * The multipliers translate normalised-stat differences into slider units.
 */
export function matchStyle(ref: ImageStats, current: ImageStats): AiEdit {
  const temperature = clamp((ref.temperatureCast - current.temperatureCast) * 55)
  const tint = clamp((ref.tintCast - current.tintCast) * 55)
  const exposure = clamp((ref.meanLuma - current.meanLuma) * 90)
  const contrast = clamp((ref.dynamicRange - current.dynamicRange) * 70)
  const saturation = clamp((ref.saturation - current.saturation) * 130)
  const highlights = clamp((current.highlightClip - ref.highlightClip) * 200)
  const shadows = clamp((ref.shadowClip - current.shadowClip) * 160 + (ref.meanLuma - current.meanLuma) * 40)

  const adjustments: Record<string, number> = {}
  if (Math.abs(temperature) > 2) adjustments.temperature = temperature
  if (Math.abs(tint) > 2) adjustments.tint = tint
  if (Math.abs(exposure) > 2) adjustments.exposure = exposure
  if (Math.abs(contrast) > 2) adjustments.contrast = contrast
  if (Math.abs(saturation) > 2) adjustments.saturation = saturation
  if (Math.abs(highlights) > 3) adjustments.highlights = highlights
  if (Math.abs(shadows) > 3) adjustments.shadows = shadows

  const changes = Object.entries(adjustments).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`)
  const parts: string[] = []
  if (adjustments.temperature) parts.push(`white balance (${temperature > 0 ? "warmer" : "cooler"})`)
  if (adjustments.exposure) parts.push(`exposure (${exposure > 0 ? "brighter" : "darker"})`)
  if (adjustments.contrast) parts.push(`contrast`)
  if (adjustments.saturation) parts.push(`colour intensity`)

  return {
    id: `style_${Date.now()}`,
    title: "Match reference style",
    why: parts.length
      ? `Matched the reference's ${parts.join(", ")} to your image.`
      : "Your image already closely matches the reference.",
    patch: { adjustments },
    additive: true,
    changes,
  }
}

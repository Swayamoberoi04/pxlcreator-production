/**
 * src/lib/ai/preview/qa/histogram.ts
 *
 * Histogram Comparison (Phase 4C §2).
 *
 * RGB + luminance histograms come precomputed from features.ts.
 * Distance metric: histogram intersection (Σ min) — 1.0 for identical
 * distributions, → 0 as they diverge. Intuitive, bounded, and cheap.
 *
 * A colour grade legitimately reshapes histograms — thresholds are
 * therefore tolerant. What this module rejects:
 *   - a channel that has effectively been replaced (intersection ≈ 0)
 *   - a mean-luminance shift beyond the blueprint's 35% ceiling
 */

import type { QAConfig } from "./config"
import type { ImageFeatures } from "./features"
import type { QAModuleResult } from "./types"
import { clamp01, histogramIntersection } from "./types"

export function evaluateHistogram(
  original: ImageFeatures,
  preview:  ImageFeatures,
  config:   QAConfig
): QAModuleResult {
  const { maxLuminanceShift, minChannelIntersection } = config.histogram

  const interR = histogramIntersection(original.histR, preview.histR)
  const interG = histogramIntersection(original.histG, preview.histG)
  const interB = histogramIntersection(original.histB, preview.histB)
  const interL = histogramIntersection(original.histL, preview.histL)

  const lumShift = Math.abs(preview.meanL - original.meanL) / 255

  const channelCollapsed =
    interR < minChannelIntersection ||
    interG < minChannelIntersection ||
    interB < minChannelIntersection

  const lumOk = lumShift <= maxLuminanceShift

  /* Score: average channel intersection, penalized by luminance shift */
  const meanInter = (interR + interG + interB + interL) / 4
  const score = clamp01(meanInter * (lumOk ? 1 : 0.5))

  return {
    score,
    hardFail: false,
    reasons: [
      ...(channelCollapsed ? ["channel-collapsed"]  : []),
      ...(!lumOk           ? ["luminance-shifted"] : []),
    ],
    metrics: {
      histIntersectionR: round3(interR),
      histIntersectionG: round3(interG),
      histIntersectionB: round3(interB),
      histIntersectionL: round3(interL),
      luminanceShift:    round3(lumShift),
    },
    checks: [
      {
        name:   "histogram-channel-integrity",
        passed: !channelCollapsed,
        detail: `RGB intersections ${round3(interR)}/${round3(interG)}/${round3(interB)} (min ${minChannelIntersection})`,
      },
      {
        name:   "histogram-luminance-shift",
        passed: lumOk,
        detail: `mean-luminance shift ${(lumShift * 100).toFixed(1)}% (max ${maxLuminanceShift * 100}%)`,
      },
    ],
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

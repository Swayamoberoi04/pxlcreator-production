/**
 * src/lib/ai/preview/qa/realism.ts
 *
 * Realism Engine (Phase 4C §6).
 *
 * Deterministic detectors (all from precomputed features):
 *   - extreme clipping     — fraction of pixels pinned to 0/255
 *   - posterization        — occupied luminance-bin fraction; a real
 *                            photograph fills most of the tonal range,
 *                            a posterized one collapses to few levels
 *   - unnatural saturation — fraction of near-max-chroma pixels
 *   - over-sharpening/noise — ratio of preview high-frequency (edge)
 *                            energy to the original's; a colour grade
 *                            barely changes it, halos and noise inflate it
 *
 * Compression blockiness and semantic realism ("does the scene look
 * plausible") need either full-resolution analysis or a vision model —
 * the RealismReferee interface below is the Gemini Vision hook
 * (blueprint §6.2) that Phase 5 activates without touching this module.
 */

import type { QAConfig } from "./config"
import type { ImageFeatures } from "./features"
import type { QAModuleResult } from "./types"
import { clamp01 } from "./types"

/* ─────────────────────────────────────────────────────────────
   Future model-referee — EXTENSION POINT (blueprint §6.2)
───────────────────────────────────────────────────────────── */

export interface RealismRefereeResult {
  /** null = referee unavailable/abstained */
  realismScore:  number | null
  fidelityScore: number | null
  looksLikeColorGradeOnly: boolean | null
  notes: string
}

export interface RealismReferee {
  readonly refereeId: string
  review(originalBuffer: Buffer, previewBuffer: Buffer): Promise<RealismRefereeResult>
}

/** Phase 4C default: model referee not enabled — abstains. */
export class NoopRealismReferee implements RealismReferee {
  readonly refereeId = "noop-4c"
  async review(): Promise<RealismRefereeResult> {
    return { realismScore: null, fidelityScore: null, looksLikeColorGradeOnly: null, notes: "vision referee not enabled (Phase 5)" }
  }
}

/* ─────────────────────────────────────────────────────────────
   Deterministic realism metrics
───────────────────────────────────────────────────────────── */

export function evaluateRealism(
  original: ImageFeatures,
  preview:  ImageFeatures,
  config:   QAConfig
): QAModuleResult {
  const cfg = config.realism

  const clippedFraction = Math.max(preview.clippedLowFraction, preview.clippedHighFraction)
  /* Compare against the original — a photo can arrive clipped; QA only
     penalizes clipping the EDIT introduced. */
  const origClipped   = Math.max(original.clippedLowFraction, original.clippedHighFraction)
  const clippingOk    = clippedFraction <= Math.max(cfg.maxClippedFraction, origClipped + 0.10)

  const occupancyOk   = preview.luminanceOccupancy >= Math.min(cfg.minLuminanceOccupancy, original.luminanceOccupancy * 0.6)

  const hyperOk       = preview.hyperSaturatedFraction <= Math.max(cfg.maxHypersaturatedFraction, original.hyperSaturatedFraction + 0.10)

  const edgeRatio     = original.edgeEnergy > 0.5 ? preview.edgeEnergy / original.edgeEnergy : 1
  const sharpnessOk   = edgeRatio <= cfg.maxEdgeEnergyRatio

  const failures = [!clippingOk, !occupancyOk, !hyperOk, !sharpnessOk].filter(Boolean).length
  const score = clamp01(1 - failures * 0.3)

  return {
    score,
    hardFail: false,
    reasons: [
      ...(!clippingOk  ? ["clipping-introduced"]   : []),
      ...(!occupancyOk ? ["posterized"]            : []),
      ...(!hyperOk     ? ["oversaturated"]         : []),
      ...(!sharpnessOk ? ["oversharpened-or-noisy"]: []),
    ],
    metrics: {
      clippedFraction:        round3(clippedFraction),
      luminanceOccupancy:     round3(preview.luminanceOccupancy),
      hyperSaturatedFraction: round3(preview.hyperSaturatedFraction),
      edgeEnergyRatio:        round3(edgeRatio),
    },
    checks: [
      { name: "realism-clipping",      passed: clippingOk,  detail: `clipped fraction ${round3(clippedFraction)} (orig ${round3(origClipped)})` },
      { name: "realism-posterization", passed: occupancyOk, detail: `luminance occupancy ${round3(preview.luminanceOccupancy)} (min ${cfg.minLuminanceOccupancy})` },
      { name: "realism-saturation",    passed: hyperOk,     detail: `hypersaturated fraction ${round3(preview.hyperSaturatedFraction)} (max ${cfg.maxHypersaturatedFraction})` },
      { name: "realism-sharpening",    passed: sharpnessOk, detail: `edge-energy ratio ${round3(edgeRatio)} (max ${cfg.maxEdgeEnergyRatio})` },
    ],
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

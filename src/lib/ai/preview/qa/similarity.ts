/**
 * src/lib/ai/preview/qa/similarity.ts
 *
 * Image Similarity Engine (Phase 4C §1).
 *
 * Two independent 64-bit perceptual hashes compared by Hamming distance:
 *   - dHash  — Phase 4B's gradient hash (computed in features.ts via
 *              the existing ../phash implementation, reused untouched)
 *   - pHash  — DCT-based perceptual hash (features.ts)
 *
 * The blueprint §6.1 band logic:
 *   distance below min  → the provider returned a visually identical
 *                         image (no-op edit)            → RETRY signal
 *   distance above max  → the composition itself changed → HARD FAIL
 *   inside the band     → a colour-grade-sized change    → good
 */

import { phashDistance } from "../phash"
import type { QAConfig } from "./config"
import type { ImageFeatures } from "./features"
import type { QAModuleResult } from "./types"
import { clamp01, histogramIntersection } from "./types"

export function evaluateSimilarity(
  original: ImageFeatures,
  preview:  ImageFeatures,
  config:   QAConfig
): QAModuleResult {
  const {
    dhashMinDistance, dhashMaxDistance, phashMaxDistance,
    noopTonalDelta, noopHistIntersection,
  } = config.similarity

  /* Both hashes are 64-bit hex — the same Hamming metric applies */
  const dDist = phashDistance(original.dhash, preview.dhash)
  const pDist = phashDistance(original.phash, preview.phash)

  /* No-op detection: hashes are grade-INVARIANT by design, so hash
     identity alone does not mean "nothing changed" — a strong colour
     grade can leave both hashes untouched. The edit is invisible only
     when hashes AND tonal statistics agree that nothing moved. */
  const hashesUnchanged = dDist < dhashMinDistance && pDist < dhashMinDistance
  const lumDelta    = Math.abs(preview.meanL - original.meanL)
  const warmthDelta = Math.abs((preview.meanR - preview.meanB) - (original.meanR - original.meanB))
  const chromaDelta = Math.abs(preview.meanChroma - original.meanChroma)
  const histInterL  = histogramIntersection(original.histL, preview.histL)
  const tonallyIdentical =
    lumDelta < noopTonalDelta &&
    warmthDelta < noopTonalDelta &&
    chromaDelta < noopTonalDelta &&
    histInterL >= noopHistIntersection
  const noOp = hashesUnchanged && tonallyIdentical

  const dDestroyed = dDist > dhashMaxDistance
  const pDestroyed = pDist > phashMaxDistance
  const destroyed  = dDestroyed && pDestroyed   // require BOTH hashes to agree before the hard verdict

  /* Score: low distance is GOOD (identity preserved) as long as the
     edit is visible; taper to 0 as distance approaches the ceiling. */
  let score: number
  if (noOp) {
    score = 0.25
  } else if (destroyed) {
    score = 0
  } else {
    const graceZone = dhashMaxDistance * 0.5
    score = clamp01(1 - Math.max(0, dDist - graceZone) / (dhashMaxDistance - graceZone))
  }

  return {
    score,
    hardFail: destroyed,
    reasons: [
      ...(noOp      ? ["edit-invisible"]        : []),
      ...(destroyed ? ["composition-replaced"] : []),
    ],
    metrics: {
      dhashDistance: dDist,
      phashDistance: pDist,
      tonalLumDelta:    Math.round(lumDelta * 100) / 100,
      tonalWarmthDelta: Math.round(warmthDelta * 100) / 100,
      tonalChromaDelta: Math.round(chromaDelta * 100) / 100,
    },
    checks: [
      {
        name:   "similarity-edit-visible",
        passed: !noOp,
        detail: noOp
          ? `hashes unchanged (d=${dDist}, p=${pDist}) and tonal deltas < ${noopTonalDelta}`
          : `visible edit (dHash ${dDist}, ΔL ${lumDelta.toFixed(1)}, Δwarmth ${warmthDelta.toFixed(1)}, Δchroma ${chromaDelta.toFixed(1)})`,
      },
      {
        name:   "similarity-dhash-ceiling",
        passed: !dDestroyed,
        detail: `dHash distance ${dDist} (max ${dhashMaxDistance})`,
      },
      {
        name:   "similarity-phash-ceiling",
        passed: !pDestroyed,
        detail: `pHash distance ${pDist} (max ${phashMaxDistance})`,
      },
    ],
  }
}

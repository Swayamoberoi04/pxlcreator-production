/**
 * src/lib/ai/preview/qa/identity.ts
 *
 * Identity Preservation Engine (Phase 4C §4).
 *
 * Deterministic composition/geometry validation:
 *   - block-structure correlation: Pearson correlation of the 8×8
 *     block-luminance grids. A colour grade rescales luminance roughly
 *     monotonically → correlation stays high. Moved/added/removed
 *     subjects break the correlation.
 *   - edge-map correlation: gradient magnitude maps compared the same
 *     way. Object boundaries must stay where they were — edges are
 *     grade-invariant, so this is the strongest cheap identity signal.
 *   - cropping/rotation is caught upstream by metadata.ts (aspect,
 *     orientation) and similarity.ts (hash band) — this module focuses
 *     on in-frame stability.
 *
 * Face verification: interface only (per spec — no external face APIs).
 * A future FaceVerifier implementation (Phase 5, e.g. embedding
 * distance) plugs into the gate via setFaceVerifier() without touching
 * this module's deterministic checks.
 */

import type { QAConfig } from "./config"
import type { ImageFeatures } from "./features"
import type { QAModuleResult } from "./types"
import { clamp01, pearson } from "./types"

/* ─────────────────────────────────────────────────────────────
   Future face verification — EXTENSION POINT (Phase 5)
───────────────────────────────────────────────────────────── */

export interface FaceVerificationResult {
  /** null = verifier cannot judge (no faces / not implemented) */
  facesMatch:   boolean | null
  faceCount:    number | null
  confidence:   number | null
  detail:       string
}

export interface FaceVerifier {
  readonly verifierId: string
  verify(originalBuffer: Buffer, previewBuffer: Buffer): Promise<FaceVerificationResult>
}

/** Phase 4C default: face verification not yet available — abstains. */
export class NoopFaceVerifier implements FaceVerifier {
  readonly verifierId = "noop-4c"
  async verify(): Promise<FaceVerificationResult> {
    return { facesMatch: null, faceCount: null, confidence: null, detail: "face verification not enabled (Phase 5)" }
  }
}

/* ─────────────────────────────────────────────────────────────
   Deterministic composition validation
───────────────────────────────────────────────────────────── */

export function evaluateIdentity(
  original: ImageFeatures,
  preview:  ImageFeatures,
  config:   QAConfig
): QAModuleResult {
  const { minStructureCorrelation, minEdgeCorrelation } = config.identity

  const structureCorr = pearson(original.blockLuma, preview.blockLuma)
  const edgeCorr      = pearson(original.edgeMap, preview.edgeMap)

  const structureOk = structureCorr >= minStructureCorrelation
  const edgeOk      = edgeCorr >= minEdgeCorrelation

  /* Both signals failing together = the scene content itself changed */
  const hardFail = !structureOk && !edgeOk

  const score = clamp01(
    0.5 * clamp01((structureCorr - 0.4) / 0.6) +
    0.5 * clamp01((edgeCorr - 0.2) / 0.8)
  )

  return {
    score,
    hardFail,
    reasons: [
      ...(!structureOk ? ["structure-diverged"] : []),
      ...(!edgeOk      ? ["edges-diverged"]     : []),
    ],
    metrics: {
      structureCorrelation: round3(structureCorr),
      edgeCorrelation:      round3(edgeCorr),
    },
    checks: [
      {
        name:   "identity-block-structure",
        passed: structureOk,
        detail: `block-luma correlation ${round3(structureCorr)} (min ${minStructureCorrelation})`,
      },
      {
        name:   "identity-edge-stability",
        passed: edgeOk,
        detail: `edge-map correlation ${round3(edgeCorr)} (min ${minEdgeCorrelation})`,
      },
    ],
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

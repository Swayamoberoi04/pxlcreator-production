/**
 * src/lib/ai/preview/qa/config.ts
 *
 * Phase 4C — central, versioned QA configuration.
 *
 * Every threshold, weight, and tolerance the QA engine uses lives here.
 * QA_CONFIG_VERSION is stamped into every persisted QA report
 * (preview_jobs.qa_verdict) so historical verdicts remain interpretable
 * after tuning. Bump the version whenever a number changes.
 *
 * The gate accepts a Partial<QAConfig> override at construction for
 * tests and future per-environment tuning — DEFAULT_QA_CONFIG is the
 * production truth.
 */

export const QA_CONFIG_VERSION = "qa-4c.1.0.0"

export interface QAConfig {
  /* ── Composite scoring ─────────────────────────────────── */
  weights: {
    similarity: number
    identity:   number
    fidelity:   number
    realism:    number
    metadata:   number
  }
  thresholds: {
    /** Composite score at or above which the preview PASSes */
    pass: number
    /** Composite score below which the preview FAILs outright.
        Scores in [retryFloor, pass) → RETRY. */
    retryFloor: number
  }

  /* ── Similarity engine (blueprint §6.1 band) ───────────── */
  similarity: {
    /** Hash Hamming distance below this counts as "hashes unchanged".
        NOTE: hashes are grade-invariant by design, so a no-op verdict
        additionally requires the tonal-identity conditions below. */
    dhashMinDistance: number
    /** dHash Hamming distance above this = composition destroyed */
    dhashMaxDistance: number
    /** DCT pHash Hamming distance above this = different photograph */
    phashMaxDistance: number
    /** Tonal identity: max |Δ| of meanL / warmth / chroma (0–255 levels)
        for the preview to count as visually unchanged */
    noopTonalDelta: number
    /** Tonal identity: min luminance-histogram intersection */
    noopHistIntersection: number
  }

  /* ── Histogram comparison ──────────────────────────────── */
  histogram: {
    /** Bins per channel for RGB + luminance histograms */
    bins: number
    /** Max acceptable mean-luminance shift as fraction of 255 (blueprint: 35%) */
    maxLuminanceShift: number
    /** Minimum histogram intersection (0–1) original↔preview per channel
        below which a channel is considered collapsed/replaced */
    minChannelIntersection: number
  }

  /* ── Metadata validation ───────────────────────────────── */
  metadata: {
    /** Max relative aspect-ratio deviation original↔preview */
    aspectTolerance: number
    /** Minimum preview edge in px */
    minEdge: number
  }

  /* ── Identity / composition ────────────────────────────── */
  identity: {
    /** Min Pearson correlation of 8×8 block-luminance structure */
    minStructureCorrelation: number
    /** Min correlation of gradient (edge) maps */
    minEdgeCorrelation: number
  }

  /* ── Preset fidelity ───────────────────────────────────── */
  fidelity: {
    /** Min histogram intersection between AI preview and the Sharp
        reference render of the same grade */
    minReferenceIntersection: number
    /** Neutral zone: expected-direction deltas smaller than this
        (fraction of 255 for means, absolute for ratios) count as
        "no movement" rather than wrong-direction */
    directionDeadZone: number
  }

  /* ── Realism ───────────────────────────────────────────── */
  realism: {
    /** Max fraction of pixels clipped to 0 or 255 per channel */
    maxClippedFraction: number
    /** Min fraction of occupied luminance bins (of 64) — below = posterized */
    minLuminanceOccupancy: number
    /** Max fraction of near-max-saturation pixels */
    maxHypersaturatedFraction: number
    /** Max ratio of preview/original high-frequency energy — above = over-sharpened or noisy */
    maxEdgeEnergyRatio: number
  }

  /* ── Retry policy ──────────────────────────────────────── */
  retry: {
    /** Hard cap — blueprint & Phase 4C spec: exactly one retry */
    maxRetries: 1
  }
}

export const DEFAULT_QA_CONFIG: QAConfig = {
  weights: {
    similarity: 0.25,
    identity:   0.30,   // identity failures are the costliest — weighted highest
    fidelity:   0.20,
    realism:    0.15,
    metadata:   0.10,
  },
  thresholds: {
    pass:       0.70,
    retryFloor: 0.45,
  },
  similarity: {
    dhashMinDistance:     3,
    dhashMaxDistance:     26,   // beyond this the structure itself changed
    phashMaxDistance:     24,
    noopTonalDelta:       1.5,
    noopHistIntersection: 0.97,
  },
  histogram: {
    bins:                   32,
    maxLuminanceShift:      0.35,
    minChannelIntersection: 0.25,
  },
  metadata: {
    aspectTolerance: 0.02,
    minEdge:         256,
  },
  identity: {
    minStructureCorrelation: 0.80,
    minEdgeCorrelation:      0.60,
  },
  fidelity: {
    minReferenceIntersection: 0.35,
    directionDeadZone:        0.015,
  },
  realism: {
    maxClippedFraction:        0.30,
    minLuminanceOccupancy:     0.30,
    maxHypersaturatedFraction: 0.35,
    maxEdgeEnergyRatio:        2.8,
  },
  retry: {
    maxRetries: 1,
  },
}

export function resolveQAConfig(override?: Partial<QAConfig>): QAConfig {
  if (!override) return DEFAULT_QA_CONFIG
  return {
    ...DEFAULT_QA_CONFIG,
    ...override,
    weights:    { ...DEFAULT_QA_CONFIG.weights,    ...override.weights },
    thresholds: { ...DEFAULT_QA_CONFIG.thresholds, ...override.thresholds },
    similarity: { ...DEFAULT_QA_CONFIG.similarity, ...override.similarity },
    histogram:  { ...DEFAULT_QA_CONFIG.histogram,  ...override.histogram },
    metadata:   { ...DEFAULT_QA_CONFIG.metadata,   ...override.metadata },
    identity:   { ...DEFAULT_QA_CONFIG.identity,   ...override.identity },
    fidelity:   { ...DEFAULT_QA_CONFIG.fidelity,   ...override.fidelity },
    realism:    { ...DEFAULT_QA_CONFIG.realism,    ...override.realism },
    retry:      DEFAULT_QA_CONFIG.retry,
  }
}

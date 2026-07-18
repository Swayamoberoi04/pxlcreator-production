/**
 * src/lib/ai/preview/qa/types.ts
 *
 * Internal contracts shared by the QA modules.
 * Public API types (PreviewQAGate, PreviewQAResult, …) stay in
 * src/types/preview.ts — these are the engine's internals.
 */

import type { PreviewQACheck } from "@/types/preview"

/** Every QA subsystem returns this shape. */
export interface QAModuleResult {
  /** 0–1 subsystem score feeding the weighted composite */
  score: number
  /** Named checks with pass/fail + human-readable detail */
  checks: PreviewQACheck[]
  /** Raw metric values for telemetry (persisted in qa_verdict) */
  metrics: Record<string, number>
  /**
   * A hard failure short-circuits the composite to FAIL regardless of
   * the weighted score (e.g. corrupt file, different photograph).
   */
  hardFail: boolean
  /**
   * Machine-readable reasons used by the Prompt Refinement engine to
   * build corrective instructions (e.g. "edit-invisible", "wb-too-cool").
   */
  reasons: string[]
}

export const emptyResult = (): QAModuleResult => ({
  score: 1, checks: [], metrics: {}, hardFail: false, reasons: [],
})

/* ── Small shared math helpers ── */

export function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1)
}

/** Histogram intersection: Σ min(a_i, b_i) over normalized histograms → 0–1 */
export function histogramIntersection(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.min(a[i], b[i] ?? 0)
  return sum
}

/** Pearson correlation of two equal-length vectors → −1…1 (0 when degenerate) */
export function pearson(a: number[], b: number[]): number {
  const n = a.length
  if (n === 0 || n !== b.length) return 0
  let sa = 0, sb = 0
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i] }
  const ma = sa / n, mb = sb / n
  let cov = 0, va = 0, vb = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb
    cov += da * db; va += da * da; vb += db * db
  }
  const denom = Math.sqrt(va * vb)
  return denom > 0 ? cov / denom : 0
}

/**
 * src/lib/ai/preview/qa.ts
 *
 * Quality Assurance gate — Phase 4C EXTENSION POINT.
 *
 * Phase 4B ships the interfaces and wiring only: every generated
 * preview flows through getActiveQAGate().evaluate() and the result is
 * persisted on the job (qa_verdict) and surfaced in telemetry as
 * "pending". Phase 4C replaces PendingQAGate with the real gate from
 * blueprint §6 (pHash band via ./phash, dimension/histogram checks,
 * Gemini Vision referee) without touching the job service, routes,
 * or UI — they already handle every verdict value.
 */

import type { PreviewQAGate, PreviewQAInput, PreviewQAResult } from "@/types/preview"

/**
 * Phase 4B pass-through: records that QA has not yet been performed.
 * The job proceeds to "ready"; the verdict is stored as "pending" so
 * Phase 4C telemetry can distinguish gated from ungated previews.
 */
export class PendingQAGate implements PreviewQAGate {
  readonly gateId = "pending-4b"

  async evaluate(_input: PreviewQAInput): Promise<PreviewQAResult> {
    return {
      verdict:       "pending",
      checks:        [],
      realismScore:  null,
      fidelityScore: null,
    }
  }
}

let _gate: PreviewQAGate | null = null

/**
 * Phase 4C swap point: return the real gate here.
 * Everything downstream already consumes PreviewQAResult.
 */
export function getActiveQAGate(): PreviewQAGate {
  if (!_gate) _gate = new PendingQAGate()
  return _gate
}

/** Test/ops hook. */
export function resetQAGate(): void {
  _gate = null
}

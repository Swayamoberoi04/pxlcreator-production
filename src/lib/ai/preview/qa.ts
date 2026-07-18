/**
 * src/lib/ai/preview/qa.ts
 *
 * Quality Assurance gate registry.
 *
 * Phase 4C: FidelityQAGate (src/lib/ai/preview/qa/gate.ts) is the
 * active gate — the full deterministic pipeline from blueprint §6:
 * similarity bands, histogram integrity, metadata validation,
 * identity/composition stability, preset fidelity (with a Sharp
 * reference render), and realism metrics, combined into a weighted
 * composite with configurable thresholds (qa/config.ts).
 *
 * QA_GATE=off restores the Phase 4B pass-through (verdict "pending",
 * everything publishes) — the operational escape hatch if thresholds
 * ever misbehave in production.
 */

import type { PreviewQAGate, PreviewQAInput, PreviewQAResult } from "@/types/preview"

/**
 * Phase 4B pass-through, retained as the QA_GATE=off fallback:
 * records that QA was not performed; the job proceeds to "ready".
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

export async function getActiveQAGate(): Promise<PreviewQAGate> {
  if (_gate) return _gate

  if (process.env.QA_GATE?.trim().toLowerCase() === "off") {
    console.log(`[ai:preview] ${JSON.stringify({ event: "qa_gate_selected", gate: "pending-4b", reason: "QA_GATE=off" })}`)
    _gate = new PendingQAGate()
    return _gate
  }

  /* Phase 4C: the real composite gate. Dynamic import keeps Sharp and
     the analysis modules out of any bundle that only needs the types. */
  const { FidelityQAGate } = await import("./qa/gate")
  _gate = new FidelityQAGate()
  console.log(`[ai:preview] ${JSON.stringify({ event: "qa_gate_selected", gate: _gate.gateId })}`)
  return _gate
}

/** Test/ops hook. */
export function resetQAGate(): void {
  _gate = null
}

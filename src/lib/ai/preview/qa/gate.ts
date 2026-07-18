/**
 * src/lib/ai/preview/qa/gate.ts
 *
 * FidelityQAGate — the Phase 4C composite QA pipeline.
 *
 *   decode original ─┐
 *   decode preview  ─┼→ features → similarity ─┐
 *   Sharp reference ─┘            → histogram  ─┤
 *                                 → metadata   ─┼→ weighted composite → PASS / RETRY / FAIL
 *                                 → identity   ─┤
 *                                 → fidelity   ─┤
 *                                 → realism    ─┘
 *
 * Verdict rules (config.thresholds):
 *   - any module hardFail (corrupt file, composition replaced, aspect/
 *     orientation changed, structure+edges diverged) → FAIL
 *   - "edit-invisible" (provider no-op) caps the verdict at RETRY —
 *     an unchanged image scores deceptively well everywhere else
 *   - composite ≥ pass        → PASS
 *   - composite ≥ retryFloor  → RETRY
 *   - otherwise               → FAIL
 *
 * The Sharp reference (the style profile's own adjustments applied via
 * the untouched Phase 1 processImage pipeline) grounds the fidelity
 * module in a concrete target render. Its failure is non-fatal — the
 * gate degrades to direction-only fidelity.
 *
 * Extension points wired but inert in 4C:
 *   setFaceVerifier()   — Phase 5 face identity (identity.ts)
 *   setRealismReferee() — Phase 5 Gemini Vision referee (realism.ts)
 * Their abstaining results are recorded in checks for telemetry.
 */

import type {
  PreviewQAGate, PreviewQAInput, PreviewQAResult, PreviewQACheck,
} from "@/types/preview"
import { processImage } from "@/lib/studio/process"
import { resolveQAConfig, QA_CONFIG_VERSION, type QAConfig } from "./config"
import { extractFeatures, type ImageFeatures } from "./features"
import { evaluateSimilarity } from "./similarity"
import { evaluateHistogram } from "./histogram"
import { evaluateMetadata } from "./metadata"
import { evaluateIdentity, NoopFaceVerifier, type FaceVerifier } from "./identity"
import { evaluateRealism, NoopRealismReferee, type RealismReferee } from "./realism"
import { evaluateFidelity } from "./fidelity"
import type { QAModuleResult } from "./types"
import { clamp01 } from "./types"

export class FidelityQAGate implements PreviewQAGate {
  readonly gateId = "fidelity-4c"

  private readonly config: QAConfig
  private faceVerifier:   FaceVerifier   = new NoopFaceVerifier()
  private realismReferee: RealismReferee = new NoopRealismReferee()

  constructor(configOverride?: Partial<QAConfig>) {
    this.config = resolveQAConfig(configOverride)
  }

  /** Phase 5 hook — plug in a real face verifier without touching the gate. */
  setFaceVerifier(v: FaceVerifier): void { this.faceVerifier = v }
  /** Phase 5 hook — plug in the Gemini Vision realism referee. */
  setRealismReferee(r: RealismReferee): void { this.realismReferee = r }

  async evaluate(input: PreviewQAInput): Promise<PreviewQAResult> {
    const started = Date.now()
    const originalBuffer = Buffer.from(input.originalBase64, "base64")
    const previewBuffer  = Buffer.from(input.previewBase64, "base64")

    /* ── Decode + extract (corrupt preview = immediate hard FAIL) ── */
    let original: ImageFeatures
    let preview:  ImageFeatures
    try {
      original = await extractFeatures(originalBuffer, this.config.histogram.bins)
    } catch (err) {
      return this.failResult("corrupt-file", `original image unreadable: ${msg(err)}`, started)
    }
    try {
      preview = await extractFeatures(previewBuffer, this.config.histogram.bins)
    } catch (err) {
      return this.failResult("corrupt-file", `preview unreadable: ${msg(err)}`, started)
    }

    /* ── Sharp reference render for fidelity (best-effort) ── */
    let reference: ImageFeatures | undefined
    if (input.referenceAdjustments) {
      try {
        const refBuffer = await processImage(originalBuffer, input.referenceAdjustments)
        reference = await extractFeatures(refBuffer, this.config.histogram.bins)
      } catch {
        reference = undefined   // fidelity degrades to direction-only checks
      }
    }

    /* ── Run the five deterministic engines ── */
    const similarity = evaluateSimilarity(original, preview, this.config)
    const histogram  = evaluateHistogram(original, preview, this.config)
    const metadata   = evaluateMetadata(original, preview, this.config)
    const identity   = evaluateIdentity(original, preview, this.config)
    const realism    = evaluateRealism(original, preview, this.config)
    const fidelity   = evaluateFidelity(original, preview, this.config, input.presetIntel, reference)

    /* ── Phase 5 extension points — abstain today, recorded for telemetry ── */
    const faceResult    = await this.faceVerifier.verify(originalBuffer, previewBuffer)
    const refereeResult = await this.realismReferee.review(originalBuffer, previewBuffer)
    const extensionChecks: PreviewQACheck[] = [
      { name: "identity-face-verifier",  passed: faceResult.facesMatch !== false,          detail: faceResult.detail },
      { name: "realism-vision-referee",  passed: refereeResult.realismScore === null || refereeResult.realismScore >= 0.55, detail: refereeResult.notes },
    ]

    /* ── Composite ── */
    const w = this.config.weights
    const overall = clamp01(
      similarity.score * w.similarity +
      identity.score   * w.identity +
      fidelity.score   * w.fidelity +
      realism.score    * w.realism +
      metadata.score   * w.metadata +
      /* histogram informs but does not carry its own weight slot —
         fold it into the metadata slot's remaining headroom */
      0
    ) * normFactor(w) * (0.85 + 0.15 * histogram.score)

    const modules: QAModuleResult[] = [similarity, histogram, metadata, identity, fidelity, realism]
    const hardFailed = modules.some((m) => m.hardFail)
    const allReasons = modules.flatMap((m) => m.reasons)
    /* Reasons that cap the verdict at RETRY no matter the composite:
       a deceptively high score must not publish a preview that is
       invisible, contradicts the preset's promise, or shows artefacts —
       all of these are exactly what a corrective retry can fix. */
    const retryCapped = allReasons.some((r) => RETRY_CAP_REASONS.has(r))

    let verdict: PreviewQAResult["verdict"]
    if (hardFailed) {
      verdict = "fail"
    } else if (overall < this.config.thresholds.retryFloor) {
      verdict = "fail"
    } else if (retryCapped || overall < this.config.thresholds.pass) {
      verdict = "retry"
    } else {
      verdict = "pass"
    }

    return {
      verdict,
      checks: [
        ...similarity.checks, ...histogram.checks, ...metadata.checks,
        ...identity.checks, ...fidelity.checks, ...realism.checks,
        ...extensionChecks,
      ],
      realismScore:  round3(realism.score),
      fidelityScore: round3(fidelity.score),
      overallScore:    round3(overall),
      similarityScore: round3(similarity.score),
      identityScore:   round3(identity.score),
      metadataScore:   round3(metadata.score),
      histogramScore:  round3(histogram.score),
      failureReasons:  [...new Set(allReasons)],
      metrics: Object.assign({}, ...modules.map((m) => m.metrics)),
      configVersion:   QA_CONFIG_VERSION,
      evaluationMs:    Date.now() - started,
    }
  }

  private failResult(reason: string, detail: string, started: number): PreviewQAResult {
    return {
      verdict: "fail",
      checks:  [{ name: "metadata-file-integrity", passed: false, detail }],
      realismScore: null, fidelityScore: null,
      overallScore: 0, similarityScore: null, identityScore: null,
      metadataScore: 0, histogramScore: null,
      failureReasons: [reason],
      metrics: {},
      configVersion: QA_CONFIG_VERSION,
      evaluationMs: Date.now() - started,
    }
  }
}

/**
 * Reasons that cap the verdict at RETRY regardless of composite score.
 * Wrong-direction fidelity, invisible edits, tonal-integrity breaks and
 * realism artefacts are all correctable by a refined prompt — they must
 * never publish, but they don't warrant giving up either.
 * ("-too-weak" neutrals are informational and deliberately absent.)
 */
const RETRY_CAP_REASONS = new Set([
  "edit-invisible",
  "wb-went-cool", "wb-went-warm",
  "exposure-went-dark", "exposure-went-bright",
  "saturation-dropped", "saturation-rose",
  "contrast-dropped", "contrast-rose",
  "shadows-lifted", "shadows-deepened",
  "highlights-blown", "palette-off-lean", "grade-off-target",
  "channel-collapsed", "luminance-shifted",
  "clipping-introduced", "posterized", "oversaturated", "oversharpened-or-noisy",
])

/** Normalize the weighted sum by the total weight so overall ∈ [0,1]. */
function normFactor(w: QAConfig["weights"]): number {
  const total = w.similarity + w.identity + w.fidelity + w.realism + w.metadata
  return total > 0 ? 1 / total : 1
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

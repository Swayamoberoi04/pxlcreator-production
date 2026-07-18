/**
 * src/lib/ai/preview/qa/fidelity.ts
 *
 * Preset Fidelity Engine (Phase 4C §5).
 *
 * Two grounded signals decide whether the AI preview actually delivers
 * the recommended preset's look:
 *
 * 1. REFERENCE COMPARISON — the gate renders a deterministic Sharp
 *    reference (the style profile's own adjustments applied to the
 *    original via the untouched Phase 1 pipeline) and this module
 *    measures how close the AI preview's tonal distribution is to that
 *    reference. The preset's look is thereby a concrete target, not an
 *    adjective.
 *
 * 2. DIRECTION CHECKS — every promise the Preset Intelligence entry
 *    makes (white balance lean, exposure tendency, saturation level,
 *    contrast level, shadow depth, black level, highlight behaviour,
 *    dominant palette lean) is converted into an expected direction of
 *    change original→preview and verified against measured deltas.
 *    Moves in the promised direction = match; no movement = neutral;
 *    movement against the promise = mismatch (and a machine-readable
 *    reason the Prompt Refinement engine turns into a correction).
 */

import type { QAConfig } from "./config"
import type { ImageFeatures } from "./features"
import type { QAModuleResult } from "./types"
import type { PresetIntelligence } from "@/types/preset-intelligence"
import type { PreviewQACheck } from "@/types/preview"
import { clamp01, histogramIntersection } from "./types"

export function evaluateFidelity(
  original:  ImageFeatures,
  preview:   ImageFeatures,
  config:    QAConfig,
  presetIntel?: PresetIntelligence,
  reference?:   ImageFeatures        // Sharp render of the target grade
): QAModuleResult {
  const dead = config.fidelity.directionDeadZone * 255   // dead zone in luminance levels

  const checks: PreviewQACheck[] = []
  const reasons: string[] = []
  const metrics: Record<string, number> = {}

  /* ── 1. Reference comparison ─────────────────────────────── */
  let referenceScore = 0.6   // neutral default when no reference is available
  if (reference) {
    const inter =
      (histogramIntersection(reference.histR, preview.histR) +
       histogramIntersection(reference.histG, preview.histG) +
       histogramIntersection(reference.histB, preview.histB) +
       histogramIntersection(reference.histL, preview.histL)) / 4
    metrics.referenceIntersection = round3(inter)
    const ok = inter >= config.fidelity.minReferenceIntersection
    referenceScore = clamp01((inter - 0.15) / 0.6)
    checks.push({
      name:   "fidelity-reference-histogram",
      passed: ok,
      detail: `intersection with Sharp reference ${round3(inter)} (min ${config.fidelity.minReferenceIntersection})`,
    })
    if (!ok) reasons.push("grade-off-target")
  }

  /* ── 2. Direction checks from preset intelligence ────────── */
  let matched = 0, neutral = 0, total = 0
  const direction = (
    name: string, delta: number, expect: 1 | -1, wrongReason: string, weakReason: string
  ) => {
    total++
    metrics[name] = round3(delta)
    if (Math.abs(delta) <= dead) {
      neutral++
      checks.push({ name: `fidelity-${name}`, passed: true, detail: `Δ ${round3(delta)} (neutral, dead zone ±${round3(dead)})` })
      reasons.push(weakReason)
    } else if (Math.sign(delta) === expect) {
      matched++
      checks.push({ name: `fidelity-${name}`, passed: true, detail: `Δ ${round3(delta)} matches promised direction` })
    } else {
      checks.push({ name: `fidelity-${name}`, passed: false, detail: `Δ ${round3(delta)} against promised direction` })
      reasons.push(wrongReason)
    }
  }

  if (presetIntel) {
    /* White balance / colour temperature: warmth = meanR − meanB */
    const warmthDelta = (preview.meanR - preview.meanB) - (original.meanR - original.meanB)
    if (presetIntel.whiteBalance.includes("warm")) {
      direction("warmth", warmthDelta, 1, "wb-went-cool", "wb-too-weak")
    } else if (presetIntel.whiteBalance.includes("cool")) {
      direction("warmth", warmthDelta, -1, "wb-went-warm", "wb-too-weak")
    }

    /* Exposure tendency: mean luminance */
    const lumDelta = preview.meanL - original.meanL
    if (presetIntel.exposureTendency === "lifts")   direction("exposure", lumDelta, 1,  "exposure-went-dark",   "exposure-too-weak")
    if (presetIntel.exposureTendency === "darkens") direction("exposure", lumDelta, -1, "exposure-went-bright", "exposure-too-weak")

    /* Saturation level: mean chroma */
    const chromaDelta = preview.meanChroma - original.meanChroma
    if (presetIntel.saturationLevel === "boosted") direction("saturation", chromaDelta, 1,  "saturation-dropped", "saturation-too-weak")
    if (presetIntel.saturationLevel === "reduced") direction("saturation", chromaDelta, -1, "saturation-rose",    "saturation-too-weak")

    /* Contrast level: luminance standard deviation */
    const contrastDelta = preview.stdL - original.stdL
    if (presetIntel.contrastLevel === "high") direction("contrast", contrastDelta, 1,  "contrast-dropped", "contrast-too-weak")
    if (presetIntel.contrastLevel === "low")  direction("contrast", contrastDelta, -1, "contrast-rose",    "contrast-too-weak")

    /* Shadow behaviour: bottom-eighth luminance mass */
    const shadowDelta = preview.shadowMass - original.shadowMass
    if (presetIntel.shadowDepth === "high" || presetIntel.blackLevel === "crushed") {
      direction("shadows", shadowDelta, 1, "shadows-lifted", "shadows-too-weak")
    } else if (presetIntel.shadowDepth === "low" || presetIntel.blackLevel === "lifted") {
      direction("shadows", shadowDelta, -1, "shadows-deepened", "shadows-too-weak")
    }

    /* Highlight behaviour: strong recovery must not blow highlights further */
    if (presetIntel.highlightRecovery === "high") {
      const hlDelta = preview.highlightMass - original.highlightMass
      total++
      metrics.highlightMassDelta = round3(hlDelta)
      const ok = hlDelta <= 0.05
      if (ok) matched++
      else reasons.push("highlights-blown")
      checks.push({ name: "fidelity-highlights", passed: ok, detail: `highlight-mass Δ ${round3(hlDelta)} (max +0.05)` })
    }

    /* Dominant palette lean: preview should lean the way the palette leans */
    const palette = paletteMeanRgb(presetIntel.colorPalette)
    if (palette && Math.abs(palette.r - palette.b) > 12) {
      const paletteLean = Math.sign(palette.r - palette.b) as 1 | -1
      const previewLean = (preview.meanR - preview.meanB) - (original.meanR - original.meanB)
      direction("palette-lean", previewLean, paletteLean, "palette-off-lean", "palette-too-weak")
    }
  }

  const directionScore = total > 0 ? (matched + neutral * 0.5) / total : 0.6
  metrics.directionScore = round3(directionScore)

  const score = clamp01(0.45 * referenceScore + 0.55 * directionScore)

  return { score, hardFail: false, reasons: dedupe(reasons), metrics, checks }
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function paletteMeanRgb(palette: string[]): { r: number; g: number; b: number } | null {
  const rgbs = palette
    .map((hex) => {
      const m = hex.trim().replace("#", "")
      if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
      return {
        r: parseInt(m.slice(0, 2), 16),
        g: parseInt(m.slice(2, 4), 16),
        b: parseInt(m.slice(4, 6), 16),
      }
    })
    .filter((x): x is { r: number; g: number; b: number } => x !== null)
  if (rgbs.length === 0) return null
  return {
    r: rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length,
    g: rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length,
    b: rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length,
  }
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

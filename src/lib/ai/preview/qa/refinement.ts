/**
 * src/lib/ai/preview/qa/refinement.ts
 *
 * Prompt Refinement (Phase 4C §10).
 *
 * When QA returns RETRY, this module converts the machine-readable
 * failure reasons into corrective clauses appended to the ORIGINAL
 * instruction. The identity lock (Part A) is untouched and remains
 * first — corrections only ever adjust grade, lighting, and mood,
 * never identity, composition, or geometry.
 *
 * Deterministic: same reasons (order-independent) → same corrective
 * text. Versioned so retried jobs are attributable to the exact
 * refinement logic that produced them.
 */

export const REFINEMENT_VERSION = "r4c.1.0.0"

/** reason → corrective clause. Only grade/lighting/mood language. */
const CORRECTIONS: Record<string, string> = {
  /* similarity */
  "edit-invisible":       "The previous attempt changed the image too little — apply the described color grade decisively so the difference is clearly visible.",
  /* histogram */
  "luminance-shifted":    "Keep overall brightness much closer to the original exposure.",
  "channel-collapsed":    "Preserve the full tonal range of every color channel; do not flatten any channel.",
  /* fidelity — wrong direction */
  "wb-went-cool":         "The result drifted cool — shift the white balance warmer as specified.",
  "wb-went-warm":         "The result drifted warm — shift the white balance cooler as specified.",
  "exposure-went-dark":   "The midtones came out darker — brighten them slightly as specified.",
  "exposure-went-bright": "The midtones came out brighter — darken them slightly as specified.",
  "saturation-dropped":   "Saturation fell — enrich the colors as specified.",
  "saturation-rose":      "Saturation rose — mute the colors as specified.",
  "contrast-dropped":     "Contrast fell — increase tonal contrast as specified.",
  "contrast-rose":        "Contrast rose too much — soften the tonal contrast.",
  "shadows-lifted":       "Shadows came out lifted — deepen the shadows as specified.",
  "shadows-deepened":     "Shadows came out too deep — lift the shadows gently as specified.",
  "highlights-blown":     "Highlights were pushed toward clipping — pull the brightest areas back.",
  "palette-off-lean":     "Steer the overall palette toward the specified dominant tones.",
  "grade-off-target":     "Follow the specified grade description more literally.",
  /* fidelity — too weak */
  "wb-too-weak":          "Apply the specified white-balance shift more strongly.",
  "exposure-too-weak":    "Apply the specified exposure adjustment more visibly.",
  "saturation-too-weak":  "Apply the specified saturation change more visibly.",
  "contrast-too-weak":    "Apply the specified contrast change more visibly.",
  "shadows-too-weak":     "Apply the specified shadow treatment more visibly.",
  "palette-too-weak":     "Push the palette further toward the specified dominant tones.",
  /* realism */
  "clipping-introduced":  "Avoid crushing blacks or blowing highlights to pure black/white.",
  "posterized":           "Preserve smooth tonal gradients; avoid banding or posterization.",
  "oversaturated":        "Reduce saturation to natural, photographic levels.",
  "oversharpened-or-noisy": "Do not add sharpening, grain, or noise — keep the original texture exactly.",
}

/** Reasons that describe unfixable-by-prompt failures — no clause emitted. */
const NON_CORRECTABLE = new Set([
  "composition-replaced", "aspect-changed", "orientation-changed",
  "resolution-too-low", "structure-diverged", "edges-diverged", "corrupt-file",
])

export interface RefinedPrompt {
  instruction:       string
  refinementVersion: string
  correctionsApplied: string[]
}

export function buildCorrectiveInstruction(
  baseInstruction: string,
  reasons:         string[]
): RefinedPrompt {
  /* Deterministic order regardless of module evaluation order */
  const applicable = [...new Set(reasons)]
    .filter((r) => !NON_CORRECTABLE.has(r) && CORRECTIONS[r])
    .sort()
    .slice(0, 4)   // token economy: the four most alphabetically-stable corrections

  if (applicable.length === 0) {
    return { instruction: baseInstruction, refinementVersion: REFINEMENT_VERSION, correctionsApplied: [] }
  }

  const correctiveBlock = [
    "CORRECTIONS to the previous attempt (change ONLY color grading, lighting, tone, and mood — never content, composition, or geometry):",
    ...applicable.map((r) => `- ${CORRECTIONS[r]}`),
  ].join("\n")

  return {
    instruction:        `${baseInstruction}\n\n${correctiveBlock}`,
    refinementVersion:  REFINEMENT_VERSION,
    correctionsApplied: applicable,
  }
}

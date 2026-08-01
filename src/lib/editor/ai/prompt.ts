/**
 * src/lib/editor/ai/prompt.ts
 *
 * Natural-language editing. A rule/intent parser maps phrases in the user's
 * prompt to concrete slider moves, accumulating every matched intent into one
 * `AiEdit`. It's transparent (the result lists what it did and why) and works
 * offline. The `Intent[]` table is the single place to extend vocabulary, and
 * the same shape a cloud LLM would target if wired in later.
 */

import type { AiEdit, AiPatch, HslDelta } from "./patch"

interface Intent {
  keys: string[]
  label: string
  patch: AiPatch
}

const INTENTS: Intent[] = [
  { keys: ["cinematic", "cinema", "movie"], label: "cinematic teal-and-orange grade", patch: { adjustments: { contrast: 16, saturation: -14, blacks: 10, highlights: -10 }, grading: { shadows: { hue: 205, sat: 24 }, highlights: { hue: 42, sat: 20 } } } },
  { keys: ["warm", "sunset", "golden", "cozy", "cosy"], label: "warmer, golden tone", patch: { adjustments: { temperature: 22, vibrance: 10, highlights: -6 }, grading: { highlights: { hue: 40, sat: 16 } } } },
  { keys: ["cool", "cold", "icy", "blue tone"], label: "cooler tone", patch: { adjustments: { temperature: -20 } } },
  { keys: ["kodak", "gold 200", "portra", "film", "analog", "analogue", "vintage", "retro"], label: "vintage film emulation", patch: { adjustments: { temperature: 10, blacks: 18, contrast: -4, saturation: -6 }, grain: { amount: 26 }, grading: { shadows: { hue: 150, sat: 10 } } } },
  { keys: ["dramatic", "contrasty", "high contrast", "punch"], label: "dramatic contrast", patch: { adjustments: { contrast: 22, shadows: -14, blacks: -8, clarity: 10 } } },
  { keys: ["moody", "gloomy", "somber", "sombre"], label: "moody, desaturated mood", patch: { adjustments: { exposure: -8, saturation: -18, contrast: 14, temperature: -6, shadows: -10 } } },
  { keys: ["reduce orange", "less orange", "tone down orange", "orange tones"], label: "reduced orange tones", patch: { hsl: [{ band: 1, s: -28, l: -4 }] } },
  { keys: ["reduce green", "less green", "tame green", "green tones"], label: "reduced green tones", patch: { hsl: [{ band: 3, s: -24, l: -4 }] } },
  { keys: ["sky pop", "make the sky pop", "blue sky", "deeper sky", "sky"], label: "punchier sky", patch: { adjustments: { dehaze: 14, contrast: 6 }, hsl: [{ band: 5, s: 24, l: -6 }] } },
  { keys: ["vibrant", "colorful", "colourful", "vivid", "pop the colors", "pop the colours"], label: "more vibrant colour", patch: { adjustments: { vibrance: 24, clarity: 10, saturation: 6 } } },
  { keys: ["black and white", "b&w", "bw", "monochrome", "mono", "grayscale", "greyscale"], label: "black & white", patch: { adjustments: { saturation: -100, contrast: 12, clarity: 10 } } },
  { keys: ["bright", "brighten", "lighter", "lift"], label: "brighter exposure", patch: { adjustments: { exposure: 16 } } },
  { keys: ["darken", "darker", "moody dark"], label: "darker exposure", patch: { adjustments: { exposure: -14 } } },
  { keys: ["soft", "dreamy", "hazy", "ethereal"], label: "soft, dreamy feel", patch: { adjustments: { clarity: -14, dehaze: -8, contrast: -6 } } },
  { keys: ["sharp", "crisp", "detailed", "sharpen"], label: "crisper detail", patch: { adjustments: { clarity: 16, texture: 16, sharpening: 25 } } },
  { keys: ["fade", "faded", "matte", "washed"], label: "matte fade", patch: { adjustments: { blacks: 22, contrast: -12, highlights: -8, saturation: -10 } } },
  { keys: ["teal and orange", "teal orange"], label: "teal-and-orange split tone", patch: { grading: { shadows: { hue: 190, sat: 26 }, highlights: { hue: 40, sat: 24 } } } },
  { keys: ["skin", "portrait glow", "flattering"], label: "flattering skin tones", patch: { adjustments: { temperature: 8, texture: -8, clarity: -6, shadows: 8 } } },
  { keys: ["natural", "clean", "true to life", "realistic"], label: "clean, natural look", patch: { adjustments: { vibrance: 8, contrast: 6, highlights: -4, shadows: 4 } } },
  { keys: ["hdr", "recover", "balanced tones"], label: "HDR tone balance", patch: { adjustments: { highlights: -35, shadows: 32, whites: -10, blacks: 12, clarity: 12 } } },
]

function addAdj(acc: NonNullable<AiPatch["adjustments"]>, add?: AiPatch["adjustments"]) {
  if (!add) return
  for (const [k, v] of Object.entries(add)) {
    acc[k as keyof typeof acc] = (acc[k as keyof typeof acc] ?? 0) + (v as number)
  }
}
function mergeHsl(acc: HslDelta[], add?: HslDelta[]) {
  if (!add) return
  for (const d of add) {
    const ex = acc.find((x) => x.band === d.band)
    if (ex) {
      ex.h = (ex.h ?? 0) + (d.h ?? 0)
      ex.s = (ex.s ?? 0) + (d.s ?? 0)
      ex.l = (ex.l ?? 0) + (d.l ?? 0)
    } else acc.push({ ...d })
  }
}

/**
 * Parse a natural-language prompt into a single applyable edit.
 * Returns null when no intent is recognised.
 */
export function parsePrompt(prompt: string): AiEdit | null {
  const text = ` ${prompt.toLowerCase()} `
  const adjustments: NonNullable<AiPatch["adjustments"]> = {}
  const hsl: HslDelta[] = []
  let grading: AiPatch["grading"] | undefined
  let grain: AiPatch["grain"] | undefined
  const labels: string[] = []

  for (const intent of INTENTS) {
    if (intent.keys.some((k) => text.includes(k))) {
      addAdj(adjustments, intent.patch.adjustments)
      mergeHsl(hsl, intent.patch.hsl)
      if (intent.patch.grading) grading = { ...grading, ...intent.patch.grading }
      if (intent.patch.grain) grain = { ...grain, ...intent.patch.grain }
      labels.push(intent.label)
    }
  }

  if (labels.length === 0) return null

  const patch: AiPatch = {}
  if (Object.keys(adjustments).length) patch.adjustments = adjustments
  if (hsl.length) patch.hsl = hsl
  if (grading) patch.grading = grading
  if (grain) patch.grain = grain

  const changes: string[] = []
  if (patch.adjustments) for (const [k, v] of Object.entries(patch.adjustments)) changes.push(`${k} ${v > 0 ? "+" : ""}${v}`)
  if (patch.hsl) for (const d of patch.hsl) if (d.s) changes.push(`HSL band ${d.band} sat ${d.s > 0 ? "+" : ""}${d.s}`)
  if (patch.grading) changes.push("color grading")
  if (patch.grain) changes.push("grain")

  return {
    id: `prompt_${Date.now()}`,
    title: "Prompt edit",
    why: `Interpreted your prompt as: ${labels.join(", ")}.`,
    patch,
    additive: true,
    changes,
  }
}

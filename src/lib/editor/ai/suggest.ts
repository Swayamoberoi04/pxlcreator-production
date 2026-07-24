/**
 * src/lib/editor/ai/suggest.ts
 *
 * The assistant's "brain" for two things:
 *   1. `recommend(analysis)` — image-specific, additive suggestions with a WHY.
 *   2. `LOOKS` / `resolveLook` — the 14 one-click looks (replace the settings),
 *      a couple of which adapt their strength to the analysis.
 * Plus `generateRecipeName` for the recipe generator.
 *
 * Nothing here is a black box: every suggestion is expressed as concrete slider
 * moves (an `AiEdit`) the user can see, apply, tweak, and undo.
 */

import type { ImageAnalysis } from "./analyze"
import type { AiEdit, AiPatch } from "./patch"

let uid = 0
const edit = (title: string, why: string, patch: AiPatch, changes: string[], additive = true): AiEdit => ({
  id: `ai_${++uid}`,
  title,
  why,
  patch,
  additive,
  changes,
})

/* ─────────────────────────────────────────────────────────────
   IMAGE-SPECIFIC RECOMMENDATIONS
───────────────────────────────────────────────────────────── */
export function recommend(a: ImageAnalysis): AiEdit[] {
  const s = a.stats
  const out: AiEdit[] = []

  if (s.highlightClip > 0.03 || (s.skyRatio > 0.15 && s.meanLuma > 0.55)) {
    out.push(
      edit(
        "Recover highlights",
        `${s.highlightClip > 0.03 ? `${(s.highlightClip * 100).toFixed(0)}% of highlights are clipping` : "the sky is very bright"} — pulling highlights and whites down brings back that detail.`,
        { adjustments: { highlights: -35, whites: -12 } },
        ["Highlights −35", "Whites −12"]
      )
    )
  }
  if (s.shadowClip > 0.05 || s.meanLuma < 0.4) {
    out.push(
      edit(
        "Reveal shadow detail",
        `the darker areas are losing detail — lifting shadows opens up the foreground.`,
        { adjustments: { shadows: 30, blacks: 8 } },
        ["Shadows +30", "Blacks +8"]
      )
    )
  }
  if (s.meanLuma > 0.72) {
    out.push(edit("Fix over-exposure", "the image reads too bright overall; a small exposure pull balances it.", { adjustments: { exposure: -18 } }, ["Exposure −18"]))
  } else if (s.meanLuma < 0.2) {
    out.push(edit("Brighten exposure", "the image is quite dark; lifting exposure recovers the midtones.", { adjustments: { exposure: 20 } }, ["Exposure +20"]))
  }
  if (Math.abs(s.temperatureCast) > 0.2) {
    const warm = s.temperatureCast > 0
    out.push(
      edit(
        warm ? "Cool the white balance" : "Warm the white balance",
        `the white balance leans ${warm ? "warm/orange" : "cool/blue"} — nudging temperature the other way neutralises it.`,
        { adjustments: { temperature: warm ? -16 : 16 } },
        [`Temperature ${warm ? "−16" : "+16"}`]
      )
    )
  }
  if (s.dynamicRange < 0.45) {
    out.push(edit("Add contrast", "the tonal range is flat — a contrast boost gives the image punch and depth.", { adjustments: { contrast: 18, blacks: -6 } }, ["Contrast +18", "Blacks −6"]))
  }
  if (a.scene === "landscape" || a.scene === "nature") {
    out.push(edit("Enhance the landscape", "landscapes benefit from extra clarity and vibrance to bring out texture and colour.", { adjustments: { clarity: 20, vibrance: 18, dehaze: 10 } }, ["Clarity +20", "Vibrance +18", "Dehaze +10"]))
  }
  if (a.scene === "architecture") {
    out.push(edit("Sharpen the architecture", "architectural shots pop with more texture and clarity on the lines and surfaces.", { adjustments: { texture: 22, clarity: 16, sharpening: 20 } }, ["Texture +22", "Clarity +16", "Sharpening +20"]))
  }
  if (s.foliageRatio > 0.22 && s.saturation > 0.32) {
    out.push(edit("Tame the greens", "the greens are quite saturated — easing green saturation and luminance looks more natural.", { hsl: [{ band: 3, s: -22, l: -6 }] }, ["Green saturation −22"]))
  }
  if (a.scene === "portrait" && s.skinRatio > 0.06) {
    out.push(edit("Improve skin tones", "for portraits, easing texture and warming slightly gives smoother, healthier skin.", { adjustments: { texture: -10, clarity: -6, temperature: 6, shadows: 8 } }, ["Texture −10", "Clarity −6", "Temperature +6", "Shadows +8"]))
  }
  if (s.skyRatio > 0.12) {
    out.push(edit("Make the sky pop", "there's a lot of sky — boosting blue saturation with dehaze deepens it.", { adjustments: { dehaze: 12 }, hsl: [{ band: 5, s: 20, l: -6 }] }, ["Dehaze +12", "Blue saturation +20"]))
  }
  if (s.noise > 0.45) {
    out.push(edit("Reduce noise", "there's visible noise — luminance noise reduction cleans it up.", { noise: { luminance: 35, color: 20 } }, ["Luminance NR +35", "Color NR +20"]))
  }
  if (s.saturation < 0.14 && a.scene !== "portrait") {
    out.push(edit("Add colour", "the image looks a little flat in colour — vibrance lifts it without over-saturating skin.", { adjustments: { vibrance: 20 } }, ["Vibrance +20"]))
  }

  return out
}

/* ─────────────────────────────────────────────────────────────
   ONE-CLICK LOOKS
───────────────────────────────────────────────────────────── */
export interface Look {
  id: string
  name: string
  emoji: string
  patch: AiPatch
  /** Optional per-image strength adaptation. */
  adapt?: (a: ImageAnalysis) => AiPatch
}

export const LOOKS: Look[] = [
  { id: "landscape", name: "Landscape", emoji: "🏔️", patch: { adjustments: { clarity: 26, vibrance: 22, dehaze: 14, contrast: 10, highlights: -16, shadows: 14, saturation: 4 }, hsl: [{ band: 5, s: 16 }] } },
  { id: "portrait", name: "Portrait", emoji: "🧑", patch: { adjustments: { clarity: -8, texture: -6, temperature: 6, exposure: 5, highlights: -10, shadows: 10, vibrance: 8, saturation: -3 } } },
  { id: "street", name: "Street", emoji: "🏙️", patch: { adjustments: { contrast: 24, clarity: 20, saturation: -14, blacks: -14, temperature: -4, texture: 10 } } },
  { id: "golden", name: "Golden Hour", emoji: "🌅", patch: { adjustments: { temperature: 28, tint: 4, highlights: -10, shadows: 12, vibrance: 14, contrast: 6 }, grading: { highlights: { hue: 38, sat: 22 }, shadows: { hue: 30, sat: 10 } } } },
  { id: "cinematic", name: "Cinematic", emoji: "🎬", patch: { adjustments: { contrast: 18, saturation: -16, blacks: 12, highlights: -12, clarity: 8 }, grading: { shadows: { hue: 205, sat: 26 }, highlights: { hue: 42, sat: 22 }, balance: -10 } } },
  { id: "moody", name: "Moody", emoji: "🌫️", patch: { adjustments: { exposure: -8, contrast: 16, saturation: -22, temperature: -8, shadows: -12, blacks: 8, dehaze: -6 } } },
  { id: "film", name: "Film Look", emoji: "🎞️", patch: { adjustments: { contrast: -6, blacks: 20, highlights: -8, saturation: -8, temperature: 8 }, grain: { amount: 28, size: 30 }, grading: { shadows: { hue: 150, sat: 10 } } } },
  { id: "instagram", name: "Instagram", emoji: "📸", patch: { adjustments: { contrast: 14, vibrance: 24, clarity: 12, saturation: 6, highlights: -8, sharpening: 15 } } },
  { id: "night", name: "Night", emoji: "🌃", patch: { adjustments: { exposure: 14, shadows: 30, highlights: -10, clarity: 8, temperature: -4, blacks: -6 }, noise: { luminance: 30, color: 18 } } },
  {
    id: "lowlight",
    name: "Low-Light Recovery",
    emoji: "🔦",
    patch: { adjustments: { exposure: 22, shadows: 34, contrast: 8 }, noise: { luminance: 35, color: 22 } },
    adapt: (a) => {
      const boost = a.stats.meanLuma < 0.3 ? Math.round((0.3 - a.stats.meanLuma) * 120) : 0
      return { adjustments: { exposure: 22 + boost, shadows: 34, contrast: 8 }, noise: { luminance: 35, color: 22 } }
    },
  },
  { id: "hdr", name: "HDR Recovery", emoji: "🌗", patch: { adjustments: { highlights: -45, shadows: 40, whites: -14, blacks: 15, clarity: 18, dehaze: 10, vibrance: 8 } } },
  { id: "natural", name: "Natural", emoji: "🍃", patch: { adjustments: { contrast: 6, vibrance: 8, clarity: 4, highlights: -6, shadows: 6 } } },
  { id: "minimal", name: "Minimal", emoji: "◽", patch: { adjustments: { saturation: -26, contrast: 8, whites: 8, clarity: -4, temperature: 2 } } },
  { id: "luxury", name: "Luxury", emoji: "💎", patch: { adjustments: { contrast: 12, saturation: -6, blacks: 6, clarity: 8, temperature: 6 }, grading: { highlights: { hue: 44, sat: 14 } }, vignette: { amount: -16, feather: 60 } } },
]

export function resolveLook(look: Look, analysis: ImageAnalysis | null): AiEdit {
  const patch = look.adapt && analysis ? look.adapt(analysis) : look.patch
  const changes = summarisePatch(patch)
  return {
    id: `look_${look.id}`,
    title: look.name,
    why: `A ready-made ${look.name} grade applied across the tone, colour and detail controls.`,
    patch,
    additive: false,
    changes,
  }
}

function summarisePatch(p: AiPatch): string[] {
  const out: string[] = []
  if (p.adjustments) for (const [k, v] of Object.entries(p.adjustments)) out.push(`${cap(k)} ${fmt(v as number)}`)
  if (p.hsl) for (const d of p.hsl) if (d.s) out.push(`HSL band ${d.band} sat ${fmt(d.s)}`)
  if (p.grading) out.push("Color grading")
  if (p.grain?.amount) out.push(`Grain ${fmt(p.grain.amount)}`)
  if (p.noise?.luminance) out.push(`Noise reduction ${fmt(p.noise.luminance)}`)
  if (p.vignette?.amount) out.push(`Vignette ${fmt(p.vignette.amount)}`)
  return out
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fmt = (v: number) => (v > 0 ? `+${v}` : `${v}`)

/* ─────────────────────────────────────────────────────────────
   RECIPE NAME GENERATOR
───────────────────────────────────────────────────────────── */
const ADJ = ["Midnight", "Golden", "Nordic", "Vintage", "Ocean", "Neo", "Velvet", "Amber", "Cobalt", "Dusk", "Ember", "Silver", "Crimson", "Coastal", "Urban", "Faded", "Muted", "Electric", "Serene", "Wild"]
const NOUN = ["Urban", "Serenity", "Film", "Streets", "Breeze", "Tokyo", "Haze", "Bloom", "Frost", "Mirage", "Drift", "Glow", "Tide", "Fields", "Nights", "Portrait", "Horizon", "Chrome", "Ember", "Fade"]

/** Generate a stylish recipe name, optionally biased by the look/scene. */
export function generateRecipeName(seed?: string): string {
  const h = hash(seed ?? `${Date.now()}${Math.random()}`)
  const a = ADJ[h % ADJ.length]
  const n = NOUN[(h >> 8) % NOUN.length]
  return `${a} ${n}`
}
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

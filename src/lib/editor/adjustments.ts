/**
 * src/lib/editor/adjustments.ts
 *
 * The single source of truth for the editor's non-destructive parameter model.
 *
 * WHY THIS EXISTS
 * ---------------
 * The whole editor is "non-destructive": we never bake pixels: we only ever
 * store a small bag of numbers (the `Adjustments`) plus a `Geometry`. The
 * WebGL engine renders the final look from those numbers on every frame, and
 * export re-renders from the exact same numbers at full resolution. Because
 * every consumer (shader uniforms, the slider UI, history snapshots, export)
 * reads this one file, adding or renaming a control surfaces as a compile
 * error everywhere instead of a silent mismatch.
 */

/* ─────────────────────────────────────────────────────────────
   ADJUSTMENTS — the tonal / colour / detail parameters
   Every value is a plain slider number. -100..100 (0 = no change)
   for bipolar controls, 0..100 for uni-polar ones (sharpening).
───────────────────────────────────────────────────────────── */
export interface Adjustments {
  // LIGHT
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  whites: number
  blacks: number
  // COLOR
  temperature: number
  tint: number
  vibrance: number
  saturation: number
  // DETAIL
  texture: number
  clarity: number
  dehaze: number
  sharpening: number
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  sharpening: 0,
}

export type AdjustmentKey = keyof Adjustments

/* ─────────────────────────────────────────────────────────────
   GEOMETRY — crop / rotate / flip / straighten
   Kept separate from Adjustments because it changes the output
   dimensions and is applied by the 2D compositor, not the shader.
───────────────────────────────────────────────────────────── */
export interface CropRect {
  /** All normalised 0..1 relative to the *oriented* (rotated/flipped) image. */
  x: number
  y: number
  w: number
  h: number
}

export interface Geometry {
  /** Number of 90° clockwise quarter-turns: 0, 1, 2 or 3. */
  rotate90: 0 | 1 | 2 | 3
  flipH: boolean
  flipV: boolean
  /** Fine straighten angle in degrees, -45..45. */
  straighten: number
  /** Active crop, or null for the full frame. */
  crop: CropRect | null
}

export const DEFAULT_GEOMETRY: Geometry = {
  rotate90: 0,
  flipH: false,
  flipV: false,
  straighten: 0,
  crop: null,
}

/* ─────────────────────────────────────────────────────────────
   UI METADATA
   Drives the collapsible sections and sliders in the right panel
   so the UI stays perfectly in sync with the model above.
───────────────────────────────────────────────────────────── */
export interface SliderMeta {
  key: AdjustmentKey
  label: string
  min: number
  max: number
  /** Value that represents "no change" — double-click resets to this. */
  center: number
}

export interface SectionMeta {
  id: string
  title: string
  sliders: SliderMeta[]
}

const bipolar = (key: AdjustmentKey, label: string): SliderMeta => ({
  key,
  label,
  min: -100,
  max: 100,
  center: 0,
})

export const EDIT_SECTIONS: SectionMeta[] = [
  {
    id: "light",
    title: "Light",
    sliders: [
      bipolar("exposure", "Exposure"),
      bipolar("contrast", "Contrast"),
      bipolar("highlights", "Highlights"),
      bipolar("shadows", "Shadows"),
      bipolar("whites", "Whites"),
      bipolar("blacks", "Blacks"),
    ],
  },
  {
    id: "color",
    title: "Color",
    sliders: [
      bipolar("temperature", "Temperature"),
      bipolar("tint", "Tint"),
      bipolar("vibrance", "Vibrance"),
      bipolar("saturation", "Saturation"),
    ],
  },
  {
    id: "detail",
    title: "Detail",
    sliders: [
      bipolar("texture", "Texture"),
      bipolar("clarity", "Clarity"),
      bipolar("dehaze", "Dehaze"),
      { key: "sharpening", label: "Sharpening", min: 0, max: 100, center: 0 },
    ],
  },
]

/** True when the user has moved anything away from the AI original. */
export function hasEdits(a: Adjustments, g: Geometry): boolean {
  const adjusted = (Object.keys(DEFAULT_ADJUSTMENTS) as AdjustmentKey[]).some(
    (k) => a[k] !== DEFAULT_ADJUSTMENTS[k]
  )
  const geo =
    g.rotate90 !== 0 ||
    g.flipH ||
    g.flipV ||
    g.straighten !== 0 ||
    g.crop !== null
  return adjusted || geo
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 2 — Curves · HSL · Color Grading · Vignette · Grain · Noise
   These live as their own state groups (not in `Adjustments`) because
   they carry their own shapes (arrays, nested zones) and their own
   panel UIs. The shader consumes them alongside `Adjustments`.
═══════════════════════════════════════════════════════════════ */

/* ── Tone Curves ── */
export interface CurvePoint {
  /** Both normalised 0..1. x = input tone, y = output tone. */
  x: number
  y: number
}
export type CurveChannel = "rgb" | "r" | "g" | "b"
export interface Curves {
  rgb: CurvePoint[]
  r: CurvePoint[]
  g: CurvePoint[]
  b: CurvePoint[]
}
export const DEFAULT_CURVE: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]
export const DEFAULT_CURVES: Curves = {
  rgb: [...DEFAULT_CURVE.map((p) => ({ ...p }))],
  r: [...DEFAULT_CURVE.map((p) => ({ ...p }))],
  g: [...DEFAULT_CURVE.map((p) => ({ ...p }))],
  b: [...DEFAULT_CURVE.map((p) => ({ ...p }))],
}

/* ── HSL — 8 colour bands, each Hue / Saturation / Luminance ── */
export interface HSLBand {
  h: number // -100..100
  s: number // -100..100
  l: number // -100..100
}
export type HSL = HSLBand[] // always length 8
export const HSL_BANDS: { name: string; color: string }[] = [
  { name: "Red", color: "#e5484d" },
  { name: "Orange", color: "#e8843c" },
  { name: "Yellow", color: "#e5c122" },
  { name: "Green", color: "#46b354" },
  { name: "Aqua", color: "#28b3b3" },
  { name: "Blue", color: "#3a7bd5" },
  { name: "Purple", color: "#8a5cd0" },
  { name: "Magenta", color: "#d24d9c" },
]
export const DEFAULT_HSL: HSL = HSL_BANDS.map(() => ({ h: 0, s: 0, l: 0 }))

/* ── Color Grading — 3-way wheels + global ── */
export interface GradeZone {
  hue: number // 0..360
  sat: number // 0..100
  lum: number // -100..100
}
export type GradeZoneKey = "shadows" | "midtones" | "highlights" | "global"
export interface ColorGrading {
  shadows: GradeZone
  midtones: GradeZone
  highlights: GradeZone
  global: GradeZone
  blending: number // 0..100
  balance: number // -100..100
}
const zeroZone = (): GradeZone => ({ hue: 0, sat: 0, lum: 0 })
export const DEFAULT_GRADING: ColorGrading = {
  shadows: zeroZone(),
  midtones: zeroZone(),
  highlights: zeroZone(),
  global: zeroZone(),
  blending: 50,
  balance: 0,
}

/* ── Vignette ── */
export interface Vignette {
  amount: number // -100..100 (neg darkens, pos lightens)
  midpoint: number // 0..100
  roundness: number // -100..100
  feather: number // 0..100
  highlights: number // 0..100 (protect highlights)
}
export const DEFAULT_VIGNETTE: Vignette = {
  amount: 0,
  midpoint: 50,
  roundness: 0,
  feather: 50,
  highlights: 0,
}

/* ── Grain ── */
export interface Grain {
  amount: number // 0..100
  size: number // 0..100
  roughness: number // 0..100
}
export const DEFAULT_GRAIN: Grain = { amount: 0, size: 25, roughness: 50 }

/* ── Noise Reduction ── */
export interface NoiseReduction {
  luminance: number // 0..100
  color: number // 0..100
}
export const DEFAULT_NOISE: NoiseReduction = { luminance: 0, color: 0 }

/* ═══════════════════════════════════════════════════════════════
   PHASE 3 — Masking (local adjustments)
   A mask carries its own small bag of tonal/colour adjustments that
   the shader applies ONLY where the mask is > 0. Masks are layered
   on top of the global result, in order, non-destructively.
═══════════════════════════════════════════════════════════════ */

/** The subset of adjustments a mask can apply locally. */
export interface MaskAdjustments {
  exposure: number // -100..100
  contrast: number
  highlights: number
  shadows: number
  whites: number
  blacks: number
  temperature: number
  tint: number
  saturation: number
  clarity: number
  sharpness: number // 0..100
}
export const DEFAULT_MASK_ADJUSTMENTS: MaskAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  clarity: 0,
  sharpness: 0,
}

export type MaskAdjustmentKey = keyof MaskAdjustments

export const MASK_SLIDERS: { key: MaskAdjustmentKey; label: string; min: number; max: number; center: number }[] = [
  { key: "exposure", label: "Exposure", min: -100, max: 100, center: 0 },
  { key: "contrast", label: "Contrast", min: -100, max: 100, center: 0 },
  { key: "highlights", label: "Highlights", min: -100, max: 100, center: 0 },
  { key: "shadows", label: "Shadows", min: -100, max: 100, center: 0 },
  { key: "whites", label: "Whites", min: -100, max: 100, center: 0 },
  { key: "blacks", label: "Blacks", min: -100, max: 100, center: 0 },
  { key: "temperature", label: "Temp", min: -100, max: 100, center: 0 },
  { key: "tint", label: "Tint", min: -100, max: 100, center: 0 },
  { key: "saturation", label: "Saturation", min: -100, max: 100, center: 0 },
  { key: "clarity", label: "Clarity", min: -100, max: 100, center: 0 },
  { key: "sharpness", label: "Sharpness", min: 0, max: 100, center: 0 },
]

export type MaskType = "linear" | "radial" | "brush" | "luminance" | "sky" | "subject"

/** A single freehand brush stroke, in normalised image coordinates. */
export interface BrushStroke {
  points: { x: number; y: number }[]
  /** Radius as a fraction of the image's smaller edge. */
  radius: number
  /** 0..1 edge softness. */
  feather: number
  /** true = erase from the mask instead of adding. */
  erase: boolean
}

export interface Mask {
  id: string
  type: MaskType
  name: string
  enabled: boolean
  inverted: boolean
  /** Overall mask strength, 0..100. */
  opacity: number
  adjustments: MaskAdjustments

  // ── geometry (only the field for `type` is used) ──
  /** Linear gradient: start line (x1,y1) → end line (x2,y2), normalised. */
  linear?: { x1: number; y1: number; x2: number; y2: number }
  /** Radial: centre + radii (normalised), feather 0..100. */
  radial?: { cx: number; cy: number; rx: number; ry: number; feather: number }
  /** Luminance range: keep tones in [min,max] (0..1), feather 0..100. */
  luminance?: { min: number; max: number; feather: number }
  /** Brush strokes (vector, rasterised to a texture at render time). */
  brush?: { strokes: BrushStroke[] }
}

export const MASK_TYPES: { type: MaskType; label: string; hint: string; beta?: boolean }[] = [
  { type: "brush", label: "Brush", hint: "Paint a mask by hand" },
  { type: "linear", label: "Linear Gradient", hint: "Graduated across a line" },
  { type: "radial", label: "Radial Gradient", hint: "Elliptical selection" },
  { type: "luminance", label: "Luminance Range", hint: "Target a brightness range" },
  { type: "sky", label: "Auto Sky", hint: "Detects sky by colour + position", beta: true },
  { type: "subject", label: "Auto Subject", hint: "Foreground vs sky heuristic", beta: true },
]

let maskCounter = 0
export function createMask(type: MaskType): Mask {
  maskCounter += 1
  const meta = MASK_TYPES.find((m) => m.type === type)!
  const base: Mask = {
    id: `mask_${Date.now()}_${maskCounter}`,
    type,
    name: `${meta.label} ${maskCounter}`,
    enabled: true,
    inverted: false,
    opacity: 100,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS },
  }
  if (type === "linear") base.linear = { x1: 0.5, y1: 0.15, x2: 0.5, y2: 0.6 }
  if (type === "radial") base.radial = { cx: 0.5, cy: 0.5, rx: 0.32, ry: 0.32, feather: 50 }
  if (type === "luminance") base.luminance = { min: 0.0, max: 0.5, feather: 30 }
  if (type === "brush") base.brush = { strokes: [] }
  return base
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 3B — Healing / Spot Removal (retouch)
   A spot copies pixels from a SOURCE location over a TARGET blemish.
   "Heal" transfers only the source texture and keeps the target's own
   colour (gradient-domain style); "Clone" copies pixels verbatim.
   Applied as a pre-pass on the source image, so later adjustments and
   masks operate on the already-retouched pixels. Non-destructive.
═══════════════════════════════════════════════════════════════ */

/** Maximum spots the shader loop handles in one pass. */
export const MAX_SPOTS = 32

export interface Spot {
  id: string
  /** Target (blemish) centre, normalised display coords (y down, 0 = top). */
  tx: number
  ty: number
  /** Source (sample) centre, same coordinate space. */
  sx: number
  sy: number
  /** Radius as a fraction of the image's smaller edge. */
  radius: number
  /** 0..1 edge softness. */
  feather: number
  /** true = heal (match target colour), false = clone (copy verbatim). */
  heal: boolean
}

/* ── The complete render state the shader consumes ── */
export interface RenderSettings {
  adjustments: Adjustments
  curves: Curves
  hsl: HSL
  grading: ColorGrading
  vignette: Vignette
  grain: Grain
  noise: NoiseReduction
  masks: Mask[]
  spots: Spot[]
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  curves: DEFAULT_CURVES,
  hsl: DEFAULT_HSL.map((b) => ({ ...b })),
  grading: {
    shadows: zeroZone(),
    midtones: zeroZone(),
    highlights: zeroZone(),
    global: zeroZone(),
    blending: 50,
    balance: 0,
  },
  vignette: { ...DEFAULT_VIGNETTE },
  grain: { ...DEFAULT_GRAIN },
  noise: { ...DEFAULT_NOISE },
  masks: [],
  spots: [],
}

let spotCounter = 0
/** Create a spot at a target point, auto-picking a nearby source location. */
export function createSpot(tx: number, ty: number, radius: number, feather: number, heal: boolean): Spot {
  spotCounter += 1
  // Offset the source horizontally toward the image centre, clamped in-frame.
  const dir = tx > 0.5 ? -1 : 1
  const off = radius * 2.6
  const sx = Math.min(0.98, Math.max(0.02, tx + dir * off))
  const sy = Math.min(0.98, Math.max(0.02, ty))
  return { id: `spot_${Date.now()}_${spotCounter}`, tx, ty, sx, sy, radius, feather, heal }
}

/* Vignette / Grain / Noise slider metadata (hand-built sections). */
export const VIGNETTE_SLIDERS: { key: keyof Vignette; label: string; min: number; max: number; center: number }[] = [
  { key: "amount", label: "Amount", min: -100, max: 100, center: 0 },
  { key: "midpoint", label: "Midpoint", min: 0, max: 100, center: 50 },
  { key: "roundness", label: "Roundness", min: -100, max: 100, center: 0 },
  { key: "feather", label: "Feather", min: 0, max: 100, center: 50 },
  { key: "highlights", label: "Highlights", min: 0, max: 100, center: 0 },
]
export const GRAIN_SLIDERS: { key: keyof Grain; label: string; min: number; max: number; center: number }[] = [
  { key: "amount", label: "Amount", min: 0, max: 100, center: 0 },
  { key: "size", label: "Size", min: 0, max: 100, center: 25 },
  { key: "roughness", label: "Roughness", min: 0, max: 100, center: 50 },
]
export const NOISE_SLIDERS: { key: keyof NoiseReduction; label: string; min: number; max: number; center: number }[] = [
  { key: "luminance", label: "Luminance", min: 0, max: 100, center: 0 },
  { key: "color", label: "Color", min: 0, max: 100, center: 0 },
]

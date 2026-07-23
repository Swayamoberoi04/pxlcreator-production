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

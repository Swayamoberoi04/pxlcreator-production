/**
 * src/lib/editor/ai/patch.ts
 *
 * The common currency between every AI feature (recommendations, one-click
 * looks, prompt editing, style match) and the store. An `AiEdit` describes a
 * change in editor terms — the same sliders a human would move — so applying it
 * is transparent, undoable, and fully editable afterwards ("Learning Mode":
 * users always see exactly which controls changed and why).
 */

import type { Adjustments, GradeZone, Grain, Vignette, NoiseReduction } from "../adjustments"

export interface HslDelta {
  band: number // 0..7
  h?: number
  s?: number
  l?: number
}

export interface GradingPatch {
  shadows?: Partial<GradeZone>
  midtones?: Partial<GradeZone>
  highlights?: Partial<GradeZone>
  global?: Partial<GradeZone>
  blending?: number
  balance?: number
}

export interface AiPatch {
  adjustments?: Partial<Adjustments>
  hsl?: HslDelta[]
  grading?: GradingPatch
  noise?: Partial<NoiseReduction>
  grain?: Partial<Grain>
  vignette?: Partial<Vignette>
}

/** A named, explained change the assistant can apply. */
export interface AiEdit {
  id: string
  title: string
  /** WHY this is suggested — shown to the user (Learning Mode). */
  why: string
  patch: AiPatch
  /** true = add to current settings; false = replace (one-click looks). */
  additive: boolean
  /** Short human-readable list of the controls this touches. */
  changes: string[]
}

const RANGE: Record<keyof Adjustments, [number, number]> = {
  exposure: [-100, 100],
  contrast: [-100, 100],
  highlights: [-100, 100],
  shadows: [-100, 100],
  whites: [-100, 100],
  blacks: [-100, 100],
  temperature: [-100, 100],
  tint: [-100, 100],
  vibrance: [-100, 100],
  saturation: [-100, 100],
  texture: [-100, 100],
  clarity: [-100, 100],
  dehaze: [-100, 100],
  sharpening: [0, 100],
}

export function clampAdjustment(key: keyof Adjustments, value: number): number {
  const [lo, hi] = RANGE[key]
  return Math.round(Math.min(hi, Math.max(lo, value)))
}

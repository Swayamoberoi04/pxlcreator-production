/**
 * src/lib/editor/presets.ts
 *
 * A small set of one-click "quick looks" for the left sidebar. Each is just a
 * partial `Adjustments` bag layered on top of the AI original — real parameter
 * values that flow through the exact same shader as the manual sliders, so they
 * are fully editable afterwards and completely non-destructive.
 */

import type { Adjustments } from "./adjustments"

export interface QuickPreset {
  id: string
  name: string
  adjustments: Partial<Adjustments>
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "punch",
    name: "Punch",
    adjustments: { contrast: 22, clarity: 18, vibrance: 24, blacks: -10 },
  },
  {
    id: "warm-film",
    name: "Warm Film",
    adjustments: { temperature: 18, contrast: -8, highlights: -14, blacks: 12, vibrance: 10 },
  },
  {
    id: "cool-editorial",
    name: "Cool Editorial",
    adjustments: { temperature: -16, tint: 6, contrast: 12, shadows: 10, saturation: -8 },
  },
  {
    id: "matte-fade",
    name: "Matte Fade",
    adjustments: { blacks: 24, contrast: -14, highlights: -8, saturation: -12, dehaze: -6 },
  },
  {
    id: "crisp-hdr",
    name: "Crisp HDR",
    adjustments: { shadows: 26, highlights: -30, clarity: 22, dehaze: 16, sharpening: 30 },
  },
  {
    id: "mono",
    name: "Mono",
    adjustments: { saturation: -100, contrast: 18, clarity: 14, sharpening: 20 },
  },
]

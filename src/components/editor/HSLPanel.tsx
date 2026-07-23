"use client"

/**
 * HSLPanel — per-colour Hue / Saturation / Luminance.
 *
 * Pick one of the 8 colour bands, then push its Hue (shift), Saturation, or
 * Luminance. The shader weights each pixel into the nearest band(s) by hue, so
 * only the chosen colour range responds.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { HSL_BANDS, type HSL } from "@/lib/editor/adjustments"
import { AdjustmentSlider } from "./AdjustmentSlider"

interface HSLPanelProps {
  hsl: HSL
  setHSLBand: (index: number, partial: { h?: number; s?: number; l?: number }) => void
  commit: () => void
}

export function HSLPanel({ hsl, setHSLBand, commit }: HSLPanelProps) {
  const [band, setBand] = useState(0)
  const active = hsl[band]
  const bandEdited = (i: number) => hsl[i].h !== 0 || hsl[i].s !== 0 || hsl[i].l !== 0

  return (
    <div className="flex flex-col gap-3.5">
      {/* Band chips */}
      <div className="flex flex-wrap gap-1.5">
        {HSL_BANDS.map((b, i) => (
          <button
            key={b.name}
            type="button"
            onClick={() => setBand(i)}
            title={b.name}
            className={cn(
              "relative h-7 w-7 rounded-full transition-transform",
              band === i ? "ring-2 ring-white ring-offset-2 ring-offset-surface scale-110" : "hover:scale-105"
            )}
            style={{ background: b.color }}
          >
            {bandEdited(i) && band !== i && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold ring-1 ring-surface" />
            )}
          </button>
        ))}
      </div>

      <p className="text-[0.75rem] text-muted/60">{HSL_BANDS[band].name}</p>

      <AdjustmentSlider
        label="Hue"
        value={active.h}
        min={-100}
        max={100}
        center={0}
        onChange={(v) => setHSLBand(band, { h: v })}
        onCommit={commit}
      />
      <AdjustmentSlider
        label="Saturation"
        value={active.s}
        min={-100}
        max={100}
        center={0}
        onChange={(v) => setHSLBand(band, { s: v })}
        onCommit={commit}
      />
      <AdjustmentSlider
        label="Luminance"
        value={active.l}
        min={-100}
        max={100}
        center={0}
        onChange={(v) => setHSLBand(band, { l: v })}
        onCommit={commit}
      />
    </div>
  )
}

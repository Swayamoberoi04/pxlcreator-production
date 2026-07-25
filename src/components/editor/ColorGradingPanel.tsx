"use client"

/**
 * ColorGradingPanel — 3-way (Shadows / Midtones / Highlights) + Global colour
 * wheels, plus Blending and Balance.
 *
 * Each wheel is a hue/saturation picker: angle = hue, distance from centre =
 * saturation. A luminance slider sits under each wheel. The values feed the
 * shader's `gradeTint`, so a tug on a wheel tints its tonal region live.
 */

import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import type { ColorGrading, GradeZone, GradeZoneKey } from "@/lib/editor/adjustments"
import { AdjustmentSlider } from "./AdjustmentSlider"

interface ColorGradingPanelProps {
  grading: ColorGrading
  setGrade: (zone: GradeZoneKey, partial: Partial<GradeZone>) => void
  setGradingParam: (partial: Partial<Pick<ColorGrading, "blending" | "balance">>) => void
  commit: () => void
}

const ZONES: { key: GradeZoneKey; label: string }[] = [
  { key: "shadows", label: "Shadows" },
  { key: "midtones", label: "Midtones" },
  { key: "highlights", label: "Highlights" },
  { key: "global", label: "Global" },
]

export function ColorGradingPanel({
  grading,
  setGrade,
  setGradingParam,
  commit,
}: ColorGradingPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {ZONES.map((z) => (
          <ColorWheel
            key={z.key}
            label={z.label}
            zone={grading[z.key]}
            onChange={(p) => setGrade(z.key, p)}
            onCommit={commit}
          />
        ))}
      </div>
      <AdjustmentSlider
        label="Blending"
        value={grading.blending}
        min={0}
        max={100}
        center={50}
        onChange={(v) => setGradingParam({ blending: v })}
        onCommit={commit}
      />
      <AdjustmentSlider
        label="Balance"
        value={grading.balance}
        min={-100}
        max={100}
        center={0}
        onChange={(v) => setGradingParam({ balance: v })}
        onCommit={commit}
      />
    </div>
  )
}

const WHEEL = 96
const R = WHEEL / 2 - 7

function ColorWheel({
  label,
  zone,
  onChange,
  onCommit,
}: {
  label: string
  zone: GradeZone
  onChange: (partial: Partial<GradeZone>) => void
  onCommit: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const rect = ref.current!.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = clientX - cx
      const dy = clientY - cy
      const len = Math.hypot(dx, dy)
      const rMax = rect.width / 2 - 7
      const sat = Math.min(1, len / rMax) * 100
      let hue = (Math.atan2(dy, dx) * 180) / Math.PI
      if (hue < 0) hue += 360
      onChange({ hue: Math.round(hue), sat: Math.round(sat) })
    },
    [onChange]
  )

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragging.current = true
    update(e.clientX, e.clientY)
  }
  const onMove = (e: React.PointerEvent) => {
    if (dragging.current) update(e.clientX, e.clientY)
  }
  const onUp = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    onCommit()
  }

  const ang = (zone.hue * Math.PI) / 180
  const r = (zone.sat / 100) * R
  const dotX = WHEEL / 2 + r * Math.cos(ang)
  const dotY = WHEEL / 2 + r * Math.sin(ang)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[0.6875rem] uppercase tracking-wider text-muted/85">{label}</span>
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={() => {
          onChange({ hue: 0, sat: 0 })
          onCommit()
        }}
        className="relative touch-none cursor-pointer rounded-full"
        style={{
          width: WHEEL,
          height: WHEEL,
          background:
            "radial-gradient(circle at center, #808080 0%, rgba(128,128,128,0) 72%), conic-gradient(from 90deg, red, magenta, blue, cyan, lime, yellow, red)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
        }}
      >
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: dotX, top: dotY, background: "rgba(0,0,0,0.4)" }}
        />
      </div>
      <input
        type="range"
        min={-100}
        max={100}
        value={zone.lum}
        onChange={(e) => onChange({ lum: Number(e.target.value) })}
        onPointerUp={onCommit}
        className={cn("h-1 w-full cursor-pointer accent-gold", zone.lum !== 0 && "")}
        aria-label={`${label} luminance`}
      />
    </div>
  )
}

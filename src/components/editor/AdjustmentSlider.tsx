"use client"

/**
 * AdjustmentSlider — the precision control used for every Light/Color/Detail
 * parameter.
 *
 * WHY CUSTOM (not <input type=range>)
 *   - Bipolar fill that grows out from the centre (0), like Lightroom.
 *   - Double-click / double-tap resets to the "no change" centre.
 *   - Distinguishes a *live* drag (onChange, high-frequency, no history) from a
 *     *committed* change on release (onCommit → one undo step).
 *   - Fully keyboard driven (role="slider", arrow keys) for accessibility.
 */

import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"

interface AdjustmentSliderProps {
  label: string
  value: number
  min: number
  max: number
  center: number
  onChange: (value: number) => void
  onCommit: () => void
}

export function AdjustmentSlider({
  label,
  value,
  min,
  max,
  center,
  onChange,
  onCommit,
}: AdjustmentSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const pct = (value - min) / (max - min)
  const centerPct = (center - min) / (max - min)
  const edited = value !== center

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return value
      const rect = el.getBoundingClientRect()
      const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const raw = min + t * (max - min)
      return Math.round(raw)
    },
    [min, max, value]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dragging.current = true
      onChange(valueFromClientX(e.clientX))
    },
    [onChange, valueFromClientX]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      onChange(valueFromClientX(e.clientX))
    },
    [onChange, valueFromClientX]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      dragging.current = false
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      onCommit()
    },
    [onCommit]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1
      let next = value
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(min, value - step)
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(max, value + step)
      else if (e.key === "Home") next = min
      else if (e.key === "End") next = max
      else return
      e.preventDefault()
      onChange(next)
      onCommit()
    },
    [value, min, max, onChange, onCommit]
  )

  const reset = useCallback(() => {
    onChange(center)
    onCommit()
  }, [center, onChange, onCommit])

  // Fill bar spans from the centre tick to the current value.
  const fillLeft = Math.min(pct, centerPct) * 100
  const fillWidth = Math.abs(pct - centerPct) * 100

  return (
    <div className="flex flex-col gap-1.5 select-none">
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] text-muted/80">{label}</span>
        <button
          type="button"
          onDoubleClick={reset}
          onClick={(e) => {
            // Single click on the number does nothing; double-click resets.
            e.preventDefault()
          }}
          title="Double-click to reset"
          className={cn(
            "min-w-[2.5rem] text-right text-[0.8125rem] tabular-nums transition-colors",
            edited ? "text-gold font-medium" : "text-muted/50"
          )}
        >
          {value > center ? `+${value}` : value}
        </button>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={reset}
        onKeyDown={handleKeyDown}
        className="relative h-5 flex items-center cursor-pointer touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded-full"
      >
        {/* Track */}
        <div className="absolute inset-x-0 h-[3px] rounded-full bg-surface-3" />
        {/* Centre tick */}
        <div
          className="absolute h-[9px] w-px bg-muted/30"
          style={{ left: `${centerPct * 100}%` }}
        />
        {/* Fill from centre */}
        <div
          className="absolute h-[3px] rounded-full bg-gold/80"
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-foreground shadow-[0_1px_4px_rgba(0,0,0,0.5)] ring-1 ring-black/20 transition-transform"
          style={{ left: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

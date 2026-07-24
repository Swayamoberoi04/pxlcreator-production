"use client"

/**
 * HealOverlay — on-canvas spot placement for the healing / clone tool.
 *
 * Rendered inside the transformed wrapper (like CropOverlay / MaskOverlay), so
 * it tracks zoom/pan. Coordinates are normalised 0..1 display space (y down),
 * matching what the SPOT shader evaluates. Click empty space to drop a spot
 * (target = where you clicked, source auto-placed nearby); drag the solid ring
 * to move the target and the dashed ring to move the sample source.
 */

import { useRef } from "react"
import type { Spot } from "@/lib/editor/adjustments"
import { useEditorStore } from "@/lib/editor/store"

interface HealOverlayProps {
  width: number
  height: number
}

export function HealOverlay({ width, height }: HealOverlayProps) {
  const spots = useEditorStore((s) => s.spots)
  const addSpot = useEditorStore((s) => s.addSpot)
  const updateSpot = useEditorStore((s) => s.updateSpot)
  const commit = useEditorStore((s) => s.commit)

  const drag = useRef<{ id: string; which: "t" | "s" } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const toNorm = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    }
  }

  const onBgClick = (e: React.MouseEvent) => {
    if (drag.current) return
    const p = toNorm(e.clientX, e.clientY)
    addSpot(p.x, p.y)
  }

  const onHandleDown = (id: string, which: "t" | "s") => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = { id, which }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const p = toNorm(e.clientX, e.clientY)
    if (drag.current.which === "t") updateSpot(drag.current.id, { tx: p.x, ty: p.y })
    else updateSpot(drag.current.id, { sx: p.x, sy: p.y })
  }
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    commit()
  }

  // On screen the spot is a circle of radius = radius × smaller edge (the
  // shader's aspect-corrected ellipse resolves to a circle in pixels).
  const rPx = (spot: Spot) => spot.radius * Math.min(width, height)

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 cursor-crosshair touch-none"
      width={width}
      height={height}
      onClick={onBgClick}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      {spots.map((sp) => {
        const r = rPx(sp)
        const tx = sp.tx * width
        const ty = sp.ty * height
        const sx = sp.sx * width
        const sy = sp.sy * height
        return (
          <g key={sp.id}>
            {/* Link line */}
            <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="rgba(201,168,76,0.5)" strokeWidth={1} strokeDasharray="3 3" />
            {/* Source (sample) ring — dashed */}
            <circle
              cx={sx}
              cy={sy}
              r={r}
              fill="none"
              stroke="#C9A84C"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              style={{ cursor: "grab" }}
              onPointerDown={onHandleDown(sp.id, "s")}
            />
            {/* Target ring — solid */}
            <circle
              cx={tx}
              cy={ty}
              r={r}
              fill="rgba(201,168,76,0.10)"
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onPointerDown={onHandleDown(sp.id, "t")}
            />
            <circle cx={tx} cy={ty} r={2} fill="#fff" pointerEvents="none" />
          </g>
        )
      })}
    </svg>
  )
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

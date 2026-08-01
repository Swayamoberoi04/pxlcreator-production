"use client"

/**
 * MaskOverlay — on-canvas editing for the active mask.
 *
 * Rendered inside the same transformed wrapper as the display canvas (like
 * CropOverlay), so it tracks zoom/pan. Coordinates are normalised 0..1 in
 * display space (y down, 0 = top) — the exact space the mask shader evaluates
 * geometry in (see MASK_SRC's `P`). Radial/linear expose draggable handles;
 * brush paints freehand strokes and previews them as a red tint.
 */

import { useCallback, useMemo, useRef } from "react"
import type { BrushStroke, Mask } from "@/lib/editor/adjustments"
import { rasterizeBrush } from "@/lib/editor/masks"

interface MaskOverlayProps {
  mask: Mask
  width: number
  height: number
  brushRadius: number // fraction of the smaller edge
  brushFeather: number // 0..1
  brushErase: boolean
  updateMask: (id: string, partial: Partial<Mask>) => void
  commit: () => void
}

export function MaskOverlay({
  mask,
  width,
  height,
  brushRadius,
  brushFeather,
  brushErase,
  updateMask,
  commit,
}: MaskOverlayProps) {
  if (mask.type === "brush") {
    return (
      <BrushLayer
        mask={mask}
        width={width}
        height={height}
        brushRadius={brushRadius}
        brushFeather={brushFeather}
        brushErase={brushErase}
        updateMask={updateMask}
        commit={commit}
      />
    )
  }
  if (mask.type === "radial") {
    return <RadialLayer mask={mask} width={width} height={height} updateMask={updateMask} commit={commit} />
  }
  if (mask.type === "linear") {
    return <LinearLayer mask={mask} width={width} height={height} updateMask={updateMask} commit={commit} />
  }
  return null
}

/* ── Radial ── */
function RadialLayer({
  mask,
  width,
  height,
  updateMask,
  commit,
}: Pick<MaskOverlayProps, "mask" | "width" | "height" | "updateMask" | "commit">) {
  const r = mask.radial ?? { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3, feather: 50 }
  const drag = useRef<"move" | "rx" | "ry" | null>(null)
  const start = useRef({ x: 0, y: 0, cx: 0, cy: 0, rx: 0, ry: 0 })

  const onDown = (h: "move" | "rx" | "ry") => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = h
    start.current = { x: e.clientX, y: e.clientY, cx: r.cx, cy: r.cy, rx: r.rx, ry: r.ry }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = (e.clientX - start.current.x) / width
    const dy = (e.clientY - start.current.y) / height
    if (drag.current === "move") {
      updateMask(mask.id, { radial: { ...r, cx: clamp01(start.current.cx + dx), cy: clamp01(start.current.cy + dy) } })
    } else if (drag.current === "rx") {
      updateMask(mask.id, { radial: { ...r, rx: Math.max(0.02, start.current.rx + dx) } })
    } else {
      updateMask(mask.id, { radial: { ...r, ry: Math.max(0.02, start.current.ry + dy) } })
    }
  }
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    commit()
  }

  const cx = r.cx * width
  const cy = r.cy * height
  const rx = r.rx * width
  const ry = r.ry * height

  return (
    <svg className="absolute inset-0 touch-none" width={width} height={height} onPointerMove={onMove} onPointerUp={onUp}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(255,214,10,0.06)" stroke="#FFD60A" strokeWidth={1.5} />
      <ellipse cx={cx} cy={cy} rx={rx * (1 - r.feather / 100)} ry={ry * (1 - r.feather / 100)} fill="none" stroke="rgba(255,214,10,0.4)" strokeWidth={1} strokeDasharray="4 4" />
      <Handle x={cx} y={cy} cursor="move" onPointerDown={onDown("move")} />
      <Handle x={cx + rx} y={cy} cursor="ew-resize" onPointerDown={onDown("rx")} />
      <Handle x={cx} y={cy + ry} cursor="ns-resize" onPointerDown={onDown("ry")} />
    </svg>
  )
}

/* ── Linear ── */
function LinearLayer({
  mask,
  width,
  height,
  updateMask,
  commit,
}: Pick<MaskOverlayProps, "mask" | "width" | "height" | "updateMask" | "commit">) {
  const l = mask.linear ?? { x1: 0.5, y1: 0.2, x2: 0.5, y2: 0.8 }
  const drag = useRef<"a" | "b" | "line" | null>(null)
  const start = useRef({ x: 0, y: 0, l: l })

  const onDown = (h: "a" | "b" | "line") => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = h
    start.current = { x: e.clientX, y: e.clientY, l }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = (e.clientX - start.current.x) / width
    const dy = (e.clientY - start.current.y) / height
    const s = start.current.l
    if (drag.current === "a") updateMask(mask.id, { linear: { ...s, x1: clamp01(s.x1 + dx), y1: clamp01(s.y1 + dy) } })
    else if (drag.current === "b") updateMask(mask.id, { linear: { ...s, x2: clamp01(s.x2 + dx), y2: clamp01(s.y2 + dy) } })
    else
      updateMask(mask.id, {
        linear: { x1: clamp01(s.x1 + dx), y1: clamp01(s.y1 + dy), x2: clamp01(s.x2 + dx), y2: clamp01(s.y2 + dy) },
      })
  }
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    commit()
  }

  const ax = l.x1 * width
  const ay = l.y1 * height
  const bx = l.x2 * width
  const by = l.y2 * height
  // Perpendicular direction for the guide ticks.
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const px = (-dy / len) * 40
  const py = (dx / len) * 40

  return (
    <svg className="absolute inset-0 touch-none" width={width} height={height} onPointerMove={onMove} onPointerUp={onUp}>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#FFD60A" strokeWidth={1.5} />
      <line x1={ax - px} y1={ay - py} x2={ax + px} y2={ay + py} stroke="rgba(255,214,10,0.7)" strokeWidth={1} />
      <line x1={bx - px} y1={by - py} x2={bx + px} y2={by + py} stroke="rgba(255,214,10,0.7)" strokeWidth={1} />
      <line
        x1={ax}
        y1={ay}
        x2={bx}
        y2={by}
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: "move" }}
        onPointerDown={onDown("line")}
      />
      <Handle x={ax} y={ay} cursor="move" onPointerDown={onDown("a")} />
      <Handle x={bx} y={by} cursor="move" onPointerDown={onDown("b")} />
    </svg>
  )
}

/* ── Brush ── */
function BrushLayer({
  mask,
  width,
  height,
  brushRadius,
  brushFeather,
  brushErase,
  updateMask,
  commit,
}: MaskOverlayProps) {
  const painting = useRef(false)
  const base = useRef<BrushStroke[]>([])
  const current = useRef<BrushStroke | null>(null)
  const cursor = useRef<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const strokes = mask.brush?.strokes ?? []

  // Red preview of the accumulated mask.
  const previewUrl = useMemo(() => {
    if (strokes.length === 0) return null
    const canvas = rasterizeBrush(strokes, Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
    // Tint it red via a second canvas.
    const out = document.createElement("canvas")
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext("2d")!
    ctx.drawImage(canvas, 0, 0)
    ctx.globalCompositeOperation = "source-in"
    ctx.fillStyle = "rgba(230,72,77,0.5)"
    ctx.fillRect(0, 0, out.width, out.height)
    return out.toDataURL()
  }, [strokes, width, height])

  const toUV = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: clamp01((e.clientX - rect.left) / rect.width), y: clamp01((e.clientY - rect.top) / rect.height) }
  }

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    painting.current = true
    base.current = mask.brush?.strokes ?? []
    current.current = { points: [toUV(e)], radius: brushRadius, feather: brushFeather, erase: brushErase }
    updateMask(mask.id, { brush: { strokes: [...base.current, current.current] } })
  }
  const onMove = (e: React.PointerEvent) => {
    cursor.current = toUV(e)
    if (!painting.current || !current.current) return
    current.current.points.push(toUV(e))
    updateMask(mask.id, { brush: { strokes: [...base.current, { ...current.current, points: [...current.current.points] }] } })
  }
  const onUp = (e: React.PointerEvent) => {
    if (!painting.current) return
    painting.current = false
    current.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    commit()
  }

  const cursorPx = brushRadius * Math.min(width, height)

  return (
    <div className="absolute inset-0">
      {previewUrl && (
        <img src={previewUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full" style={{ width, height }} />
      )}
      <svg
        ref={svgRef}
        className="absolute inset-0 cursor-crosshair touch-none"
        width={width}
        height={height}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        {cursor.current && (
          <circle
            cx={cursor.current.x * width}
            cy={cursor.current.y * height}
            r={cursorPx}
            fill="none"
            stroke={brushErase ? "#e5484d" : "#FFD60A"}
            strokeWidth={1}
          />
        )}
      </svg>
    </div>
  )
}

function Handle({ x, y, cursor, onPointerDown }: { x: number; y: number; cursor: string; onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <circle cx={x} cy={y} r={6} fill="#fff" stroke="#FFD60A" strokeWidth={1.5} style={{ cursor }} onPointerDown={onPointerDown} />
  )
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

"use client"

/**
 * CurveEditor — the interactive RGB / R / G / B tone curve.
 *
 * Control points are stored normalised (0..1). You can drag points, click an
 * empty spot to add one, and double-click an interior point to remove it. The
 * displayed curve is sampled with the same `evalCurve` the shader LUT is baked
 * from, so what you draw is exactly what renders.
 */

import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { evalCurve } from "@/lib/editor/curves"
import type { CurveChannel, CurvePoint, Curves } from "@/lib/editor/adjustments"
import { DEFAULT_CURVE } from "@/lib/editor/adjustments"
import { useEditorStore } from "@/lib/editor/store"

interface CurveEditorProps {
  curves: Curves
  setCurve: (channel: CurveChannel, points: CurvePoint[]) => void
  commit: () => void
}

const CHANNELS: { key: CurveChannel; label: string; color: string }[] = [
  { key: "rgb", label: "RGB", color: "#f5f5f5" },
  { key: "r", label: "R", color: "#e5484d" },
  { key: "g", label: "G", color: "#46b354" },
  { key: "b", label: "B", color: "#3a7bd5" },
]

const SIZE = 220

export function CurveEditor({ curves, setCurve, commit }: CurveEditorProps) {
  const [channel, setChannel] = useState<CurveChannel>("rgb")
  const [readout, setReadout] = useState<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIndex = useRef<number | null>(null)

  const analysis = useEditorStore((s) => s.analysis)
  // Channel-appropriate histogram to draw behind the curve.
  const hist =
    channel === "r" ? analysis?.stats.histR : channel === "g" ? analysis?.stats.histG : channel === "b" ? analysis?.stats.histB : analysis?.stats.histLuma

  const points = [...curves[channel]].sort((a, b) => a.x - b.x)
  const active = channel === "rgb" ? "#f5f5f5" : CHANNELS.find((c) => c.key === channel)!.color

  const toSvg = (p: CurvePoint) => ({ x: p.x * SIZE, y: (1 - p.y) * SIZE })
  const fromClient = useCallback((clientX: number, clientY: number): CurvePoint => {
    const rect = svgRef.current!.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = 1 - (clientY - rect.top) / rect.height
    return { x: clamp01(x), y: clamp01(y) }
  }, [])

  const commitPoints = (pts: CurvePoint[]) => setCurve(channel, pts)

  const onHandleDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragIndex.current = i
  }

  const onMove = (e: React.PointerEvent) => {
    const i = dragIndex.current
    if (i == null) return
    const p = fromClient(e.clientX, e.clientY)
    const pts = points.map((q) => ({ ...q }))
    if (i === 0) {
      pts[0] = { x: 0, y: p.y } // endpoints locked in x
    } else if (i === pts.length - 1) {
      pts[i] = { x: 1, y: p.y }
    } else {
      const lo = pts[i - 1].x + 0.02
      const hi = pts[i + 1].x - 0.02
      pts[i] = { x: Math.min(Math.max(p.x, lo), hi), y: p.y }
    }
    setReadout({ x: Math.round(pts[i].x * 255), y: Math.round(pts[i].y * 255) })
    commitPoints(pts)
  }

  const onUp = (e: React.PointerEvent) => {
    if (dragIndex.current == null) return
    dragIndex.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setReadout(null)
    commit()
  }

  const onBackgroundClick = (e: React.MouseEvent) => {
    // Add a point where clicked (unless a drag just happened).
    const p = fromClient(e.clientX, e.clientY)
    if (p.x <= 0.02 || p.x >= 0.98) return
    const pts = [...points, p].sort((a, b) => a.x - b.x)
    commitPoints(pts)
    commit()
  }

  const removePoint = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (i === 0 || i === points.length - 1) return
    commitPoints(points.filter((_, idx) => idx !== i))
    commit()
  }

  // Sample the smooth curve for the path.
  const path = Array.from({ length: 65 }, (_, k) => {
    const x = k / 64
    const y = evalCurve(points, x)
    const s = toSvg({ x, y })
    return `${k === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`
  }).join(" ")

  const isEdited = JSON.stringify(points) !== JSON.stringify(DEFAULT_CURVE)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setChannel(c.key)}
              className={cn(
                "h-6 w-8 rounded text-[0.6875rem] font-semibold transition-colors",
                channel === c.key ? "bg-surface-3 text-foreground" : "text-muted/85 hover:text-foreground"
              )}
              style={channel === c.key ? { color: c.color } : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {readout && (
            <span className="rounded bg-surface-3/70 px-1.5 py-0.5 text-[0.625rem] tabular-nums text-foreground/92">
              {readout.x} → {readout.y}
            </span>
          )}
          {isEdited && (
            <button
              type="button"
              onClick={() => {
                setCurve(channel, DEFAULT_CURVE.map((p) => ({ ...p })))
                commit()
              }}
              className="text-[0.6875rem] uppercase tracking-wider text-muted/85 hover:text-gold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full touch-none rounded-lg border border-border bg-[#0d0d0d]"
        style={{ aspectRatio: "1 / 1" }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onClick={onBackgroundClick}
      >
        {/* Histogram behind the curve (from AI analysis) */}
        {hist &&
          hist.map((v, i) => {
            const bw = SIZE / hist.length
            return <rect key={`h${i}`} x={i * bw} y={SIZE - v * SIZE} width={bw + 0.5} height={v * SIZE} fill="rgba(255,255,255,0.07)" />
          })}
        {/* Fine 8×8 grid for precise handling */}
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const g = n / 8
          const major = n % 2 === 0
          return (
            <g key={g} stroke={major ? "#ffffff18" : "#ffffff0c"} strokeWidth={0.5}>
              <line x1={g * SIZE} y1={0} x2={g * SIZE} y2={SIZE} />
              <line x1={0} y1={g * SIZE} x2={SIZE} y2={g * SIZE} />
            </g>
          )
        })}
        <line x1={0} y1={SIZE} x2={SIZE} y2={0} stroke="#ffffff12" strokeWidth={0.5} strokeDasharray="3 3" />
        {/* Curve */}
        <path d={path} fill="none" stroke={active} strokeWidth={1.5} />
        {/* Handles */}
        {points.map((p, i) => {
          const s = toSvg(p)
          return (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={4}
              fill={active}
              stroke="#000"
              strokeWidth={0.5}
              className="cursor-pointer"
              onPointerDown={onHandleDown(i)}
              onDoubleClick={removePoint(i)}
            />
          )
        })}
      </svg>
      <p className="text-[0.6875rem] text-muted/70">Click to add · drag to shape · double-click a point to remove</p>
    </div>
  )
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

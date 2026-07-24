/**
 * src/lib/editor/masks.ts
 *
 * Brush-mask rasterisation. Brush masks are stored as *vector* strokes (so they
 * stay lightweight in history and sessions and fully non-destructive); this
 * turns those strokes into a single-channel weight bitmap the shader samples.
 *
 * Geometric masks (linear/radial/luminance) and the auto masks (sky/subject)
 * are computed directly in the shader and need no rasterisation here.
 */

import type { BrushStroke, Mask } from "./adjustments"

/** A stable string that changes whenever a brush mask's pixels would change. */
export function brushSignature(mask: Mask): string {
  if (mask.type !== "brush" || !mask.brush) return ""
  return JSON.stringify(mask.brush.strokes)
}

/** Draw one soft-edged stroke onto the 2D context (white = full weight). */
function drawStroke(ctx: CanvasRenderingContext2D, stroke: BrushStroke, w: number, h: number): void {
  const minEdge = Math.min(w, h)
  const radius = Math.max(1, stroke.radius * minEdge)
  const soft = Math.max(0.01, stroke.feather)
  ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over"

  const stamp = (px: number, py: number) => {
    const grad = ctx.createRadialGradient(px, py, radius * (1 - soft), px, py, radius)
    grad.addColorStop(0, "rgba(255,255,255,1)")
    grad.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const pts = stroke.points
  if (pts.length === 0) return
  if (pts.length === 1) {
    stamp(pts[0].x * w, pts[0].y * h)
    return
  }
  // Stamp densely along each segment so the stroke reads as continuous.
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const ax = a.x * w
    const ay = a.y * h
    const bx = b.x * w
    const by = b.y * h
    const dist = Math.hypot(bx - ax, by - ay)
    const steps = Math.max(1, Math.ceil(dist / (radius * 0.35)))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      stamp(ax + (bx - ax) * t, ay + (by - ay) * t)
    }
  }
}

/** Rasterise all strokes of a brush mask into a fresh canvas (R channel weight). */
export function rasterizeBrush(strokes: BrushStroke[], width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const stroke of strokes) drawStroke(ctx, stroke, canvas.width, canvas.height)
  return canvas
}

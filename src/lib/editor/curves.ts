/**
 * src/lib/editor/curves.ts
 *
 * Tone-curve evaluation and LUT baking.
 *
 * The curve UI stores a handful of control points; the shader wants a fast
 * per-channel lookup. This module turns points → a smooth monotone function
 * (natural-ish Catmull-Rom, clamped so the curve never folds back on itself)
 * → a 256-entry lookup table, and finally bakes all four curves (master RGB +
 * per-channel R/G/B) into one 256×1 RGBA texture the shader samples once per
 * channel. Identity curves bake to an identity LUT, so "no curve" is a no-op.
 */

import { DEFAULT_CURVE, type CurvePoint, type Curves } from "./adjustments"

/** Evaluate a curve (given as sorted-ish points) at x∈[0,1] → y∈[0,1]. */
export function evalCurve(points: CurvePoint[], x: number): number {
  const pts = [...points].sort((a, b) => a.x - b.x)
  if (pts.length === 0) return x
  if (x <= pts[0].x) return clamp01(pts[0].y)
  if (x >= pts[pts.length - 1].x) return clamp01(pts[pts.length - 1].y)

  // Find the segment [p1, p2] containing x.
  let i = 0
  while (i < pts.length - 1 && x > pts[i + 1].x) i++
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p0 = pts[i - 1] ?? p1
  const p3 = pts[i + 2] ?? p2

  const t = (x - p1.x) / (p2.x - p1.x || 1)
  // Catmull-Rom on y, clamped to the segment's endpoints to stay monotone.
  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t)
  const lo = Math.min(p1.y, p2.y)
  const hi = Math.max(p1.y, p2.y)
  return clamp01(Math.min(hi, Math.max(lo, y)))
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Sample a curve into a 256-entry Float32 array (values 0..1). */
export function curveToArray(points: CurvePoint[]): Float32Array {
  const out = new Float32Array(256)
  for (let i = 0; i < 256; i++) out[i] = evalCurve(points, i / 255)
  return out
}

function isIdentity(points: CurvePoint[]): boolean {
  return (
    points.length === DEFAULT_CURVE.length &&
    points.every((p, i) => p.x === DEFAULT_CURVE[i].x && p.y === DEFAULT_CURVE[i].y)
  )
}

/**
 * Bake all four curves into a 256×1 RGBA Uint8 array.
 * For input tone x: R = master(rCurve(x)), G = master(gCurve(x)), B = master(bCurve(x)).
 * The master (RGB) curve is applied on top of each per-channel curve, matching
 * how Lightroom's point curve layers over the individual channel curves.
 */
export function bakeCurveLUT(curves: Curves): Uint8Array {
  const lut = new Uint8Array(256 * 4)
  const rgbIdentity = isIdentity(curves.rgb)
  const master = rgbIdentity ? null : curveToArray(curves.rgb)
  const rIdentity = isIdentity(curves.r)
  const gIdentity = isIdentity(curves.g)
  const bIdentity = isIdentity(curves.b)
  const rArr = rIdentity ? null : curveToArray(curves.r)
  const gArr = gIdentity ? null : curveToArray(curves.g)
  const bArr = bIdentity ? null : curveToArray(curves.b)

  const applyMaster = (v: number): number => {
    if (!master) return v
    const idx = Math.round(clamp01(v) * 255)
    return master[idx]
  }

  for (let i = 0; i < 256; i++) {
    const x = i / 255
    const r = applyMaster(rArr ? rArr[i] : x)
    const g = applyMaster(gArr ? gArr[i] : x)
    const b = applyMaster(bArr ? bArr[i] : x)
    lut[i * 4 + 0] = Math.round(clamp01(r) * 255)
    lut[i * 4 + 1] = Math.round(clamp01(g) * 255)
    lut[i * 4 + 2] = Math.round(clamp01(b) * 255)
    lut[i * 4 + 3] = 255
  }
  return lut
}

/** True when every curve is the identity line (lets the renderer skip work). */
export function curvesAreIdentity(curves: Curves): boolean {
  return isIdentity(curves.rgb) && isIdentity(curves.r) && isIdentity(curves.g) && isIdentity(curves.b)
}

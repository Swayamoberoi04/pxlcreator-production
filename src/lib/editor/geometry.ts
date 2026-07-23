/**
 * src/lib/editor/geometry.ts
 *
 * Pure geometry helpers shared by the live preview compositor (EditorCanvas)
 * and the exporter (export.ts). Keeping the maths in one place guarantees the
 * preview and the exported file are framed identically — no drift.
 */

import type { Geometry } from "./adjustments"

/** Dimensions of the image after 90° rotation (axes swap for 90/270). */
export function orientedDims(
  srcW: number,
  srcH: number,
  rotate90: 0 | 1 | 2 | 3
): { w: number; h: number } {
  const quarter = rotate90 % 2 !== 0
  return quarter ? { w: srcH, h: srcW } : { w: srcW, h: srcH }
}

/**
 * Minimum uniform scale needed so a `w x h` rectangle rotated by `angleDeg`
 * still fully covers the original frame (hides the empty triangular corners
 * that straightening would otherwise reveal).
 */
export function straightenCover(w: number, h: number, angleDeg: number): number {
  if (!angleDeg) return 1
  const a = Math.abs((angleDeg * Math.PI) / 180)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const sx = cos + sin * (h / w)
  const sy = cos + sin * (w / h)
  return Math.max(1, sx, sy)
}

/**
 * Draw the colour-adjusted `source` canvas onto `ctx` with full geometry
 * (rotate → flip → straighten → optional crop) applied, scaled so the visible
 * content fills a `bufferW x bufferH` target.
 *
 * @param applyCrop when false, the full oriented image is drawn (used in crop
 *                  mode so the user can see everything outside the crop box).
 */
export function drawGeometry(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  geometry: Geometry,
  bufferW: number,
  bufferH: number,
  applyCrop: boolean
): void {
  const { w: ow, h: oh } = orientedDims(srcW, srcH, geometry.rotate90)
  const crop = applyCrop ? geometry.crop : null

  const contentOw = crop ? crop.w * ow : ow
  const cropX = crop ? crop.x * ow : 0
  const cropY = crop ? crop.y * oh : 0
  const k = bufferW / contentOw
  const cover = straightenCover(ow, oh, geometry.straighten)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, bufferW, bufferH)
  ctx.save()
  ctx.translate(-cropX * k, -cropY * k)
  ctx.translate((ow * k) / 2, (oh * k) / 2)
  ctx.rotate(
    (geometry.rotate90 * 90 * Math.PI) / 180 + (geometry.straighten * Math.PI) / 180
  )
  ctx.scale(geometry.flipH ? -1 : 1, geometry.flipV ? -1 : 1)
  ctx.scale(cover, cover)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, (-srcW * k) / 2, (-srcH * k) / 2, srcW * k, srcH * k)
  ctx.restore()
}

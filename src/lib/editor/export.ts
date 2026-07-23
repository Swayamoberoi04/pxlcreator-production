/**
 * src/lib/editor/export.ts
 *
 * The export pipeline. Turns (source image + Adjustments + Geometry) into a
 * downloadable Blob at the chosen format / quality / resolution.
 *
 * TWO STAGES
 *   1. Colour  — the WebGL engine renders the full-resolution adjusted image
 *                (no geometry) onto its canvas. This is the exact same shader
 *                the preview uses, so what you see is what you export.
 *   2. Geometry — a 2D <canvas> applies rotate → flip → straighten → crop and
 *                 encodes the result. Doing geometry here (not in the shader)
 *                 keeps the engine simple and makes the output dimensions exact.
 *
 * Nothing here mutates the source: the AI original is always recoverable.
 */

import type { EditorRenderer } from "./renderer"
import type { Adjustments, Geometry } from "./adjustments"
import { orientedDims, drawGeometry } from "./geometry"

export type ExportFormat = "jpeg" | "png" | "webp"

export interface ExportOptions {
  format: ExportFormat
  /** 0..1 — ignored for PNG (lossless). */
  quality: number
  /** Longest-edge cap in px. null = original resolution. */
  maxEdge: number | null
}

const MIME: Record<ExportFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

/**
 * Build the final oriented + cropped image on a 2D canvas at full resolution,
 * ready to encode. Uses the exact same `drawGeometry` the live preview uses.
 */
function composite(
  sourceCanvas: HTMLCanvasElement,
  srcW: number,
  srcH: number,
  geometry: Geometry
): HTMLCanvasElement {
  const { w: ow, h: oh } = orientedDims(srcW, srcH, geometry.rotate90)
  const crop = geometry.crop
  // Output dimensions are the cropped oriented dimensions, at full resolution.
  const outW = Math.max(1, Math.round((crop ? crop.w : 1) * ow))
  const outH = Math.max(1, Math.round((crop ? crop.h : 1) * oh))

  const out = document.createElement("canvas")
  out.width = outW
  out.height = outH
  const ctx = out.getContext("2d")!
  drawGeometry(ctx, sourceCanvas, srcW, srcH, geometry, outW, outH, true)
  return out
}

/** Downscale a canvas so its longest edge <= maxEdge (no-op if already small). */
function clampResolution(canvas: HTMLCanvasElement, maxEdge: number | null): HTMLCanvasElement {
  if (!maxEdge) return canvas
  const longest = Math.max(canvas.width, canvas.height)
  if (longest <= maxEdge) return canvas
  const s = maxEdge / longest
  const out = document.createElement("canvas")
  out.width = Math.round(canvas.width * s)
  out.height = Math.round(canvas.height * s)
  const ctx = out.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return out
}

/**
 * Render + composite + encode. The renderer's canvas is momentarily resized to
 * full resolution and restored to `previewW/previewH` before returning.
 */
export async function exportImage(
  renderer: EditorRenderer,
  adjustments: Adjustments,
  geometry: Geometry,
  options: ExportOptions,
  previewW: number,
  previewH: number
): Promise<Blob> {
  // Stage 1 — colour at full resolution on the GL canvas.
  renderer.renderFullResolution(adjustments)
  const srcW = renderer.imageWidth
  const srcH = renderer.imageHeight

  // Copy the GL canvas into a 2D canvas we own (the GL canvas is shared with
  // the live preview and will be resized back momentarily).
  const snapshot = document.createElement("canvas")
  snapshot.width = srcW
  snapshot.height = srcH
  const sctx = snapshot.getContext("2d")!
  sctx.drawImage(renderer.element, 0, 0)

  // Restore the preview size right away so the visible canvas is correct again.
  renderer.restoreSize(previewW, previewH)

  // Stage 2 — geometry + resolution.
  const composited = composite(snapshot, srcW, srcH, geometry)
  const final = clampResolution(composited, options.maxEdge)

  // Stage 3 — encode.
  const blob = await new Promise<Blob | null>((resolve) =>
    final.toBlob(resolve, MIME[options.format], options.quality)
  )
  if (!blob) throw new Error("Failed to encode image for export.")
  return blob
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on the next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

"use client"

/**
 * CropOverlay — the interactive crop rectangle drawn over the image while the
 * editor is in crop mode.
 *
 * It works entirely in *normalised oriented* coordinates (0..1 relative to the
 * rotated/flipped image), which is exactly what `Geometry.crop` stores and what
 * the exporter reads — so the box you drag here is the box you get on export.
 * The parent gives it the on-screen fit size (px); this component maps between
 * pixels and normalised space.
 */

import { useCallback, useRef } from "react"
import type { CropRect } from "@/lib/editor/adjustments"

type Handle = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"

interface CropOverlayProps {
  /** On-screen size of the (full, uncropped) image in CSS px. */
  width: number
  height: number
  /** Current crop in normalised coords, or null = full frame. */
  crop: CropRect | null
  /** Locked aspect ratio (w/h), or null = free. */
  aspect: number | null
  onChange: (crop: CropRect) => void
  onCommit: () => void
}

const MIN = 0.05 // smallest crop as a fraction of the image

export function CropOverlay({
  width,
  height,
  crop,
  aspect,
  onChange,
  onCommit,
}: CropOverlayProps) {
  const rect = crop ?? { x: 0, y: 0, w: 1, h: 1 }
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: CropRect } | null>(
    null
  )

  const onPointerDown = useCallback(
    (handle: Handle) => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      drag.current = { handle, startX: e.clientX, startY: e.clientY, start: { ...rect } }
    },
    [rect]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = (e.clientX - d.startX) / width
      const dy = (e.clientY - d.startY) / height
      let { x, y, w, h } = d.start

      if (d.handle === "move") {
        x = Math.min(Math.max(0, d.start.x + dx), 1 - w)
        y = Math.min(Math.max(0, d.start.y + dy), 1 - h)
      } else {
        let left = d.start.x
        let top = d.start.y
        let right = d.start.x + d.start.w
        let bottom = d.start.y + d.start.h
        if (d.handle.includes("w")) left = Math.min(d.start.x + dx, right - MIN)
        if (d.handle.includes("e")) right = Math.max(d.start.x + d.start.w + dx, left + MIN)
        if (d.handle.includes("n")) top = Math.min(d.start.y + dy, bottom - MIN)
        if (d.handle.includes("s")) bottom = Math.max(d.start.y + d.start.h + dy, top + MIN)
        left = Math.max(0, left)
        top = Math.max(0, top)
        right = Math.min(1, right)
        bottom = Math.min(1, bottom)
        x = left
        y = top
        w = right - left
        h = bottom - top

        // Enforce aspect ratio (in pixel space) by adjusting height from width.
        if (aspect) {
          const pxW = w * width
          const pxH = pxW / aspect
          h = pxH / height
          if (d.handle.includes("n")) y = bottom - h
          if (y < 0) {
            y = 0
            h = bottom
          }
          if (y + h > 1) h = 1 - y
        }
      }
      onChange({ x, y, w, h })
    },
    [width, height, aspect, onChange]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return
      drag.current = null
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      onCommit()
    },
    [onCommit]
  )

  const px = { left: rect.x * width, top: rect.y * height, width: rect.w * width, height: rect.h * height }
  const handles: Handle[] = ["nw", "ne", "sw", "se", "n", "s", "e", "w"]
  const handlePos: Record<Handle, { left: string; top: string; cursor: string }> = {
    move: { left: "0", top: "0", cursor: "move" },
    nw: { left: "0%", top: "0%", cursor: "nwse-resize" },
    ne: { left: "100%", top: "0%", cursor: "nesw-resize" },
    sw: { left: "0%", top: "100%", cursor: "nesw-resize" },
    se: { left: "100%", top: "100%", cursor: "nwse-resize" },
    n: { left: "50%", top: "0%", cursor: "ns-resize" },
    s: { left: "50%", top: "100%", cursor: "ns-resize" },
    e: { left: "100%", top: "50%", cursor: "ew-resize" },
    w: { left: "0%", top: "50%", cursor: "ew-resize" },
  }

  return (
    <div
      className="absolute inset-0"
      style={{ width, height }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Dim mask outside the crop via 4 dark rectangles */}
      <div className="absolute bg-black/55" style={{ left: 0, top: 0, width, height: px.top }} />
      <div
        className="absolute bg-black/55"
        style={{ left: 0, top: px.top + px.height, width, height: height - px.top - px.height }}
      />
      <div className="absolute bg-black/55" style={{ left: 0, top: px.top, width: px.left, height: px.height }} />
      <div
        className="absolute bg-black/55"
        style={{ left: px.left + px.width, top: px.top, width: width - px.left - px.width, height: px.height }}
      />

      {/* Crop box */}
      <div
        className="absolute border border-white/90 cursor-move touch-none"
        style={{ left: px.left, top: px.top, width: px.width, height: px.height }}
        onPointerDown={onPointerDown("move")}
      >
        {/* Rule-of-thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 inset-x-0 h-px bg-white/25" />
          <div className="absolute top-2/3 inset-x-0 h-px bg-white/25" />
          <div className="absolute left-1/3 inset-y-0 w-px bg-white/25" />
          <div className="absolute left-2/3 inset-y-0 w-px bg-white/25" />
        </div>
        {/* Resize handles */}
        {handles.map((hd) => (
          <div
            key={hd}
            onPointerDown={onPointerDown(hd)}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-1 ring-black/30 touch-none"
            style={{ left: handlePos[hd].left, top: handlePos[hd].top, cursor: handlePos[hd].cursor }}
          />
        ))}
      </div>
    </div>
  )
}

"use client"

/**
 * EditorCanvas — the large centre viewer.
 *
 * It owns two canvases:
 *   • a hidden WebGL canvas the engine renders COLOUR onto, and
 *   • a visible 2D canvas that composites GEOMETRY (rotate/flip/straighten/crop)
 *     from the WebGL canvas via the shared `drawGeometry` helper.
 *
 * Splitting colour (GPU shader) from geometry (2D compositor) keeps the shader
 * simple and makes the preview pixel-identical to the exporter, which runs the
 * very same `drawGeometry`. Zoom/pan are a CSS transform on the display canvas.
 *
 * Rendering is demand-driven: any store change bumps `revision`, which schedules
 * a single rAF render — no free-running loop, so an idle editor costs nothing.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { EditorRenderer } from "@/lib/editor/renderer"
import { drawGeometry, orientedDims } from "@/lib/editor/geometry"
import { exportImage, type ExportOptions } from "@/lib/editor/export"
import { useEditorStore, renderSettingsFrom } from "@/lib/editor/store"
import type { CropRect } from "@/lib/editor/adjustments"
import { analyzeImage } from "@/lib/editor/ai/analyze"
import { CropOverlay } from "./CropOverlay"
import { MaskOverlay } from "./MaskOverlay"
import { HealOverlay } from "./HealOverlay"

/** Longest-edge cap for the live preview render (export uses full resolution). */
const MAX_PREVIEW_EDGE = 2048

export interface EditorCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  /** Zoom to a multiple of actual pixels (1 = 100%, 2 = 200%). */
  actual: (mult: number) => void
  /** Full-resolution export of the current edit. */
  exportImage: (options: ExportOptions) => Promise<Blob>
  /** Native source dimensions, for the export dialog. */
  sourceSize: () => { w: number; h: number }
}

interface EditorCanvasProps {
  imageUrl: string
  cropMode: boolean
  cropAspect: number | null
  onZoomPercent: (percent: number) => void
  onError: (message: string) => void
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  { imageUrl, cropMode, cropAspect, onZoomPercent, onError },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glCanvasRef = useRef<HTMLCanvasElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<EditorRenderer | null>(null)
  const rafRef = useRef<number | null>(null)
  const readyRef = useRef(false)
  const fitScaleRef = useRef(1) // on-screen px per native px at zoom = 1
  const fitSizeRef = useRef({ w: 0, h: 0 })

  const [zoom, setZoom] = useState(1) // 1 = fit
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [fitDims, setFitDims] = useState({ w: 0, h: 0 })

  const revision = useEditorStore((s) => s.revision)
  const setCrop = useEditorStore((s) => s.setCrop)
  const commit = useEditorStore((s) => s.commit)

  /* ── The one render function: colour → geometry → display ── */
  const renderAll = useCallback(() => {
    const renderer = rendererRef.current
    const glCanvas = glCanvasRef.current
    const display = displayCanvasRef.current
    const container = containerRef.current
    if (!renderer || !renderer.ok || !glCanvas || !display || !container || !readyRef.current) return

    const state = useEditorStore.getState()
    const { geometry, showBefore } = state

    // 1) Size the GL buffer to a capped preview resolution and render colour.
    const srcW = renderer.imageWidth
    const srcH = renderer.imageHeight
    const previewScale = Math.min(1, MAX_PREVIEW_EDGE / Math.max(srcW, srcH))
    const glW = Math.max(1, Math.round(srcW * previewScale))
    const glH = Math.max(1, Math.round(srcH * previewScale))
    if (glCanvas.width !== glW || glCanvas.height !== glH) {
      glCanvas.width = glW
      glCanvas.height = glH
    }
    renderer.render(renderSettingsFrom(state), showBefore)

    // 2) Work out the on-screen fit size of the visible content.
    const applyCrop = !cropMode
    const { w: ow, h: oh } = orientedDims(srcW, srcH, geometry.rotate90)
    const crop = applyCrop ? geometry.crop : null
    const contentW = crop ? crop.w * ow : ow
    const contentH = crop ? crop.h * oh : oh
    const aspect = contentW / contentH

    const pad = 48
    const availW = Math.max(1, container.clientWidth - pad)
    const availH = Math.max(1, container.clientHeight - pad)
    let fitW: number
    let fitH: number
    if (availW / availH > aspect) {
      fitH = availH
      fitW = availH * aspect
    } else {
      fitW = availW
      fitH = availW / aspect
    }

    // 3) Composite geometry into the display canvas at DPR-aware resolution.
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const bufW = Math.max(1, Math.round(fitW * dpr))
    const bufH = Math.max(1, Math.round(fitH * dpr))
    if (display.width !== bufW || display.height !== bufH) {
      display.width = bufW
      display.height = bufH
    }
    const ctx = display.getContext("2d")
    if (ctx) drawGeometry(ctx, glCanvas, srcW, srcH, geometry, bufW, bufH, applyCrop)

    display.style.width = `${fitW}px`
    display.style.height = `${fitH}px`

    fitScaleRef.current = fitW / contentW
    fitSizeRef.current = { w: fitW, h: fitH }
    setFitDims({ w: fitW, h: fitH })
  }, [cropMode])

  const scheduleRender = useCallback(() => {
    // requestAnimationFrame is paused while the tab is hidden. Render straight
    // away in that case so the canvas is correct the moment it becomes visible
    // (e.g. the editor opened in a background tab), instead of stalling.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      renderAll()
      return
    }
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      renderAll()
    })
  }, [renderAll])

  /* ── Set up the engine + load the image once ── */
  useEffect(() => {
    const glCanvas = glCanvasRef.current
    if (!glCanvas) return
    let renderer: EditorRenderer
    try {
      renderer = new EditorRenderer(glCanvas)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to start the rendering engine.")
      return
    }
    rendererRef.current = renderer

    const img = new Image()
    img.decoding = "async"
    img.onload = () => {
      if (!rendererRef.current) return
      try {
        rendererRef.current.setImage(img)
        readyRef.current = true
        scheduleRender()
        // Run AI analysis on the original image, deferred so it never blocks the
        // first paint. A plain timeout is used (not requestIdleCallback, which is
        // throttled on hidden/background tabs and could stall the assistant).
        setTimeout(() => {
          try {
            useEditorStore.getState().setAnalysis(analyzeImage(img, img.naturalWidth || img.width, img.naturalHeight || img.height))
          } catch {
            /* analysis is best-effort */
          }
        }, 50)
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to load the image into the editor.")
      }
    }
    img.onerror = () => onError("The image could not be loaded into the editor.")
    img.src = imageUrl

    return () => {
      readyRef.current = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      renderer.dispose()
      rendererRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl])

  /* ── Re-render on any state change or crop-mode toggle ── */
  useEffect(() => {
    scheduleRender()
  }, [revision, cropMode, scheduleRender])

  /* ── Re-render on container resize ── */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => scheduleRender())
    ro.observe(container)
    return () => ro.disconnect()
  }, [scheduleRender])

  /* ── Re-render when the tab becomes visible again ── */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRender()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [scheduleRender])

  /* ── Report zoom percentage (relative to actual pixels) ── */
  useEffect(() => {
    onZoomPercent(Math.round(fitScaleRef.current * zoom * 100))
  }, [zoom, fitDims, onZoomPercent])

  /* ── Wheel zoom (non-passive so we can preventDefault) ── */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((z) => Math.min(8, Math.max(0.2, z * (e.deltaY < 0 ? 1.1 : 1 / 1.1))))
    }
    container.addEventListener("wheel", onWheel, { passive: false })
    return () => container.removeEventListener("wheel", onWheel)
  }, [])

  /* ── Imperative zoom controls for the top bar ── */
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => setZoom((z) => Math.min(8, z * 1.25)),
      zoomOut: () => setZoom((z) => Math.max(0.2, z / 1.25)),
      fit: () => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
      },
      actual: (mult: number) => {
        const fs = fitScaleRef.current || 1
        setZoom(mult / fs)
        setPan({ x: 0, y: 0 })
      },
      exportImage: async (options: ExportOptions) => {
        const renderer = rendererRef.current
        const gl = glCanvasRef.current
        if (!renderer || !renderer.ok || !gl) throw new Error("The editor is not ready to export.")
        const previewW = gl.width
        const previewH = gl.height
        const state = useEditorStore.getState()
        const blob = await exportImage(
          renderer,
          renderSettingsFrom(state),
          state.geometry,
          options,
          previewW,
          previewH
        )
        // The GL buffer was resized during export; repaint the preview.
        scheduleRender()
        return blob
      },
      sourceSize: () => {
        const renderer = rendererRef.current
        return { w: renderer?.imageWidth ?? 0, h: renderer?.imageHeight ?? 0 }
      },
    }),
    [scheduleRender]
  )

  /* ── Drag to pan when zoomed in (disabled in crop mode) ── */
  const compareDrag = useRef(false)
  const panDrag = useRef<{ x: number; y: number; startPan: { x: number; y: number } } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (cropMode || activeMaskId || healMode || zoom <= 1) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    panDrag.current = { x: e.clientX, y: e.clientY, startPan: pan }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!panDrag.current) return
    setPan({
      x: panDrag.current.startPan.x + (e.clientX - panDrag.current.x),
      y: panDrag.current.startPan.y + (e.clientY - panDrag.current.y),
    })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    panDrag.current = null
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const geometry = useEditorStore((s) => s.geometry)
  const handleCropChange = useCallback((c: CropRect) => setCrop(c), [setCrop])

  const activeMaskId = useEditorStore((s) => s.activeMaskId)
  const activeMask = useEditorStore((s) => s.masks.find((m) => m.id === s.activeMaskId) ?? null)
  const updateMask = useEditorStore((s) => s.updateMask)
  const brushRadius = useEditorStore((s) => s.brushRadius)
  const brushFeather = useEditorStore((s) => s.brushFeather)
  const brushErase = useEditorStore((s) => s.brushErase)
  const maskEditable = activeMask && (activeMask.type === "radial" || activeMask.type === "linear" || activeMask.type === "brush")
  const healMode = useEditorStore((s) => s.healMode)
  const compareMode = useEditorStore((s) => s.compareMode)
  const comparePos = useEditorStore((s) => s.comparePos)
  const setCompare = useEditorStore((s) => s.setCompare)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)

  // Generate the "before" (original) composite for the split-compare overlay.
  // Only regenerates on compare toggle / geometry / fit change — not on edits.
  useEffect(() => {
    if (!compareMode) {
      setBeforeUrl(null)
      return
    }
    const renderer = rendererRef.current
    const gl = glCanvasRef.current
    if (!renderer || !renderer.ok || !gl || !readyRef.current || fitDims.w === 0) return
    const state = useEditorStore.getState()
    const srcW = renderer.imageWidth
    const srcH = renderer.imageHeight
    renderer.render(renderSettingsFrom(state), true) // before → gl scratch
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const bw = Math.max(1, Math.round(fitDims.w * dpr))
    const bh = Math.max(1, Math.round(fitDims.h * dpr))
    const tmp = document.createElement("canvas")
    tmp.width = bw
    tmp.height = bh
    const tctx = tmp.getContext("2d")
    if (tctx) drawGeometry(tctx, gl, srcW, srcH, state.geometry, bw, bh, !cropMode)
    setBeforeUrl(tmp.toDataURL("image/png"))
    scheduleRender() // restore "after" into gl + display
  }, [compareMode, fitDims.w, fitDims.h, geometry, cropMode, scheduleRender])

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ cursor: !cropMode && zoom > 1 ? (panDrag.current ? "grabbing" : "grab") : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Hidden GL canvas — colour only */}
      <canvas ref={glCanvasRef} className="hidden" aria-hidden="true" />

      {/* Visible display canvas + crop overlay, transformed together for zoom/pan */}
      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <canvas
          ref={displayCanvasRef}
          className="block rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
        />
        {cropMode && fitDims.w > 0 && (
          <CropOverlay
            width={fitDims.w}
            height={fitDims.h}
            crop={geometry.crop}
            aspect={cropAspect}
            onChange={handleCropChange}
            onCommit={commit}
          />
        )}
        {!cropMode && !healMode && maskEditable && activeMask && fitDims.w > 0 && (
          <MaskOverlay
            mask={activeMask}
            width={fitDims.w}
            height={fitDims.h}
            brushRadius={brushRadius}
            brushFeather={brushFeather}
            brushErase={brushErase}
            updateMask={updateMask}
            commit={commit}
          />
        )}
        {!cropMode && healMode && fitDims.w > 0 && (
          <HealOverlay width={fitDims.w} height={fitDims.h} />
        )}
        {compareMode && beforeUrl && fitDims.w > 0 && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={beforeUrl}
              alt="before"
              className="pointer-events-none absolute inset-0 select-none rounded-sm"
              style={{ width: fitDims.w, height: fitDims.h, clipPath: `inset(0 ${(1 - comparePos) * 100}% 0 0)` }}
            />
            <div
              className="absolute inset-y-0 z-10 flex w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center touch-none"
              style={{ left: comparePos * fitDims.w }}
              onPointerDown={(e) => {
                e.stopPropagation()
                ;(e.target as Element).setPointerCapture(e.pointerId)
                compareDrag.current = true
              }}
              onPointerMove={(e) => {
                if (!compareDrag.current) return
                const rect = displayCanvasRef.current!.getBoundingClientRect()
                setCompare({ comparePos: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) })
              }}
              onPointerUp={(e) => {
                compareDrag.current = false
                ;(e.target as Element).releasePointerCapture?.(e.pointerId)
              }}
            >
              <div className="h-full w-px bg-gold/90" />
              <div className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-gold/70 bg-black/70 text-gold shadow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /><polyline points="9 18 15 12 9 6" transform="translate(6 0)" /></svg>
              </div>
            </div>
            <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wider text-white/92">Before</span>
            <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wider text-white/92">After</span>
          </>
        )}
      </div>
    </div>
  )
})

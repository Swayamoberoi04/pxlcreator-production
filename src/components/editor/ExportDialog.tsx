"use client"

/**
 * ExportDialog — format / quality / resolution picker for the final render.
 *
 * It never touches pixels itself: it collects options and hands them to the
 * shell, which drives the WebGL exporter at full resolution. Output dimensions
 * are shown live so the user knows exactly what they'll get.
 */

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { ExportFormat, ExportOptions } from "@/lib/editor/export"
import { orientedDims } from "@/lib/editor/geometry"
import { useEditorStore } from "@/lib/editor/store"

interface ExportDialogProps {
  open: boolean
  sourceW: number
  sourceH: number
  exporting: boolean
  onCancel: () => void
  onExport: (options: ExportOptions) => void
}

const FORMATS: { id: ExportFormat; label: string; lossy: boolean }[] = [
  { id: "jpeg", label: "JPEG", lossy: true },
  { id: "png", label: "PNG", lossy: false },
  { id: "webp", label: "WEBP", lossy: true },
]

const RESOLUTIONS: { label: string; maxEdge: number | null }[] = [
  { label: "Original", maxEdge: null },
  { label: "4K (3840)", maxEdge: 3840 },
  { label: "2K (2048)", maxEdge: 2048 },
  { label: "Web (1280)", maxEdge: 1280 },
]

export function ExportDialog({
  open,
  sourceW,
  sourceH,
  exporting,
  onCancel,
  onExport,
}: ExportDialogProps) {
  const geometry = useEditorStore((s) => s.geometry)
  const [format, setFormat] = useState<ExportFormat>("jpeg")
  const [quality, setQuality] = useState(92)
  const [maxEdge, setMaxEdge] = useState<number | null>(null)

  const outDims = useMemo(() => {
    const { w: ow, h: oh } = orientedDims(sourceW, sourceH, geometry.rotate90)
    let w = geometry.crop ? geometry.crop.w * ow : ow
    let h = geometry.crop ? geometry.crop.h * oh : oh
    if (maxEdge) {
      const longest = Math.max(w, h)
      if (longest > maxEdge) {
        const s = maxEdge / longest
        w *= s
        h *= s
      }
    }
    return { w: Math.round(w), h: Math.round(h) }
  }, [sourceW, sourceH, geometry, maxEdge])

  if (!open) return null
  const lossy = FORMATS.find((f) => f.id === format)?.lossy ?? true

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h3 className="font-display text-[1.125rem] font-bold text-foreground">Export image</h3>
        <p className="mt-1 text-[0.8125rem] text-muted/85">
          {outDims.w} × {outDims.h} px
        </p>

        {/* Format */}
        <div className="mt-5">
          <p className="mb-2 text-label tracking-widest text-muted/85">Format</p>
          <div className="grid grid-cols-3 gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={cn(
                  "rounded-lg border py-2 text-[0.8125rem] transition-colors",
                  format === f.id
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border text-muted/92 hover:border-gold/30 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quality (lossy only) */}
        {lossy && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-label tracking-widest text-muted/85">Quality</p>
              <span className="text-[0.8125rem] tabular-nums text-gold">{quality}</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-gold"
            />
          </div>
        )}

        {/* Resolution */}
        <div className="mt-5">
          <p className="mb-2 text-label tracking-widest text-muted/85">Resolution</p>
          <div className="grid grid-cols-2 gap-1.5">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setMaxEdge(r.maxEdge)}
                className={cn(
                  "rounded-lg border py-2 text-[0.8125rem] transition-colors",
                  maxEdge === r.maxEdge
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border text-muted/92 hover:border-gold/30 hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={exporting}
            className="flex-1 rounded-xl border border-border py-2.5 text-[0.875rem] font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onExport({ format, quality: quality / 100, maxEdge })}
            disabled={exporting}
            className="flex-1 rounded-xl bg-gold py-2.5 text-[0.875rem] font-semibold text-black transition-colors hover:bg-gold-bright disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  )
}

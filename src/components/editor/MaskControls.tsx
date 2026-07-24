"use client"

/**
 * MaskControls — the right-panel content while a mask is selected.
 *
 * Shows the mask's meta (enable/invert/opacity), any type-specific geometry
 * (feather, luminance range, brush tool), and the local adjustment sliders that
 * apply only inside the mask. Everything writes to the selected mask via the
 * store; releasing a control commits one undo step.
 */

import { cn } from "@/lib/utils"
import {
  MASK_SLIDERS,
  MASK_TYPES,
  DEFAULT_MASK_ADJUSTMENTS,
  type Mask,
} from "@/lib/editor/adjustments"
import { useEditorStore } from "@/lib/editor/store"
import { AdjustmentSlider } from "./AdjustmentSlider"

export function MaskControls({ mask }: { mask: Mask }) {
  const updateMask = useEditorStore((s) => s.updateMask)
  const setMaskAdjustment = useEditorStore((s) => s.setMaskAdjustment)
  const deleteMask = useEditorStore((s) => s.deleteMask)
  const selectMask = useEditorStore((s) => s.selectMask)
  const commit = useEditorStore((s) => s.commit)

  const brushRadius = useEditorStore((s) => s.brushRadius)
  const brushFeather = useEditorStore((s) => s.brushFeather)
  const brushErase = useEditorStore((s) => s.brushErase)
  const setBrush = useEditorStore((s) => s.setBrush)

  const meta = MASK_TYPES.find((m) => m.type === mask.type)!
  const adjusted = (Object.keys(DEFAULT_MASK_ADJUSTMENTS) as (keyof typeof DEFAULT_MASK_ADJUSTMENTS)[]).some(
    (k) => mask.adjustments[k] !== 0
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => selectMask(null)}
          className="flex items-center gap-1.5 text-[0.8125rem] text-muted transition-colors hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          Masks
        </button>
        <button
          type="button"
          onClick={() => deleteMask(mask.id)}
          className="text-muted/50 transition-colors hover:text-red-400"
          title="Delete mask"
          aria-label="Delete mask"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <p className="text-label tracking-widest text-gold">{mask.name}</p>
          <p className="mt-0.5 text-[0.75rem] text-muted/50">{meta.hint}</p>
          {mask.type === "brush" && (
            <p className="mt-2 text-[0.75rem] text-foreground/70">Paint on the image to build the mask.</p>
          )}
          {(mask.type === "sky" || mask.type === "subject") && (
            <p className="mt-2 rounded-md border border-gold/20 bg-gold/5 px-2.5 py-1.5 text-[0.6875rem] text-gold/80">
              Beta · auto-detected from the image
            </p>
          )}
        </div>

        {/* Meta toggles */}
        <div className="flex gap-2">
          <Toggle label={mask.enabled ? "Enabled" : "Disabled"} active={mask.enabled} onClick={() => { updateMask(mask.id, { enabled: !mask.enabled }); commit() }} />
          <Toggle label="Invert" active={mask.inverted} onClick={() => { updateMask(mask.id, { inverted: !mask.inverted }); commit() }} />
        </div>

        <AdjustmentSlider
          label="Mask Opacity"
          value={mask.opacity}
          min={0}
          max={100}
          center={100}
          onChange={(v) => updateMask(mask.id, { opacity: v })}
          onCommit={commit}
        />

        {/* Radial feather */}
        {mask.type === "radial" && mask.radial && (
          <AdjustmentSlider
            label="Feather"
            value={mask.radial.feather}
            min={0}
            max={100}
            center={50}
            onChange={(v) => updateMask(mask.id, { radial: { ...mask.radial!, feather: v } })}
            onCommit={commit}
          />
        )}

        {/* Luminance range */}
        {mask.type === "luminance" && mask.luminance && (
          <div className="flex flex-col gap-3.5">
            <AdjustmentSlider label="Range Min" value={Math.round(mask.luminance.min * 100)} min={0} max={100} center={0}
              onChange={(v) => updateMask(mask.id, { luminance: { ...mask.luminance!, min: v / 100 } })} onCommit={commit} />
            <AdjustmentSlider label="Range Max" value={Math.round(mask.luminance.max * 100)} min={0} max={100} center={100}
              onChange={(v) => updateMask(mask.id, { luminance: { ...mask.luminance!, max: v / 100 } })} onCommit={commit} />
            <AdjustmentSlider label="Feather" value={mask.luminance.feather} min={0} max={100} center={30}
              onChange={(v) => updateMask(mask.id, { luminance: { ...mask.luminance!, feather: v } })} onCommit={commit} />
          </div>
        )}

        {/* Brush tool settings */}
        {mask.type === "brush" && (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <p className="text-[0.6875rem] uppercase tracking-wider text-muted/40">Brush</p>
            <label className="flex flex-col gap-1 text-[0.75rem] text-muted/70">
              Size
              <input type="range" min={0.01} max={0.3} step={0.005} value={brushRadius}
                onChange={(e) => setBrush({ brushRadius: Number(e.target.value) })} className="accent-gold" />
            </label>
            <label className="flex flex-col gap-1 text-[0.75rem] text-muted/70">
              Softness
              <input type="range" min={0} max={1} step={0.05} value={brushFeather}
                onChange={(e) => setBrush({ brushFeather: Number(e.target.value) })} className="accent-gold" />
            </label>
            <div className="flex gap-2">
              <Toggle label="Paint" active={!brushErase} onClick={() => setBrush({ brushErase: false })} />
              <Toggle label="Erase" active={brushErase} onClick={() => setBrush({ brushErase: true })} />
            </div>
            {(mask.brush?.strokes.length ?? 0) > 0 && (
              <button type="button" onClick={() => { updateMask(mask.id, { brush: { strokes: [] } }); commit() }}
                className="text-[0.6875rem] uppercase tracking-wider text-muted/50 hover:text-gold">
                Clear strokes
              </button>
            )}
          </div>
        )}

        {/* Local adjustments */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-label tracking-widest text-foreground/90">Local Adjustments</p>
          {adjusted && (
            <button type="button" onClick={() => { updateMask(mask.id, { adjustments: { ...DEFAULT_MASK_ADJUSTMENTS } }); commit() }}
              className="text-[0.6875rem] uppercase tracking-wider text-muted/50 hover:text-gold">
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3.5">
          {MASK_SLIDERS.map((m) => (
            <AdjustmentSlider
              key={m.key}
              label={m.label}
              value={mask.adjustments[m.key]}
              min={m.min}
              max={m.max}
              center={m.center}
              onChange={(v) => setMaskAdjustment(mask.id, m.key, v)}
              onCommit={commit}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border py-2 text-[0.75rem] transition-colors",
        active ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted/60 hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

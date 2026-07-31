"use client"

/**
 * RightPanel — the editing controls, grouped into collapsible sections.
 *
 * Phase 1 sections (Light/Color/Detail) are generated from `EDIT_SECTIONS`;
 * Phase 2 adds Curves, HSL, Color Grading, Vignette, Grain, and Noise Reduction,
 * each backed by the store. Every control drags live (`set…`) and checkpoints on
 * release (`commit`). The Crop & Geometry block drives geometry + the crop mode
 * owned by the shell.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  EDIT_SECTIONS,
  VIGNETTE_SLIDERS,
  GRAIN_SLIDERS,
  NOISE_SLIDERS,
  DEFAULT_VIGNETTE,
  DEFAULT_GRAIN,
  DEFAULT_NOISE,
  type AdjustmentKey,
  type SectionMeta,
  type Vignette,
  type Grain,
  type NoiseReduction,
} from "@/lib/editor/adjustments"
import { useEditorStore } from "@/lib/editor/store"
import { AdjustmentSlider } from "./AdjustmentSlider"
import { CurveEditor } from "./CurveEditor"
import { HSLPanel } from "./HSLPanel"
import { ColorGradingPanel } from "./ColorGradingPanel"
import { MaskControls } from "./MaskControls"

interface RightPanelProps {
  cropMode: boolean
  setCropMode: (v: boolean) => void
  cropAspect: number | null
  setCropAspect: (v: number | null) => void
}

export function RightPanel({ cropMode, setCropMode, cropAspect, setCropAspect }: RightPanelProps) {
  const activeMaskId = useEditorStore((s) => s.activeMaskId)
  const activeMask = useEditorStore((s) => s.masks.find((m) => m.id === s.activeMaskId) ?? null)

  // When a mask is selected the whole panel becomes that mask's controls.
  if (activeMaskId && activeMask) return <MaskControls mask={activeMask} />

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col divide-y divide-border">
        {EDIT_SECTIONS.map((section) => (
          <AdjustmentSection key={section.id} section={section} />
        ))}
        <CurvesSection />
        <HSLSection />
        <GradingSection />
        <VignetteSection />
        <GrainSection />
        <NoiseSection />
        <HealSection />
        <CropSection
          cropMode={cropMode}
          setCropMode={setCropMode}
          cropAspect={cropAspect}
          setCropAspect={setCropAspect}
        />
      </div>
    </div>
  )
}

/* ── Reusable collapsible shell ── */
function Collapsible({
  title,
  edited,
  onReset,
  defaultOpen = false,
  children,
}: {
  title: string
  edited?: boolean
  onReset?: () => void
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-label tracking-widest text-foreground/90 hover:text-gold transition-colors"
        >
          <Chevron open={open} />
          {title}
        </button>
        {edited && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[0.6875rem] uppercase tracking-wider text-muted/85 hover:text-gold transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      {open && <div className="mt-3.5 flex flex-col gap-3.5">{children}</div>}
    </div>
  )
}

/* ── Phase 1 adjustment section ── */
function AdjustmentSection({ section }: { section: SectionMeta }) {
  const adjustments = useEditorStore((s) => s.adjustments)
  const setAdjustment = useEditorStore((s) => s.setAdjustment)
  const commit = useEditorStore((s) => s.commit)
  const resetSection = useEditorStore((s) => s.resetSection)

  const keys = section.sliders.map((s) => s.key)
  const edited = keys.some((k) => adjustments[k] !== 0)

  return (
    <Collapsible title={section.title} defaultOpen edited={edited} onReset={() => resetSection(keys)}>
      {section.sliders.map((meta) => (
        <AdjustmentSlider
          key={meta.key}
          label={meta.label}
          value={adjustments[meta.key]}
          min={meta.min}
          max={meta.max}
          center={meta.center}
          onChange={(v) => setAdjustment(meta.key as AdjustmentKey, v)}
          onCommit={commit}
        />
      ))}
    </Collapsible>
  )
}

/* ── Curves ── */
function CurvesSection() {
  const curves = useEditorStore((s) => s.curves)
  const setCurve = useEditorStore((s) => s.setCurve)
  const commit = useEditorStore((s) => s.commit)
  const resetGroup = useEditorStore((s) => s.resetGroup)
  const edited = (["rgb", "r", "g", "b"] as const).some(
    (ch) => curves[ch].length !== 2 || curves[ch].some((p, i) => p.x !== i || p.y !== i)
  )
  return (
    <Collapsible title="Curve" edited={edited} onReset={() => resetGroup("curves")}>
      <CurveEditor curves={curves} setCurve={setCurve} commit={commit} />
    </Collapsible>
  )
}

/* ── HSL ── */
function HSLSection() {
  const hsl = useEditorStore((s) => s.hsl)
  const setHSLBand = useEditorStore((s) => s.setHSLBand)
  const commit = useEditorStore((s) => s.commit)
  const resetGroup = useEditorStore((s) => s.resetGroup)
  const edited = hsl.some((b) => b.h !== 0 || b.s !== 0 || b.l !== 0)
  return (
    <Collapsible title="Color Mixer (HSL)" edited={edited} onReset={() => resetGroup("hsl")}>
      <HSLPanel hsl={hsl} setHSLBand={setHSLBand} commit={commit} />
    </Collapsible>
  )
}

/* ── Color Grading ── */
function GradingSection() {
  const grading = useEditorStore((s) => s.grading)
  const setGrade = useEditorStore((s) => s.setGrade)
  const setGradingParam = useEditorStore((s) => s.setGradingParam)
  const commit = useEditorStore((s) => s.commit)
  const resetGroup = useEditorStore((s) => s.resetGroup)
  const zoneEdited = (z: { hue: number; sat: number; lum: number }) => z.sat !== 0 || z.lum !== 0
  const edited =
    zoneEdited(grading.shadows) ||
    zoneEdited(grading.midtones) ||
    zoneEdited(grading.highlights) ||
    zoneEdited(grading.global)
  return (
    <Collapsible title="Color Grading" edited={edited} onReset={() => resetGroup("grading")}>
      <ColorGradingPanel
        grading={grading}
        setGrade={setGrade}
        setGradingParam={setGradingParam}
        commit={commit}
      />
    </Collapsible>
  )
}

/* ── Vignette ── */
function VignetteSection() {
  const vignette = useEditorStore((s) => s.vignette)
  const setVignette = useEditorStore((s) => s.setVignette)
  const commit = useEditorStore((s) => s.commit)
  const resetGroup = useEditorStore((s) => s.resetGroup)
  const edited = (Object.keys(DEFAULT_VIGNETTE) as (keyof Vignette)[]).some(
    (k) => vignette[k] !== DEFAULT_VIGNETTE[k]
  )
  return (
    <Collapsible title="Vignette" edited={edited} onReset={() => resetGroup("vignette")}>
      {VIGNETTE_SLIDERS.map((m) => (
        <AdjustmentSlider
          key={m.key}
          label={m.label}
          value={vignette[m.key]}
          min={m.min}
          max={m.max}
          center={m.center}
          onChange={(v) => setVignette({ [m.key]: v })}
          onCommit={commit}
        />
      ))}
    </Collapsible>
  )
}

/* ── Grain ── */
function GrainSection() {
  const grain = useEditorStore((s) => s.grain)
  const setGrain = useEditorStore((s) => s.setGrain)
  const commit = useEditorStore((s) => s.commit)
  const resetGroup = useEditorStore((s) => s.resetGroup)
  const edited = (Object.keys(DEFAULT_GRAIN) as (keyof Grain)[]).some(
    (k) => grain[k] !== DEFAULT_GRAIN[k]
  )
  return (
    <Collapsible title="Grain" edited={edited} onReset={() => resetGroup("grain")}>
      {GRAIN_SLIDERS.map((m) => (
        <AdjustmentSlider
          key={m.key}
          label={m.label}
          value={grain[m.key]}
          min={m.min}
          max={m.max}
          center={m.center}
          onChange={(v) => setGrain({ [m.key]: v })}
          onCommit={commit}
        />
      ))}
    </Collapsible>
  )
}

/* ── Noise Reduction ── */
function NoiseSection() {
  const noise = useEditorStore((s) => s.noise)
  const setNoise = useEditorStore((s) => s.setNoise)
  const commit = useEditorStore((s) => s.commit)
  const resetGroup = useEditorStore((s) => s.resetGroup)
  const edited = (Object.keys(DEFAULT_NOISE) as (keyof NoiseReduction)[]).some(
    (k) => noise[k] !== DEFAULT_NOISE[k]
  )
  return (
    <Collapsible title="Noise Reduction" edited={edited} onReset={() => resetGroup("noise")}>
      {NOISE_SLIDERS.map((m) => (
        <AdjustmentSlider
          key={m.key}
          label={m.label}
          value={noise[m.key]}
          min={m.min}
          max={m.max}
          center={m.center}
          onChange={(v) => setNoise({ [m.key]: v })}
          onCommit={commit}
        />
      ))}
    </Collapsible>
  )
}

/* ── Healing / Spot Removal (Phase 3B) ── */
function HealSection() {
  const spots = useEditorStore((s) => s.spots)
  const healMode = useEditorStore((s) => s.healMode)
  const healRadius = useEditorStore((s) => s.healRadius)
  const healFeather = useEditorStore((s) => s.healFeather)
  const healClone = useEditorStore((s) => s.healClone)
  const setHeal = useEditorStore((s) => s.setHeal)
  const clearSpots = useEditorStore((s) => s.clearSpots)

  return (
    <Collapsible title="Healing" edited={spots.length > 0} onReset={clearSpots}>
      <button
        type="button"
        onClick={() => setHeal({ healMode: !healMode })}
        className={cn(
          "rounded-lg border py-2 text-[0.8125rem] font-medium transition-colors",
          healMode
            ? "border-gold/50 bg-gold/10 text-gold"
            : "border-border text-muted hover:border-gold/40 hover:text-foreground"
        )}
      >
        {healMode ? "Done retouching" : "Remove spots"}
      </button>

      {healMode && (
        <p className="text-[0.75rem] leading-relaxed text-muted/85">
          Click a blemish to remove it. Drag the white ring to move the fix, the dashed ring to
          change where it samples from.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setHeal({ healClone: false })}
          className={cn(
            "flex-1 rounded-lg border py-2 text-[0.75rem] transition-colors",
            !healClone ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted/85 hover:text-foreground"
          )}
        >
          Heal
        </button>
        <button
          type="button"
          onClick={() => setHeal({ healClone: true })}
          className={cn(
            "flex-1 rounded-lg border py-2 text-[0.75rem] transition-colors",
            healClone ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted/85 hover:text-foreground"
          )}
        >
          Clone
        </button>
      </div>

      <label className="flex flex-col gap-1 text-[0.75rem] text-muted/92">
        Size
        <input type="range" min={0.01} max={0.25} step={0.005} value={healRadius}
          onChange={(e) => setHeal({ healRadius: Number(e.target.value) })} className="accent-gold" />
      </label>
      <label className="flex flex-col gap-1 text-[0.75rem] text-muted/92">
        Softness
        <input type="range" min={0} max={1} step={0.05} value={healFeather}
          onChange={(e) => setHeal({ healFeather: Number(e.target.value) })} className="accent-gold" />
      </label>

      {spots.length > 0 && (
        <p className="text-[0.6875rem] text-muted/70">{spots.length} spot{spots.length === 1 ? "" : "s"} removed</p>
      )}
    </Collapsible>
  )
}

/* ── Crop & Geometry ── */
const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
  { label: "16:9", value: 16 / 9 },
]

function CropSection({ cropMode, setCropMode, cropAspect, setCropAspect }: RightPanelProps) {
  const geometry = useEditorStore((s) => s.geometry)
  const setGeometry = useEditorStore((s) => s.setGeometry)
  const setCrop = useEditorStore((s) => s.setCrop)
  const commit = useEditorStore((s) => s.commit)

  const applyAspect = (value: number | null) => {
    setCropAspect(value)
    if (value == null) return
    let w = 1
    let h = 1
    if (value >= 1) h = 1 / value
    else w = value
    w *= 0.9
    h *= 0.9
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h })
    commit()
  }

  const rotate = () => {
    setGeometry({ rotate90: (((geometry.rotate90 + 1) % 4) as 0 | 1 | 2 | 3) })
    commit()
  }

  const geoEdited =
    !!geometry.crop || !!geometry.rotate90 || geometry.flipH || geometry.flipV || geometry.straighten !== 0

  return (
    <Collapsible title="Crop & Geometry">
      <button
        type="button"
        onClick={() => setCropMode(!cropMode)}
        className={cn(
          "rounded-lg border py-2 text-[0.8125rem] font-medium transition-colors",
          cropMode
            ? "border-gold/50 bg-gold/10 text-gold"
            : "border-border text-muted hover:border-gold/40 hover:text-foreground"
        )}
      >
        {cropMode ? "Done cropping" : "Crop image"}
      </button>

      <div className="grid grid-cols-3 gap-1.5">
        {ASPECTS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => applyAspect(a.value)}
            className={cn(
              "rounded-md border py-1.5 text-[0.75rem] transition-colors",
              cropAspect === a.value
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border text-muted/92 hover:border-gold/30 hover:text-foreground"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <GeoButton label="Rotate" onClick={rotate} />
        <GeoButton
          label="Flip H"
          active={geometry.flipH}
          onClick={() => {
            setGeometry({ flipH: !geometry.flipH })
            commit()
          }}
        />
        <GeoButton
          label="Flip V"
          active={geometry.flipV}
          onClick={() => {
            setGeometry({ flipV: !geometry.flipV })
            commit()
          }}
        />
      </div>

      <AdjustmentSlider
        label="Straighten"
        value={geometry.straighten}
        min={-45}
        max={45}
        center={0}
        onChange={(v) => setGeometry({ straighten: v })}
        onCommit={commit}
      />

      {geoEdited && (
        <button
          type="button"
          onClick={() => {
            setGeometry({ rotate90: 0, flipH: false, flipV: false, straighten: 0, crop: null })
            setCropAspect(null)
            commit()
          }}
          className="text-[0.6875rem] uppercase tracking-wider text-muted/85 hover:text-gold transition-colors"
        >
          Reset geometry
        </button>
      )}
    </Collapsible>
  )
}

function GeoButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border py-1.5 text-[0.75rem] transition-colors",
        active
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-border text-muted/92 hover:border-gold/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("transition-transform", open ? "rotate-90" : "")}
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

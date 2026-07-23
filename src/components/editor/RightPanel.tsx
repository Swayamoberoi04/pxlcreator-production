"use client"

/**
 * RightPanel — the editing controls, grouped into collapsible sections that map
 * one-to-one to `EDIT_SECTIONS`. Every slider is wired to the Zustand store:
 * dragging calls `setAdjustment` (live, smooth) and release calls `commit` (one
 * undo step). The Crop & Geometry block drives the geometry state and the crop
 * UI mode owned by the shell.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  EDIT_SECTIONS,
  type AdjustmentKey,
  type SectionMeta,
} from "@/lib/editor/adjustments"
import { useEditorStore } from "@/lib/editor/store"
import { AdjustmentSlider } from "./AdjustmentSlider"

interface RightPanelProps {
  cropMode: boolean
  setCropMode: (v: boolean) => void
  cropAspect: number | null
  setCropAspect: (v: number | null) => void
}

export function RightPanel({ cropMode, setCropMode, cropAspect, setCropAspect }: RightPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col divide-y divide-border">
        {EDIT_SECTIONS.map((section) => (
          <Section key={section.id} section={section} />
        ))}
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

/* ── A collapsible adjustment section ── */
function Section({ section }: { section: SectionMeta }) {
  const [open, setOpen] = useState(true)
  const adjustments = useEditorStore((s) => s.adjustments)
  const setAdjustment = useEditorStore((s) => s.setAdjustment)
  const commit = useEditorStore((s) => s.commit)
  const resetSection = useEditorStore((s) => s.resetSection)

  const keys = section.sliders.map((s) => s.key)
  const sectionEdited = keys.some((k) => adjustments[k] !== 0)

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-label tracking-widest text-foreground/90 hover:text-gold transition-colors"
        >
          <Chevron open={open} />
          {section.title}
        </button>
        {sectionEdited && (
          <button
            type="button"
            onClick={() => resetSection(keys)}
            className="text-[0.6875rem] uppercase tracking-wider text-muted/50 hover:text-gold transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3.5 flex flex-col gap-3.5">
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
        </div>
      )}
    </div>
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

function CropSection({
  cropMode,
  setCropMode,
  cropAspect,
  setCropAspect,
}: RightPanelProps) {
  const [open, setOpen] = useState(false)
  const geometry = useEditorStore((s) => s.geometry)
  const setGeometry = useEditorStore((s) => s.setGeometry)
  const setCrop = useEditorStore((s) => s.setCrop)
  const commit = useEditorStore((s) => s.commit)

  const applyAspect = (value: number | null) => {
    setCropAspect(value)
    if (value == null) return
    // Centre a crop of the requested aspect within the frame (normalised).
    // Use a square-ish default; the exporter re-derives exact pixels.
    let w = 1
    let h = 1
    if (value >= 1) {
      h = 1 / value
    } else {
      w = value
    }
    // Scale to 90% and centre.
    w *= 0.9
    h *= 0.9
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h })
    commit()
  }

  const rotate = () => {
    setGeometry({ rotate90: (((geometry.rotate90 + 1) % 4) as 0 | 1 | 2 | 3) })
    commit()
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-label tracking-widest text-foreground/90 hover:text-gold transition-colors"
        >
          <Chevron open={open} />
          Crop &amp; Geometry
        </button>
      </div>

      {open && (
        <div className="mt-3.5 flex flex-col gap-4">
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

          {/* Aspect ratios */}
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
                    : "border-border text-muted/70 hover:border-gold/30 hover:text-foreground"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Rotate / flip */}
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

          {/* Straighten */}
          <AdjustmentSlider
            label="Straighten"
            value={geometry.straighten}
            min={-45}
            max={45}
            center={0}
            onChange={(v) => setGeometry({ straighten: v })}
            onCommit={commit}
          />

          {(geometry.crop || geometry.rotate90 || geometry.flipH || geometry.flipV || geometry.straighten) && (
            <button
              type="button"
              onClick={() => {
                setGeometry({ rotate90: 0, flipH: false, flipV: false, straighten: 0, crop: null })
                setCropAspect(null)
                commit()
              }}
              className="text-[0.6875rem] uppercase tracking-wider text-muted/50 hover:text-gold transition-colors"
            >
              Reset geometry
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function GeoButton({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border py-1.5 text-[0.75rem] transition-colors",
        active
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-border text-muted/70 hover:border-gold/30 hover:text-foreground"
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

"use client"

/**
 * LeftSidebar — Navigator / History / Presets / Masks.
 *
 * History and Presets are fully live. Navigator shows the current zoom/frame
 * context. Masks are the future-ready placeholder (Phase 3) — the tab exists so
 * the layout and mental model are already in place, but the tools are disabled.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/lib/editor/store"
import { QUICK_PRESETS } from "@/lib/editor/presets"

type Tab = "history" | "presets" | "masks"

export function LeftSidebar({ zoomPercent }: { zoomPercent: number }) {
  const [tab, setTab] = useState<Tab>("presets")

  return (
    <div className="flex h-full flex-col">
      {/* Navigator strip */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-label tracking-widest text-muted/50">Navigator</p>
        <p className="mt-1 text-[0.8125rem] text-foreground/80">Zoom {zoomPercent}%</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["presets", "history", "masks"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-[0.75rem] uppercase tracking-wider transition-colors",
              tab === t ? "text-gold border-b-2 border-gold" : "text-muted/50 hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "presets" && <PresetsTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "masks" && <MasksTab />}
      </div>
    </div>
  )
}

function PresetsTab() {
  const applyAdjustments = useEditorStore((s) => s.applyAdjustments)
  return (
    <div className="flex flex-col gap-1.5 p-3">
      <p className="mb-1 text-[0.6875rem] uppercase tracking-wider text-muted/40">Quick looks</p>
      {QUICK_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => applyAdjustments(p.adjustments)}
          className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-[0.8125rem] text-foreground/85 transition-colors hover:border-gold/40 hover:bg-surface-2"
        >
          {p.name}
          <span className="text-[0.6875rem] text-muted/40">Apply</span>
        </button>
      ))}
    </div>
  )
}

function HistoryTab() {
  const history = useEditorStore((s) => s.history)
  const index = useEditorStore((s) => s.index)
  const jumpTo = useEditorStore((s) => s.jumpTo)

  return (
    <div className="flex flex-col p-2">
      {history.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => jumpTo(i)}
          className={cn(
            "rounded-md px-3 py-2 text-left text-[0.8125rem] transition-colors",
            i === index ? "bg-gold/10 text-gold" : "text-muted/70 hover:bg-surface-2 hover:text-foreground",
            i > index ? "opacity-40" : ""
          )}
        >
          {i === 0 ? "Original (AI result)" : `Edit ${i}`}
        </button>
      ))}
    </div>
  )
}

function MasksTab() {
  const masks = ["Brush", "Linear Gradient", "Radial Gradient", "AI Subject", "AI Sky"]
  return (
    <div className="flex flex-col gap-1.5 p-3">
      <p className="mb-1 text-[0.6875rem] uppercase tracking-wider text-muted/40">Masking · Phase 3</p>
      {masks.map((m) => (
        <div
          key={m}
          className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5 text-[0.8125rem] text-muted/40"
        >
          {m}
          <span className="text-[0.625rem] uppercase tracking-wider text-muted/30">Soon</span>
        </div>
      ))}
    </div>
  )
}

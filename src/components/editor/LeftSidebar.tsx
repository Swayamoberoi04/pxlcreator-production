"use client"

/**
 * LeftSidebar — Navigator / Presets / History / Sessions / Masks.
 *
 * Presets, History and Sessions are fully live. Navigator shows the current
 * zoom. Masks are the future-ready placeholder (Phase 3) — the tab exists so the
 * layout and mental model are already in place, but the tools are disabled.
 */

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/lib/editor/store"
import { QUICK_PRESETS } from "@/lib/editor/presets"
import { listSessions, deleteSession, type EditorSession } from "@/lib/editor/sessions"

type Tab = "presets" | "history" | "sessions" | "masks"

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
        {(["presets", "history", "sessions", "masks"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-[0.6875rem] uppercase tracking-wide transition-colors",
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
        {tab === "sessions" && <SessionsTab />}
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

function SessionsTab() {
  const [sessions, setSessions] = useState<EditorSession[]>([])
  const loadSnapshot = useEditorStore((s) => s.loadSnapshot)

  const refresh = () => setSessions(listSessions())
  useEffect(() => {
    refresh()
    window.addEventListener("pxl-sessions-changed", refresh)
    return () => window.removeEventListener("pxl-sessions-changed", refresh)
  }, [])

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-[0.8125rem] leading-relaxed text-muted/50">
        No saved sessions yet. Use <span className="text-foreground/80">Save</span> in the top bar to
        store the current edit recipe and resume it later.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 p-3">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:border-gold/40"
        >
          <button
            type="button"
            onClick={() => loadSnapshot(s.snapshot)}
            className="flex-1 text-left"
            title="Load this session onto the current image"
          >
            <p className="truncate text-[0.8125rem] text-foreground/85">{s.name}</p>
            <p className="text-[0.6875rem] text-muted/40">{new Date(s.createdAt).toLocaleDateString()}</p>
          </button>
          <button
            type="button"
            onClick={() => {
              deleteSession(s.id)
              refresh()
            }}
            className="text-muted/40 transition-colors hover:text-red-400"
            aria-label="Delete session"
            title="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
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

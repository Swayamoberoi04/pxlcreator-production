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
import { MASK_TYPES, type MaskType } from "@/lib/editor/adjustments"

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
  const [adding, setAdding] = useState(false)
  const masks = useEditorStore((s) => s.masks)
  const activeMaskId = useEditorStore((s) => s.activeMaskId)
  const addMask = useEditorStore((s) => s.addMask)
  const selectMask = useEditorStore((s) => s.selectMask)
  const updateMask = useEditorStore((s) => s.updateMask)
  const commit = useEditorStore((s) => s.commit)

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Add mask */}
      <button
        type="button"
        onClick={() => setAdding((a) => !a)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gold/40 bg-gold/5 py-2 text-[0.8125rem] font-medium text-gold transition-colors hover:bg-gold/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add mask
      </button>

      {adding && (
        <div className="flex flex-col gap-1 rounded-lg border border-border p-1.5">
          {MASK_TYPES.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => {
                addMask(m.type as MaskType)
                setAdding(false)
              }}
              className="flex items-center justify-between rounded-md px-2.5 py-2 text-left text-[0.8125rem] text-foreground/80 transition-colors hover:bg-surface-2"
            >
              <span>{m.label}</span>
              {m.beta && <span className="text-[0.625rem] uppercase tracking-wider text-gold/70">Beta</span>}
            </button>
          ))}
        </div>
      )}

      {masks.length === 0 && !adding && (
        <p className="px-1 py-2 text-[0.8125rem] leading-relaxed text-muted/50">
          No masks yet. Add one to apply adjustments to just part of the image.
        </p>
      )}

      {/* Mask list */}
      {masks.map((m) => (
        <div
          key={m.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
            activeMaskId === m.id ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30"
          )}
        >
          <button
            type="button"
            onClick={() => {
              updateMask(m.id, { enabled: !m.enabled })
              commit()
            }}
            className={cn("shrink-0 transition-colors", m.enabled ? "text-gold" : "text-muted/30")}
            title={m.enabled ? "Disable" : "Enable"}
            aria-label="Toggle mask visibility"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <button
            type="button"
            onClick={() => selectMask(activeMaskId === m.id ? null : m.id)}
            className="flex-1 truncate text-left text-[0.8125rem] text-foreground/85"
          >
            {m.name}
          </button>
        </div>
      ))}
    </div>
  )
}

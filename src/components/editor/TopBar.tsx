"use client"

/**
 * TopBar — global actions: Undo / Redo / Reset · Before-After · Zoom · Export.
 * Reads history + view state straight from the store; zoom is driven through
 * the EditorCanvas imperative handle passed down from the shell.
 */

import type { RefObject } from "react"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/lib/editor/store"
import { WhatsNewButton } from "./WhatsNewPanel"
import type { EditorCanvasHandle } from "./EditorCanvas"

interface TopBarProps {
  canvasRef: RefObject<EditorCanvasHandle | null>
  zoomPercent: number
  assistantOpen: boolean
  onAssistantClick: () => void
  onExportClick: () => void
  onSaveClick: () => void
  onClose: () => void
}

export function TopBar({ canvasRef, zoomPercent, assistantOpen, onAssistantClick, onExportClick, onSaveClick, onClose }: TopBarProps) {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const index = useEditorStore((s) => s.index)
  const historyLen = useEditorStore((s) => s.history.length)
  const resetAll = useEditorStore((s) => s.resetAll)
  const showBefore = useEditorStore((s) => s.showBefore)
  const setShowBefore = useEditorStore((s) => s.setShowBefore)
  const compareMode = useEditorStore((s) => s.compareMode)
  const setCompare = useEditorStore((s) => s.setCompare)

  const canUndo = index > 0
  const canRedo = index < historyLen - 1

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3">
      {/* Left — brand + close */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] text-muted transition-colors hover:text-foreground"
          title="Back to result"
        >
          <BackIcon />
          <span className="hidden sm:inline">Back</span>
        </button>
        <span className="hidden font-display text-[0.9375rem] tracking-wider text-foreground/90 md:inline">
          PXL EDITOR
        </span>
        <button
          type="button"
          onClick={onAssistantClick}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
            assistantOpen
              ? "border-gold/50 bg-gold/15 text-gold"
              : "border-gold/30 bg-gold/5 text-gold/90 hover:bg-gold/10"
          )}
          title="AI Assistant"
        >
          <SparkIcon />
          <span className="hidden sm:inline">Assistant</span>
        </button>
        <WhatsNewButton />
      </div>

      {/* Centre — history + before/after */}
      <div className="flex items-center gap-1">
        <IconBtn label="Undo" onClick={undo} disabled={!canUndo}>
          <UndoIcon />
        </IconBtn>
        <IconBtn label="Redo" onClick={redo} disabled={!canRedo}>
          <RedoIcon />
        </IconBtn>
        <IconBtn label="Reset all" onClick={resetAll} disabled={index === 0}>
          <ResetIcon />
        </IconBtn>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => setShowBefore(!showBefore)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium transition-colors",
            showBefore ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground"
          )}
          title="Hold to view the original (before / after)"
        >
          {showBefore ? "Before" : "After"}
        </button>
        <button
          type="button"
          onClick={() => setCompare({ compareMode: !compareMode })}
          className={cn(
            "rounded-lg p-2 transition-colors",
            compareMode ? "bg-gold/15 text-gold" : "text-muted hover:bg-surface-2 hover:text-foreground"
          )}
          title="Split before / after compare"
          aria-label="Split compare"
        >
          <CompareIcon />
        </button>
      </div>

      {/* Right — zoom + export */}
      <div className="flex items-center gap-1">
        <IconBtn label="Zoom out" onClick={() => canvasRef.current?.zoomOut()}>
          <MinusIcon />
        </IconBtn>
        <button
          type="button"
          onClick={() => canvasRef.current?.fit()}
          className="min-w-[3rem] rounded-lg px-1.5 py-1.5 text-[0.75rem] tabular-nums text-muted transition-colors hover:text-foreground"
          title="Fit to screen"
        >
          {zoomPercent}%
        </button>
        <IconBtn label="Zoom in" onClick={() => canvasRef.current?.zoomIn()}>
          <PlusIcon />
        </IconBtn>
        <button
          type="button"
          onClick={() => canvasRef.current?.actual(1)}
          className="hidden rounded-lg px-2 py-1.5 text-[0.75rem] text-muted transition-colors hover:text-foreground lg:inline"
          title="Actual pixels"
        >
          100%
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={onSaveClick}
          className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[0.8125rem] font-medium text-muted transition-colors hover:border-gold/40 hover:text-foreground sm:flex"
          title="Save editing session"
        >
          <SaveIcon />
          Save
        </button>
        <button
          type="button"
          onClick={onExportClick}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-1.5 text-[0.8125rem] font-semibold text-black transition-colors hover:bg-gold-bright"
        >
          <ExportIcon />
          Export
        </button>
      </div>
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/* ── Icons (16px, stroke) ── */
const s = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }
function BackIcon() { return <svg {...s}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg> }
function UndoIcon() { return <svg {...s}><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg> }
function RedoIcon() { return <svg {...s}><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg> }
function ResetIcon() { return <svg {...s}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg> }
function PlusIcon() { return <svg {...s}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> }
function MinusIcon() { return <svg {...s}><line x1="5" y1="12" x2="19" y2="12" /></svg> }
function ExportIcon() { return <svg {...s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> }
function SaveIcon() { return <svg {...s}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> }
function SparkIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.9 4.8L18.8 9.6l-4.9 1.8L12 16.2l-1.9-4.8L5.2 9.6l4.9-1.8z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></svg> }
function CompareIcon() { return <svg {...s}><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="12" y1="4" x2="12" y2="20" /><path d="M8 9l-2 3 2 3" /><path d="M16 9l2 3-2 3" /></svg> }

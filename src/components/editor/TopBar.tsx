"use client"

/**
 * TopBar — global actions: Undo / Redo / Reset · Before-After · Zoom · Export.
 * Reads history + view state straight from the store; zoom is driven through
 * the EditorCanvas imperative handle passed down from the shell.
 */

import type { RefObject } from "react"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/lib/editor/store"
import type { EditorCanvasHandle } from "./EditorCanvas"

interface TopBarProps {
  canvasRef: RefObject<EditorCanvasHandle | null>
  zoomPercent: number
  onExportClick: () => void
  onClose: () => void
}

export function TopBar({ canvasRef, zoomPercent, onExportClick, onClose }: TopBarProps) {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const index = useEditorStore((s) => s.index)
  const historyLen = useEditorStore((s) => s.history.length)
  const resetAll = useEditorStore((s) => s.resetAll)
  const showBefore = useEditorStore((s) => s.showBefore)
  const setShowBefore = useEditorStore((s) => s.setShowBefore)

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
          title="Toggle before / after"
        >
          {showBefore ? "Before" : "After"}
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

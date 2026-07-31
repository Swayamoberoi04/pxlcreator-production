"use client"

/**
 * PhotoEditor — the full editing workspace shell.
 *
 * Layout (Lightroom-inspired):
 *   ┌──────────────── TopBar ────────────────┐
 *   │ Left │        Canvas        │  Right    │
 *   │ side │   (zoom/pan/crop)    │  controls │
 *   └─────────────────────────────────────────┘
 *
 * It is portalled to <body> so the site header's `backdrop-filter` can't trap
 * it (a known stacking-context pitfall in this codebase), fills the viewport,
 * wires keyboard shortcuts, and orchestrates the export flow. All heavy work
 * (WebGL, compositing) lives in child components; this file is composition.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useEditorStore, snapshotOf } from "@/lib/editor/store"
import { downloadBlob, type ExportOptions } from "@/lib/editor/export"
import { saveSession } from "@/lib/editor/sessions"
import { TopBar } from "./TopBar"
import { LeftSidebar } from "./LeftSidebar"
import { RightPanel } from "./RightPanel"
import { EditorCanvas, type EditorCanvasHandle } from "./EditorCanvas"
import { ExportDialog } from "./ExportDialog"
import { AIAssistant } from "./AIAssistant"

interface PhotoEditorProps {
  imageUrl: string
  onClose: () => void
}

export function PhotoEditor({ imageUrl, onClose }: PhotoEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [cropMode, setCropMode] = useState(false)
  const [cropAspect, setCropAspect] = useState<number | null>(null)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [savedMsg, setSavedMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canvasRef = useRef<EditorCanvasHandle | null>(null)
  const init = useEditorStore((s) => s.init)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  // Fresh state every time the editor opens.
  useEffect(() => {
    init()
    setMounted(true)
  }, [init])

  // Lock body scroll while the editor owns the screen.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if (e.key === "Escape") {
        if (exportOpen) setExportOpen(false)
        else if (cropMode) setCropMode(false)
        else onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, cropMode, exportOpen, onClose])

  const handleExport = useCallback(
    async (options: ExportOptions) => {
      if (!canvasRef.current) return
      setExporting(true)
      try {
        const blob = await canvasRef.current.exportImage(options)
        downloadBlob(blob, `pxl-edit-${Date.now()}.${options.format === "jpeg" ? "jpg" : options.format}`)
        setExportOpen(false)
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Export failed.")
      } finally {
        setExporting(false)
      }
    },
    []
  )

  const handleSave = useCallback(() => {
    const state = useEditorStore.getState()
    saveSession(saveName, snapshotOf(state))
    window.dispatchEvent(new Event("pxl-sessions-changed"))
    setSaveOpen(false)
    setSaveName("")
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }, [saveName])

  if (!mounted) return null

  const src = canvasRef.current?.sourceSize() ?? { w: 0, h: 0 }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-background text-foreground">
      <TopBar
        canvasRef={canvasRef}
        zoomPercent={zoomPercent}
        assistantOpen={aiOpen}
        onAssistantClick={() => setAiOpen((o) => !o)}
        onExportClick={() => setExportOpen(true)}
        onSaveClick={() => setSaveOpen(true)}
        onClose={onClose}
      />

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — desktop only */}
        <aside className="hidden w-56 shrink-0 border-r border-border bg-surface lg:block">
          <LeftSidebar zoomPercent={zoomPercent} />
        </aside>

        {/* Centre canvas */}
        <main className="relative min-w-0 flex-1 bg-[#0d0d0d]">
          <EditorCanvas
            ref={canvasRef}
            imageUrl={imageUrl}
            cropMode={cropMode}
            cropAspect={cropAspect}
            onZoomPercent={setZoomPercent}
            onError={setErrorMsg}
          />
          {cropMode && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <span className="rounded-full bg-black/70 px-3 py-1 text-[0.75rem] text-white/92">
                Drag to crop · press Esc or “Done cropping” to finish
              </span>
            </div>
          )}
          <ExportDialog
            open={exportOpen}
            sourceW={src.w}
            sourceH={src.h}
            exporting={exporting}
            onCancel={() => setExportOpen(false)}
            onExport={handleExport}
          />
          {aiOpen && <AIAssistant onClose={() => setAiOpen(false)} />}
        </main>

        {/* Right controls — desktop */}
        <aside className="hidden w-72 shrink-0 border-l border-border bg-surface lg:block">
          <RightPanel
            cropMode={cropMode}
            setCropMode={setCropMode}
            cropAspect={cropAspect}
            setCropAspect={setCropAspect}
          />
        </aside>
      </div>

      {/* Right controls — mobile bottom sheet */}
      <div className="max-h-[42vh] shrink-0 overflow-y-auto border-t border-border bg-surface lg:hidden">
        <RightPanel
          cropMode={cropMode}
          setCropMode={setCropMode}
          cropAspect={cropAspect}
          setCropAspect={setCropAspect}
        />
      </div>

      {/* Save-session dialog */}
      {saveOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="font-display text-[1.125rem] font-bold text-foreground">Save session</h3>
            <p className="mt-1 text-[0.8125rem] text-muted/85">
              Stores this edit recipe so you can resume it later.
            </p>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
              placeholder="Session name"
              className="admin-input mt-4"
            />
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-[0.875rem] font-medium text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-xl bg-gold py-2.5 text-[0.875rem] font-semibold text-black transition-colors hover:bg-gold-bright"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {savedMsg && (
        <div className="absolute inset-x-0 top-16 z-40 flex justify-center px-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[0.8125rem] text-emerald-300">
            Session saved — find it under Sessions in the left panel.
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="absolute inset-x-0 top-16 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[0.8125rem] text-red-300">
            {errorMsg}
            <button type="button" onClick={() => setErrorMsg(null)} className="text-red-300/70 hover:text-red-200">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

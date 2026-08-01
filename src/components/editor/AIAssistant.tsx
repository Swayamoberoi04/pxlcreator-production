"use client"

/**
 * AIAssistant — the flagship AI editing panel.
 *
 * A premium glassmorphism drawer that turns the editor into "editing alongside a
 * pro". Everything is powered by the in-browser CV analysis in lib/editor/ai:
 *   • Analyze  — scene, histogram, warnings, image-specific recommendations
 *   • Looks    — 14 one-click grades
 *   • Prompt   — natural-language → real slider moves
 *   • Match    — analyse a reference image and match its look
 *   • Recipes  — save / reuse / export / share the whole adjustment stack
 *
 * Every AI action is expressed as concrete, explained slider moves (Learning
 * Mode) and applied through the store's single `applyAiPatch`, so it is
 * transparent, editable and undoable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useEditorStore, snapshotOf, type Snapshot } from "@/lib/editor/store"
import type { AiEdit } from "@/lib/editor/ai/patch"
import { recommend, LOOKS, resolveLook, generateRecipeName } from "@/lib/editor/ai/suggest"
import { parsePrompt } from "@/lib/editor/ai/prompt"
import { analyzeReference, matchStyle } from "@/lib/editor/ai/stylematch"
import {
  listRecipes,
  saveRecipe,
  deleteRecipe,
  exportRecipeFile,
  encodeShareCode,
  decodeShareCode,
  type EditRecipe,
} from "@/lib/editor/ai/recipes"

type Tab = "analyze" | "looks" | "prompt" | "match" | "recipes"

export function AIAssistant({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("analyze")
  const [lastApplied, setLastApplied] = useState<AiEdit | null>(null)
  const applyAiPatch = useEditorStore((s) => s.applyAiPatch)

  const apply = useCallback(
    (e: AiEdit) => {
      applyAiPatch(e.patch, e.additive)
      setLastApplied(e)
    },
    [applyAiPatch]
  )

  const TABS: { id: Tab; label: string }[] = [
    { id: "analyze", label: "Analyze" },
    { id: "looks", label: "Looks" },
    { id: "prompt", label: "Prompt" },
    { id: "match", label: "Match" },
    { id: "recipes", label: "Recipes" },
  ]

  return (
    <div className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[360px] flex-col border-r border-gold/15 bg-surface/95 shadow-[8px_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <SparkIcon />
          <span className="font-display text-[0.9375rem] tracking-wider text-foreground">AI ASSISTANT</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted transition-colors hover:text-foreground" aria-label="Close assistant">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2.5 text-[0.6875rem] uppercase tracking-wide transition-colors",
              tab === t.id ? "text-gold border-b-2 border-gold" : "text-muted/85 hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "analyze" && <AnalyzeTab apply={apply} />}
        {tab === "looks" && <LooksTab apply={apply} />}
        {tab === "prompt" && <PromptTab apply={apply} />}
        {tab === "match" && <MatchTab apply={apply} />}
        {tab === "recipes" && <RecipesTab />}
      </div>

      {/* Learning-mode footer: what just changed + why */}
      {lastApplied && (
        <div className="border-t border-gold/15 bg-gold/5 px-4 py-3">
          <p className="text-[0.6875rem] uppercase tracking-wider text-gold/70">Applied · {lastApplied.title}</p>
          <p className="mt-1 text-[0.75rem] leading-snug text-foreground/92">{lastApplied.why}</p>
          {lastApplied.changes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {lastApplied.changes.map((c, i) => (
                <span key={i} className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.625rem] text-muted/92">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Analyze ── */
function AnalyzeTab({ apply }: { apply: (e: AiEdit) => void }) {
  const analysis = useEditorStore((s) => s.analysis)
  const recommendations = useMemo(() => (analysis ? recommend(analysis) : []), [analysis])

  if (!analysis) {
    return <div className="p-4 text-[0.8125rem] text-muted/85">Analyzing image…</div>
  }
  const s = analysis.stats

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Scene + summary */}
      <div className="rounded-xl border border-border bg-surface-2/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[0.9375rem] font-semibold text-foreground">{analysis.sceneLabel}</span>
          <span className="text-[0.6875rem] text-muted/85">{Math.round(analysis.sceneConfidence * 100)}% match</span>
        </div>
        <p className="mt-1 text-[0.75rem] leading-snug text-muted/92">{analysis.summary}</p>
        <Histogram hist={s.histLuma} />
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.6875rem] text-muted/85">
          <Stat label="Exposure" value={`${Math.round(s.meanLuma * 100)}%`} />
          <Stat label="White balance" value={s.temperatureCast > 0.1 ? "Warm" : s.temperatureCast < -0.1 ? "Cool" : "Neutral"} />
          <Stat label="Dynamic range" value={s.dynamicRange > 0.7 ? "High" : s.dynamicRange < 0.45 ? "Low" : "Medium"} />
          <Stat label="Sharpness" value={s.sharpness > 0.5 ? "Sharp" : s.sharpness > 0.25 ? "Medium" : "Soft"} />
          <Stat label="Noise" value={s.noise > 0.5 ? "High" : s.noise > 0.25 ? "Some" : "Clean"} />
          <Stat label="Sky / Faces" value={`${Math.round(s.skyRatio * 100)}% / ${s.skinRatio > 0.05 ? "yes" : "no"}`} />
        </div>
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {analysis.warnings.map((w) => (
            <div key={w.id} className={cn("flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[0.75rem] leading-snug", w.level === "warn" ? "border-amber-500/30 bg-amber-500/5 text-amber-300/90" : "border-border bg-surface-2/40 text-muted/92")}>
              <span className="mt-0.5 shrink-0">{w.level === "warn" ? "⚠" : "ℹ"}</span>
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-label tracking-widest text-foreground/90">Recommendations</p>
          {recommendations.length > 1 && (
            <button type="button" onClick={() => recommendations.forEach(apply)} className="text-[0.6875rem] uppercase tracking-wider text-gold/70 hover:text-gold">
              Apply all
            </button>
          )}
        </div>
        {recommendations.length === 0 && <p className="text-[0.75rem] text-muted/85">This image already looks well-balanced.</p>}
        {recommendations.map((r) => (
          <EditCard key={r.id} edit={r} onApply={() => apply(r)} />
        ))}
      </div>
    </div>
  )
}

function EditCard({ edit, onApply }: { edit: AiEdit; onApply: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.8125rem] font-medium text-foreground">{edit.title}</p>
        <button type="button" onClick={onApply} className="shrink-0 rounded-lg bg-gold px-2.5 py-1 text-[0.6875rem] font-semibold text-black transition-colors hover:bg-gold-bright">
          Apply
        </button>
      </div>
      <p className="mt-1 text-[0.75rem] leading-snug text-muted/92">{edit.why}</p>
      {edit.changes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {edit.changes.map((c, i) => (
            <span key={i} className="rounded bg-surface-3/60 px-1.5 py-0.5 text-[0.625rem] text-muted/92">{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Looks ── */
function LooksTab({ apply }: { apply: (e: AiEdit) => void }) {
  const analysis = useEditorStore((s) => s.analysis)
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {LOOKS.map((look) => (
        <button
          key={look.id}
          type="button"
          onClick={() => apply(resolveLook(look, analysis))}
          className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface-2/40 p-3 text-left transition-colors hover:border-gold/40 hover:bg-surface-2"
        >
          <span className="text-lg">{look.emoji}</span>
          <span className="text-[0.8125rem] font-medium text-foreground">{look.name}</span>
        </button>
      ))}
    </div>
  )
}

/* ── Prompt ── */
function PromptTab({ apply }: { apply: (e: AiEdit) => void }) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const examples = ["Make this more cinematic", "Warm sunset look", "Make it look like Kodak Gold", "Add dramatic shadows", "Reduce the orange tones", "Make the sky pop"]

  const run = () => {
    const edit = parsePrompt(text)
    if (!edit) {
      setError("Couldn't map that to an edit yet — try words like cinematic, warm, moody, vibrant, sharp, faded…")
      return
    }
    setError(null)
    apply(edit)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-[0.75rem] leading-snug text-muted/85">Describe the look you want in plain English.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run()
        }}
        placeholder="e.g. give this a warm, cinematic sunset look"
        rows={3}
        className="admin-input resize-none"
      />
      <button type="button" onClick={run} disabled={!text.trim()} className="rounded-xl bg-gold py-2.5 text-[0.875rem] font-semibold text-black transition-colors hover:bg-gold-bright disabled:opacity-50">
        Apply prompt
      </button>
      {error && <p className="text-[0.75rem] text-amber-300/80">{error}</p>}
      <div className="flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-border px-2.5 py-1 text-[0.6875rem] text-muted/92 transition-colors hover:border-gold/40 hover:text-foreground">
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Match ── */
function MatchTab({ apply }: { apply: (e: AiEdit) => void }) {
  const analysis = useEditorStore((s) => s.analysis)
  const [refUrl, setRefUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !analysis) return
    const url = URL.createObjectURL(file)
    setRefUrl(url)
    const img = new Image()
    img.onload = () => {
      try {
        const refStats = analyzeReference(img)
        const edit = matchStyle(refStats, analysis.stats)
        apply(edit)
        setStatus(edit.why)
      } catch {
        setStatus("Couldn't analyse that reference image.")
      }
    }
    img.onerror = () => setStatus("Couldn't load that image.")
    img.src = url
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-[0.75rem] leading-snug text-muted/85">Upload a reference photo — the assistant matches its white balance, exposure, contrast and colour.</p>
      <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-dashed border-gold/40 bg-gold/5 py-6 text-[0.8125rem] font-medium text-gold transition-colors hover:bg-gold/10">
        {refUrl ? "Choose a different reference" : "Upload reference image"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      {refUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={refUrl} alt="reference" className="max-h-40 w-full rounded-lg border border-border object-contain" />
      )}
      {status && <p className="text-[0.75rem] leading-snug text-foreground/92">{status}</p>}
    </div>
  )
}

/* ── Recipes ── */
function RecipesTab() {
  const [recipes, setRecipes] = useState<EditRecipe[]>([])
  const [name, setName] = useState("")
  const [importCode, setImportCode] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const loadSnapshot = useEditorStore((s) => s.loadSnapshot)

  const refresh = useCallback(() => setRecipes(listRecipes()), [])
  useEffect(() => refresh(), [refresh])

  const save = () => {
    const finalName = name.trim() || generateRecipeName()
    saveRecipe(finalName, snapshotOf(useEditorStore.getState()))
    setName("")
    setMsg(`Saved “${finalName}”`)
    refresh()
    setTimeout(() => setMsg(null), 2500)
  }

  const doImport = () => {
    const decoded = decodeShareCode(importCode)
    if (!decoded) {
      setMsg("That share code isn't valid.")
      return
    }
    saveRecipe(decoded.name, decoded.snapshot as Snapshot)
    loadSnapshot(decoded.snapshot as Snapshot)
    setImportCode("")
    setMsg(`Imported “${decoded.name}”`)
    refresh()
  }

  const share = (r: EditRecipe) => {
    const code = encodeShareCode(r.name, r.snapshot)
    navigator.clipboard?.writeText(code)
    setMsg("Share code copied to clipboard")
    setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Save current */}
      <div className="rounded-xl border border-border bg-surface-2/40 p-3">
        <p className="text-label tracking-widest text-foreground/90">Save this edit</p>
        <div className="mt-2 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name (or auto)" className="admin-input flex-1" />
          <button type="button" onClick={() => setName(generateRecipeName())} title="Generate a name" className="shrink-0 rounded-lg border border-border px-2.5 text-[0.75rem] text-muted transition-colors hover:text-gold">✨</button>
        </div>
        <button type="button" onClick={save} className="mt-2 w-full rounded-lg bg-gold py-2 text-[0.8125rem] font-semibold text-black transition-colors hover:bg-gold-bright">
          Save recipe
        </button>
      </div>

      {msg && <p className="text-center text-[0.75rem] text-gold/80">{msg}</p>}

      {/* Import */}
      <div className="flex gap-2">
        <input value={importCode} onChange={(e) => setImportCode(e.target.value)} placeholder="Paste share code…" className="admin-input flex-1" />
        <button type="button" onClick={doImport} disabled={!importCode.trim()} className="shrink-0 rounded-lg border border-border px-3 text-[0.75rem] text-muted transition-colors hover:text-gold disabled:opacity-40">Import</button>
      </div>

      {/* List */}
      {recipes.length === 0 ? (
        <p className="py-2 text-[0.8125rem] text-muted/85">No saved recipes yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {recipes.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => loadSnapshot(r.snapshot as Snapshot)} className="flex-1 truncate text-left text-[0.8125rem] text-foreground/92" title="Apply this recipe">
                  {r.name}
                </button>
                <div className="flex shrink-0 items-center gap-1.5 text-muted/85">
                  <button type="button" onClick={() => share(r)} title="Copy share code" className="hover:text-gold">🔗</button>
                  <button type="button" onClick={() => exportRecipeFile(r)} title="Download JSON" className="hover:text-gold">⬇</button>
                  <button type="button" onClick={() => { deleteRecipe(r.id); refresh() }} title="Delete" className="hover:text-red-400">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[0.6875rem] leading-snug text-muted/70">Recipes are the shareable, portable form of an edit. Publishing to a public community feed is coming next.</p>
    </div>
  )
}

/* ── Bits ── */
function Histogram({ hist }: { hist: number[] }) {
  const W = 300
  const H = 44
  const bw = W / hist.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-11 w-full rounded bg-[#0d0d0d]" preserveAspectRatio="none">
      {hist.map((v, i) => (
        <rect key={i} x={i * bw} y={H - v * H} width={bw + 0.5} height={v * H} fill="rgba(255,214,10,0.55)" />
      ))}
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted/85">{label}</span>
      <span className="text-foreground/92">{value}</span>
    </div>
  )
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 4.8L18.8 9.6l-4.9 1.8L12 16.2l-1.9-4.8L5.2 9.6l4.9-1.8z" />
      <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  )
}

"use client"

import { cn } from "@/lib/utils"
import { AestheticChips } from "./AestheticChips"
import type { AestheticChip } from "@/types/studio"

interface PromptInputProps {
  prompt:              string
  selectedAesthetics:  string[]
  hasFile:             boolean
  isSubmitting:        boolean
  onPromptChange:      (v: string) => void
  onToggleAesthetic:   (id: string) => void
  onSubmit:            () => void
  /** Overrides the default chip set — admin-managed via /admin/ai-studio. */
  chips?:              AestheticChip[]
}

const MAX_CHARS = 500
const PLACEHOLDER =
  "e.g. warm cinematic golden hour with lifted shadows and a subtle film grain…"

export function PromptInput({
  prompt,
  selectedAesthetics,
  hasFile,
  isSubmitting,
  onPromptChange,
  onToggleAesthetic,
  onSubmit,
  chips,
}: PromptInputProps) {
  const remaining  = MAX_CHARS - prompt.length
  const canSubmit  = hasFile && prompt.trim().length > 0 && !isSubmitting

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Prompt textarea ── */}
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="studio-prompt"
            className="text-label text-muted/85 tracking-widest"
          >
            Describe the look
          </label>
          <span className={cn(
            "text-[0.75rem] tabular-nums transition-colors",
            remaining < 50 ? "text-amber-400" : "text-muted/70"
          )}>
            {remaining}
          </span>
        </div>

        <textarea
          id="studio-prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value.slice(0, MAX_CHARS))}
          placeholder={PLACEHOLDER}
          rows={5}
          suppressHydrationWarning
          className={cn(
            "w-full flex-1 min-h-[140px] resize-none rounded-xl border bg-background px-4 py-3",
            "text-[0.9375rem] text-foreground placeholder:text-muted/70 leading-relaxed",
            "focus:outline-none transition-colors duration-150",
            prompt.length > 0
              ? "border-gold/30 focus:border-gold/50"
              : "border-border focus:border-border/80"
          )}
        />

        {/* Prompt examples */}
        {prompt.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onPromptChange(ex)}
                className="text-[0.75rem] text-muted/85 hover:text-gold transition-colors rounded px-1.5 py-0.5 border border-transparent hover:border-gold/20 hover:bg-gold/5"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Aesthetic chips ── */}
      <AestheticChips
        selected={selectedAesthetics}
        onToggle={onToggleAesthetic}
        chips={chips}
      />

      {/* ── Submit button ── */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        className={cn(
          "relative w-full rounded-xl py-4 text-[0.9375rem] font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          canSubmit
            ? "bg-gold text-background hover:bg-gold-dim active:scale-[0.98] shadow-[0_0_32px_rgba(255,214,10,0.18)] hover:shadow-[0_0_48px_rgba(255,214,10,0.28)]"
            : "bg-surface-2 text-muted/70 cursor-not-allowed"
        )}
      >
        {/* Shimmer on the enabled button */}
        {canSubmit && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-xl overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" />
          </span>
        )}

        <span className="relative flex items-center justify-center gap-2.5">
          {!hasFile ? (
            <>
              <LockIcon />
              Upload a photo first
            </>
          ) : prompt.trim().length === 0 ? (
            <>
              <LockIcon />
              Describe the look to continue
            </>
          ) : (
            <>
              <SparkIcon />
              Analyse &amp; Edit with AI
            </>
          )}
        </span>
      </button>

      {/* Trust note */}
      <p className="text-center text-[0.75rem] text-muted/70 -mt-2">
        Vision AI · ~8 seconds · Your photo is never stored
      </p>

    </div>
  )
}

const EXAMPLE_PROMPTS = [
  "warm cinematic golden hour",
  "cool dark noir city night",
  "vintage film with soft grain",
  "moody forest with lifted shadows",
]

/* ── Icons ── */
function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}


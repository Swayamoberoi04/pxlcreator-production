"use client"

import { BeforeAfterSlider } from "./BeforeAfterSlider"
import { PresetRecommendCard } from "./PresetRecommendCard"
import { DownloadButton } from "./DownloadButton"
import type { StudioSuccessResponse } from "@/types/studio"

interface ResultPanelProps {
  originalUrl: string               // object URL of the uploaded file
  result:      StudioSuccessResponse
  onReset:     () => void
}

export function ResultPanel({ originalUrl, result, onReset }: ResultPanelProps) {
  const { analysis, processedImage, recommendation, processingMs } = result

  return (
    <div className="flex flex-col gap-8">

      {/* ── Section header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-6 bg-gold opacity-70" aria-hidden="true" />
            <span className="text-label text-gold tracking-widest">Your AI Edit</span>
          </div>
          <h2 className="font-display font-bold text-foreground text-[1.375rem]">
            {analysis.mood}
          </h2>
        </div>

        {/* Processing time badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="text-[0.75rem] text-muted/70">
            Done in {(processingMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

        {/* ── Left — Before/After slider ── */}
        <div className="flex flex-col gap-5">
          <BeforeAfterSlider
            beforeUrl={originalUrl}
            afterUrl={processedImage}
          />

          {/* AI description */}
          <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-2">
            <p className="text-label text-muted/50 tracking-widest">AI analysis</p>
            <p className="text-[0.9375rem] text-foreground/80 leading-relaxed">
              {analysis.description}
            </p>
          </div>

          {/* Adjustments applied — collapsed summary */}
          <AdjustmentPills analysis={result.analysis} />
        </div>

        {/* ── Right — Recommendation + Download ── */}
        <div className="flex flex-col gap-4">
          <PresetRecommendCard recommendation={recommendation} />

          <DownloadButton dataUrl={processedImage} className="w-full" />

          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-[0.875rem] font-medium text-muted transition-colors hover:border-border/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ResetIcon />
            Try another photo
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Compact pills showing what was adjusted ── */
function AdjustmentPills({ analysis }: { analysis: StudioSuccessResponse["analysis"] }) {
  const { adjustments } = analysis

  const items = [
    { label: "Brightness", value: adjustments.brightness, base: 1.0 },
    { label: "Contrast",   value: adjustments.contrast,   base: 1.0 },
    { label: "Saturation", value: adjustments.saturation, base: 1.0 },
    { label: "Gamma",      value: adjustments.gamma,      base: 1.0 },
  ]

  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-muted/50 tracking-widest">Adjustments applied</p>
      <div className="flex flex-wrap gap-2">
        {items.map(({ label, value, base }) => {
          const delta = value - base
          const isUp  = delta > 0.02
          const isDown = delta < -0.02
          if (!isUp && !isDown) return null
          return (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[0.75rem] text-muted"
            >
              <span className={isUp ? "text-emerald-400" : "text-amber-400"} aria-hidden="true">
                {isUp ? "↑" : "↓"}
              </span>
              {label}
            </span>
          )
        })}
        {adjustments.hue !== 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[0.75rem] text-muted">
            <span className="text-[#a5b4fc]" aria-hidden="true">◈</span>
            Hue shift {adjustments.hue > 0 ? "+" : ""}{Math.round(adjustments.hue)}°
          </span>
        )}
        {(Math.abs(adjustments.tintR) > 3 || Math.abs(adjustments.tintB) > 3) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[0.75rem] text-muted">
            <span className="text-gold" aria-hidden="true">◑</span>
            {adjustments.tintR > 0 ? "Warm" : "Cool"} tint
          </span>
        )}
      </div>
    </div>
  )
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  )
}

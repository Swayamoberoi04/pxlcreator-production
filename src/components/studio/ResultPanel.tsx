"use client"

import { motion }              from "framer-motion"
import { BeforeAfterSlider }   from "./BeforeAfterSlider"
import { AIPreviewSlider }     from "./AIPreviewSlider"
import { PresetRecommendCard } from "./PresetRecommendCard"
import { RecommendationsV2 }   from "./RecommendationsV2"
import { DownloadButton }      from "./DownloadButton"
import { PhotoEditorLauncher } from "@/components/editor/PhotoEditorLauncher"
import { AnalysisCard }        from "./AnalysisCard"
import { getStyleProfile }     from "@/lib/studio/style-profiles"
import type { StudioSuccessResponse } from "@/types/studio"

interface ResultPanelProps {
  originalUrl: string
  result:      StudioSuccessResponse
  onReset:     () => void
  /** User's original prompt — forwarded to the AI preview engine as data */
  userPrompt?: string
  /** The uploaded File — the AI preview engine sends it directly
      (blob: URLs cannot be re-fetched under the site CSP) */
  sourceFile?: File | null
}

const EASE = [0.22, 1, 0.36, 1] as const

export function ResultPanel({ originalUrl, result, onReset, userPrompt = "", sourceFile = null }: ResultPanelProps) {
  const { analysis, processedImage, recommendation, processingMs, imageAnalysis } = result

  const profile = imageAnalysis
    ? getStyleProfile(imageAnalysis.styleProfileId)
    : null

  return (
    <div className="flex flex-col gap-10">

      {/* ── Section header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-6 bg-gold opacity-70" aria-hidden="true" />
            <span className="text-label text-gold tracking-widest">Vision Edit</span>
          </div>
          <h2 className="font-display font-bold text-foreground text-[1.375rem]">
            {analysis.mood}
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="text-[0.75rem] text-muted/70">
            Done in {(processingMs / 1000).toFixed(1)}s
          </span>
        </div>
      </motion.div>

      {/* ── Vision Report — AnalysisCard (full width, above the grid) ── */}
      {imageAnalysis && profile && (
        <AnalysisCard
          imageAnalysis={imageAnalysis}
          profileName={profile.name}
          colorPalette={profile.colorPalette}
        />
      )}

      {/* ── Main content grid ── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

        {/* Left — Before/After slider.
            Sharp preview shows instantly; the AI-visualized preview of the
            top recommended preset cross-fades in asynchronously (Phase 4B).
            Without imageAnalysis the plain slider renders — pre-4B behaviour. */}
        <div className="flex flex-col gap-5">
          {imageAnalysis && sourceFile ? (
            <AIPreviewSlider
              originalUrl={originalUrl}
              sourceFile={sourceFile}
              sharpPreviewUrl={processedImage}
              imageAnalysis={imageAnalysis}
              presetSlug={recommendation.slug}
              userPrompt={userPrompt}
            />
          ) : (
            <BeforeAfterSlider
              beforeUrl={originalUrl}
              afterUrl={processedImage}
            />
          )}

          {/* AI description */}
          {analysis.description && (
            <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-2">
              <p className="text-label text-muted/50 tracking-widest">Applied grade</p>
              <p className="text-[0.9375rem] text-foreground/80 leading-relaxed">
                {analysis.description}
              </p>
            </div>
          )}
        </div>

        {/* Right — Download + Reset actions */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <p className="text-label text-muted/50 tracking-widest">Your edit</p>
            {/* Two choices: fine-tune in the pro editor, or download as-is.
                "Continue editing" is the primary path (the flagship workspace). */}
            <PhotoEditorLauncher imageUrl={processedImage} className="w-full" />
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

          {/* Fallback recommendation card when the rich analysis is absent —
              the Intelligence Engine section below needs imageAnalysis. */}
          {!imageAnalysis && <PresetRecommendCard recommendation={recommendation} />}
        </div>
      </div>

      {/* ── Preset Intelligence Engine — top 5 matches (Phase 3) ── */}
      {imageAnalysis && (
        <RecommendationsV2
          imageAnalysis={imageAnalysis}
          fallbackRecommendation={recommendation}
        />
      )}
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

"use client"

/**
 * AIPreviewSlider.tsx — Phase 4B hybrid preview (blueprint §13).
 *
 * The Sharp-graded preview renders in the before/after slider INSTANTLY
 * (exactly the pre-4B behaviour). This component then fires an async
 * preview job for the top recommended preset and, when the AI preview
 * is ready, cross-fades it in as the AFTER layer with a persistent
 * "AI Visualized Preview" label.
 *
 * Silent degradation: any failure — engine disabled, rate limit,
 * provider outage, timeout, polling exhaustion — simply leaves the
 * Sharp preview in place. No error UI, no crash, ever.
 */

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BeforeAfterSlider } from "./BeforeAfterSlider"
import type { ImageAnalysisResult } from "@/types/ai"
import type {
  PreviewCreateResponse,
  PreviewStatusResponse,
  PreviewJobStatus,
} from "@/types/preview"

interface AIPreviewSliderProps {
  /** Object URL of the user's uploaded photo (display only) */
  originalUrl:     string
  /** The uploaded File itself — sent to the preview engine directly.
      (Re-fetching the blob: URL is blocked by the site CSP's connect-src.) */
  sourceFile:      File
  /** Sharp-graded data URI — the instant deterministic preview */
  sharpPreviewUrl: string
  imageAnalysis:   ImageAnalysisResult
  /** Top recommended preset to visualize */
  presetSlug:      string
  /** The user's original prompt (forwarded as data for the prompt builder) */
  userPrompt:      string
}

type PreviewPhase =
  | { phase: "idle" }
  | { phase: "processing" }                       // job submitted, queued
  | { phase: "generating" }
  | { phase: "verifying" }                        // QA stage
  | { phase: "ready"; previewUrl: string }
  | { phase: "off" }                              // degraded/failed/disabled — Sharp stands

const POLL_INTERVAL_MS = 1500
const POLL_BUDGET_MS   = 30_000

export function AIPreviewSlider({
  originalUrl, sourceFile, sharpPreviewUrl, imageAnalysis, presetSlug, userPrompt,
}: AIPreviewSliderProps) {
  const [state, setState] = useState<PreviewPhase>({ phase: "idle" })
  const cancelled = useRef(false)
  /* One job per (file, preset) — also guards React StrictMode's dev
     double-mount from firing (and paying for) a duplicate generation. */
  const firedFor = useRef<string | null>(null)

  useEffect(() => {
    /* Un-cancel on every (re)mount so a StrictMode remount lets the
       in-flight run from the first mount keep updating state. */
    cancelled.current = false
    const fireKey = `${presetSlug}:${sourceFile.name}:${sourceFile.size}`
    if (firedFor.current === fireKey) return
    firedFor.current = fireKey

    async function run(): Promise<void> {
      try {
        setState({ phase: "processing" })

        const formData = new FormData()
        formData.append("image", sourceFile)
        formData.append("presetSlug", presetSlug)
        formData.append("imageAnalysis", JSON.stringify(imageAnalysis))
        formData.append("prompt", userPrompt)

        const res = await fetch("/api/ai/preview", { method: "POST", body: formData })
        if (cancelled.current) return
        if (!res.ok && res.status !== 202) { setState({ phase: "off" }); return }

        const created = (await res.json()) as PreviewCreateResponse
        if (!created.success) { setState({ phase: "off" }); return }

        /* Cache hit — instant swap */
        if (created.cached && created.previewUrl) {
          setState({ phase: "ready", previewUrl: created.previewUrl })
          return
        }
        if (!created.jobId) { setState({ phase: "off" }); return }

        /* Poll until ready / terminal / budget exhausted.
           Adaptive interval (Phase 4D): the server suggests the next
           delay via retryAfterMs — early polls stay snappy, long waits
           back off automatically. */
        const deadline = Date.now() + POLL_BUDGET_MS
        let waitMs = POLL_INTERVAL_MS
        while (Date.now() < deadline && !cancelled.current) {
          await sleep(waitMs)
          const poll = await fetch(`/api/ai/preview/status?jobId=${created.jobId}`)
          if (!poll.ok) continue
          const status = (await poll.json()) as PreviewStatusResponse
          if (!status.success) continue
          if (typeof status.retryAfterMs === "number" && status.retryAfterMs > 0) {
            waitMs = Math.min(status.retryAfterMs, 5000)
          }

          if (status.status === "ready" && status.previewUrl) {
            if (!cancelled.current) setState({ phase: "ready", previewUrl: status.previewUrl })
            return
          }
          if (isTerminal(status.status)) {
            if (!cancelled.current) setState({ phase: "off" })
            return
          }
          if (!cancelled.current) {
            setState({ phase: status.status === "qa" ? "verifying" : "generating" })
          }
        }
        if (!cancelled.current) setState({ phase: "off" })
      } catch {
        if (!cancelled.current) setState({ phase: "off" })
      }
    }

    void run()
    return () => { cancelled.current = true }
  }, [sourceFile, presetSlug])   // eslint-disable-line react-hooks/exhaustive-deps

  const isReady   = state.phase === "ready"
  const isWorking = state.phase === "processing" || state.phase === "generating" || state.phase === "verifying"
  const afterUrl  = isReady ? state.previewUrl : sharpPreviewUrl

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {/* Cross-fade on swap: keying the wrapper by URL fades the new
            AFTER layer in over the old one */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={afterUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <BeforeAfterSlider beforeUrl={originalUrl} afterUrl={afterUrl} />
          </motion.div>
        </AnimatePresence>

        {/* Status chip over the AFTER side */}
        <div className="pointer-events-none absolute top-3 right-3 z-10">
          <AnimatePresence mode="wait">
            {isWorking && (
              <motion.div
                key={state.phase}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2 rounded-full bg-black/65 backdrop-blur-sm border border-white/15 px-3 py-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" aria-hidden="true" />
                <span className="text-[0.7rem] font-medium text-white/92 tracking-wide">
                  {state.phase === "processing"  && "Processing"}
                  {state.phase === "generating"  && "Generating AI Preview"}
                  {state.phase === "verifying"   && "Verifying Quality"}
                </span>
              </motion.div>
            )}
            {isReady && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-sm border border-gold/40 px-3 py-1.5"
              >
                <SparkleIcon />
                <span className="text-[0.7rem] font-semibold text-gold tracking-wide">
                  AI Visualized Preview
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Truth-in-preview footnote — persistent while the AI preview shows */}
      {isReady && (
        <p className="text-[0.75rem] text-muted/85 leading-relaxed px-1">
          AI-visualized preview of this preset&apos;s style — the exact output in
          Lightroom may differ slightly.
        </p>
      )}
    </div>
  )
}

function isTerminal(status: PreviewJobStatus): boolean {
  return status === "degraded" || status === "failed" || status === "expired" || status === "deleted"
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  )
}

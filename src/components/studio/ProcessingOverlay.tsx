"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────
   Step definitions
   startsAt: ms after submission when this step becomes active.
   The steps animate purely for UX — the API call runs in parallel.
───────────────────────────────────────────────────────────── */
const STEPS = [
  { id: "reading",   label: "Reading your image",          icon: "◈", startsAt: 0    },
  { id: "analyzing", label: "Analysing scene & mood",      icon: "◎", startsAt: 1400 },
  { id: "grading",   label: "Applying cinematic grade",    icon: "◑", startsAt: 3200 },
  { id: "matching",  label: "Matching to preset library",  icon: "✦", startsAt: 5200 },
] as const

type StepId = (typeof STEPS)[number]["id"]

interface ProcessingOverlayProps {
  prompt: string
}

export function ProcessingOverlay({ prompt }: ProcessingOverlayProps) {
  const [activeSteps, setActiveSteps] = useState<Set<StepId>>(new Set())

  /* Activate each step at its scheduled time */
  useEffect(() => {
    const timers = STEPS.map(({ id, startsAt }) =>
      setTimeout(
        () => setActiveSteps((prev) => new Set([...prev, id])),
        startsAt
      )
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  /* Which step is currently "running" (last activated, not yet superseded) */
  const activeIndex = (() => {
    let last = -1
    STEPS.forEach((step, i) => {
      if (activeSteps.has(step.id)) last = i
    })
    return last
  })()

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[480px] w-full rounded-2xl overflow-hidden bg-surface border border-border">

      {/* ── Ambient glows ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[320px] w-[480px] rounded-full bg-gold opacity-[0.045] blur-[80px]" />
        <div className="absolute bottom-0 left-1/4 h-[200px] w-[300px] rounded-full bg-[#6366f1] opacity-[0.05] blur-[60px]" />
      </div>

      {/* ── Scanline texture ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
          backgroundSize: "100% 3px",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-8 py-14 w-full max-w-sm">

        {/* Animated ring + icon */}
        <div className="relative flex items-center justify-center">
          {/* Outer spinning ring */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            className="animate-spin"
            style={{ animationDuration: "3s" }}
            aria-hidden="true"
          >
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth="1.5"
              strokeDasharray="80 150"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#C9A84C" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>
          {/* Inner pulsing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-gold animate-pulse" />
          </div>
        </div>

        {/* Current step label */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-display font-bold text-foreground text-[1.125rem]">
            {activeIndex >= 0 ? STEPS[activeIndex].label : "Starting…"}
          </p>
          {prompt && (
            <p className="text-[0.8125rem] text-muted/60 italic line-clamp-2 max-w-[260px]">
              &ldquo;{prompt}&rdquo;
            </p>
          )}
        </div>

        {/* Step list */}
        <div className="flex flex-col gap-3 w-full">
          {STEPS.map((step, i) => {
            const isDone    = i < activeIndex
            const isActive  = i === activeIndex
            const isPending = i > activeIndex

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-4 py-3 border transition-all duration-500",
                  isDone   && "border-gold/20 bg-gold/5",
                  isActive && "border-gold/35 bg-gold/8 shadow-[0_0_16px_rgba(201,168,76,0.08)]",
                  isPending && "border-border/50 bg-background/30"
                )}
              >
                {/* Step status icon */}
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-[0.75rem] font-bold shrink-0 transition-all duration-300",
                  isDone    && "bg-gold/20 text-gold",
                  isActive  && "bg-gold text-background animate-pulse",
                  isPending && "bg-surface-2 text-muted/30"
                )}>
                  {isDone ? <CheckMiniIcon /> : step.icon}
                </div>

                <span className={cn(
                  "text-[0.875rem] font-medium transition-colors duration-300",
                  isDone    && "text-gold/70",
                  isActive  && "text-foreground",
                  isPending && "text-muted/35"
                )}>
                  {step.label}
                </span>

                {/* Active spinner dot */}
                {isActive && (
                  <div className="ml-auto flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        className="h-1 w-1 rounded-full bg-gold/60 animate-bounce"
                        style={{ animationDelay: `${d * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Fine print */}
        <p className="text-[0.75rem] text-muted/35 text-center">
          Hang tight — great things take ~8 seconds
        </p>

      </div>
    </div>
  )
}

function CheckMiniIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

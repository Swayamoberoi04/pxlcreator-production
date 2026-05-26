"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface BeforeAfterSliderProps {
  beforeUrl: string   // original image (object URL or data URI)
  afterUrl:  string   // processed image (base64 data URI)
  className?: string
}

export function BeforeAfterSlider({ beforeUrl, afterUrl, className }: BeforeAfterSliderProps) {
  /* position: 0–100 — percentage of width showing "before" on the LEFT */
  const [position, setPosition]   = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging   = useRef(false)

  /* Convert a clientX pixel to a 0–100 position percentage */
  const toPercent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 50
    const { left, width } = containerRef.current.getBoundingClientRect()
    const clamped = Math.max(0, Math.min(clientX - left, width))
    return (clamped / width) * 100
  }, [])

  /* ── Mouse events ── */
  const onMouseDown  = () => { isDragging.current = true }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return
      setPosition(toPercent(e.clientX))
    }
    function onMouseUp() { isDragging.current = false }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup",   onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup",   onMouseUp)
    }
  }, [toPercent])

  /* ── Touch events (non-passive to allow preventDefault → no scroll) ── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart() { isDragging.current = true }
    function onTouchMove(e: TouchEvent) {
      if (!isDragging.current) return
      e.preventDefault() // prevents page scroll while dragging the slider
      const touch = e.touches[0]
      if (touch) setPosition(toPercent(touch.clientX))
    }
    function onTouchEnd() { isDragging.current = false }

    el.addEventListener("touchstart", onTouchStart, { passive: true  })
    el.addEventListener("touchmove",  onTouchMove,  { passive: false }) // non-passive required
    el.addEventListener("touchend",   onTouchEnd,   { passive: true  })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove",  onTouchMove)
      el.removeEventListener("touchend",   onTouchEnd)
    }
  }, [toPercent])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border select-none cursor-ew-resize",
        "bg-surface",
        className
      )}
      style={{ aspectRatio: "16 / 10" }}
      aria-label="Before and after image comparison — drag to compare"
    >
      {/* ── BEFORE image (base layer — always fully visible) ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt="Before: original photo"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* ── AFTER image (top layer — reveals from left to `position%`) ──
          clip-path inset(top right bottom left):
          We clip the RIGHT side by (100 - position)% so the AFTER
          image is only visible from 0 → position%.
          At position=50: left half = after, right half = before.         ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterUrl}
        alt="After: AI-edited photo"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      {/* ── Divider line ── */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none"
        style={{ left: `${position}%` }}
      />

      {/* ── Drag handle ── */}
      <div
        aria-hidden="true"
        onMouseDown={onMouseDown}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-[0_2px_16px_rgba(0,0,0,0.4)] cursor-ew-resize"
        style={{ left: `${position}%` }}
      >
        <ChevronHandleIcon />
      </div>

      {/* ── Labels ── */}
      {/* AFTER label — left side */}
      <div
        aria-hidden="true"
        className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-gold/30 px-2.5 py-1 pointer-events-none transition-opacity duration-200"
        style={{ opacity: position > 15 ? 1 : 0 }}
      >
        <span className="h-1 w-1 rounded-full bg-gold shrink-0" />
        <span className="text-[0.7rem] font-semibold text-gold tracking-widest uppercase">After</span>
      </div>

      {/* BEFORE label — right side */}
      <div
        aria-hidden="true"
        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 px-2.5 py-1 pointer-events-none transition-opacity duration-200"
        style={{ opacity: position < 85 ? 1 : 0 }}
      >
        <span className="text-[0.7rem] font-semibold text-white/50 tracking-widest uppercase">Before</span>
      </div>

      {/* ── Drag hint — fades out after first interaction ── */}
      <DragHint position={position} />
    </div>
  )
}

/* Shows briefly on mount to teach the interaction, disappears when user drags */
function DragHint({ position }: { position: number }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    /* Hide hint once user has moved the slider at all */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (position !== 50) setVisible(false)
  }, [position])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/15 px-3.5 py-2 pointer-events-none"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
        <polyline points="15 18 9 12 15 6"/><polyline points="9 18 3 12 9 6" transform="translate(12 0)"/>
      </svg>
      <span className="text-[0.72rem] font-medium text-white/60">Drag to compare</span>
    </div>
  )
}

function ChevronHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" /><polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

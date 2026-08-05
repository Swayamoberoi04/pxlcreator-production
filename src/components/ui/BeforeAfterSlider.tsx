"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const PLACEHOLDER_BEFORE = "/placeholders/before.svg"
const PLACEHOLDER_AFTER  = "/placeholders/after.svg"

interface BeforeAfterSliderProps {
  beforeSrc?:      string | null
  afterSrc?:       string | null
  beforeFallback?: string | null  // shown if beforeSrc fails (e.g. preset thumbnail)
  afterFallback?:  string | null  // shown if afterSrc fails
  alt:             string
  label?:          string | null
  accentColor?:    string
  className?:      string
  height?:         number
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeFallback,
  afterFallback,
  alt,
  label,
  accentColor = "#FFD60A",
  className   = "",
  height      = 480,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging   = useRef(false)
  const animFrame    = useRef<number | null>(null)

  const [position,   setPosition]   = useState(0.5)
  const [hinted,     setHinted]     = useState(false)
  const [beforeFail, setBeforeFail] = useState(false)
  const [afterFail,  setAfterFail]  = useState(false)

  // Resolve effective sources — fallback chain: src → custom fallback → placeholder SVG
  const resolvedBefore = beforeFail || !beforeSrc ? (beforeFallback ?? PLACEHOLDER_BEFORE) : beforeSrc
  const resolvedAfter  = afterFail  || !afterSrc  ? (afterFallback  ?? PLACEHOLDER_AFTER)  : afterSrc

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const { left, width } = el.getBoundingClientRect()
    const next = Math.min(1, Math.max(0, (clientX - left) / width))

    if (animFrame.current !== null) cancelAnimationFrame(animFrame.current)
    animFrame.current = requestAnimationFrame(() => {
      setPosition(next)
      if (!hinted) setHinted(true)
    })
  }, [hinted])

  // Mouse events
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    updatePosition(e.clientX)
  }, [updatePosition])

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) updatePosition(e.clientX) }
    const onUp   = () => { isDragging.current = false }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
    }
  }, [updatePosition])

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true
    updatePosition(e.touches[0].clientX)
  }, [updatePosition])

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches[0]) updatePosition(e.touches[0].clientX)
    }
    const onEnd = () => { isDragging.current = false }
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend",  onEnd)
    return () => {
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend",  onEnd)
    }
  }, [updatePosition])

  // Keyboard
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft")  { setPosition(p => Math.max(0, +(p - 0.05).toFixed(3))); setHinted(true) }
    if (e.key === "ArrowRight") { setPosition(p => Math.min(1, +(p + 0.05).toFixed(3))); setHinted(true) }
    if (e.key === "Home")       { setPosition(0); setHinted(true) }
    if (e.key === "End")        { setPosition(1); setHinted(true) }
  }, [])

  // Cleanup rAF on unmount
  useEffect(() => () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }, [])

  const pct         = (position * 100).toFixed(3)
  const beforeClip  = `inset(0 ${(100 - position * 100).toFixed(3)}% 0 0)`
  const handleLeft  = `calc(${pct}% - 22px)`
  const dividerLeft = `calc(${pct}% - 1px)`

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none cursor-col-resize ${className}`}
      style={{ height }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      aria-label={`${alt} before/after comparison`}
    >

      {/* ── AFTER layer (base — always fully visible) ── */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedAfter}
          alt={`${alt} — after`}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          draggable={false}
          fetchPriority="high"
          onError={() => { if (!afterFail) setAfterFail(true) }}
        />
        {/* Warm cinematic tint overlay on the after side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 38% 42%, ${accentColor}12 0%, transparent 68%)`,
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* ── BEFORE layer (clipped to left of divider) ── */}
      <div
        className="absolute inset-0"
        style={{ clipPath: beforeClip }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedBefore}
          alt={`${alt} — before`}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          draggable={false}
          fetchPriority="high"
          onError={() => { if (!beforeFail) setBeforeFail(true) }}
        />
        {/* Slight desaturate / cool tint overlay on the before side */}
        <div className="absolute inset-0 bg-[#0a0e14]/18 pointer-events-none" style={{ mixBlendMode: "multiply" }} />
      </div>

      {/* ── Divider seam ── */}
      <div
        className="absolute top-0 bottom-0 z-20 w-[2px] pointer-events-none will-change-[left]"
        style={{
          left:       dividerLeft,
          background: `linear-gradient(to bottom, transparent 0%, ${accentColor}80 8%, ${accentColor} 50%, ${accentColor}80 92%, transparent 100%)`,
          boxShadow:  `0 0 10px ${accentColor}90, 0 0 24px ${accentColor}45`,
        }}
      />

      {/* ── Drag handle ── */}
      <div
        role="slider"
        aria-label={`${alt} comparison slider — drag left or right`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute z-30 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center cursor-col-resize will-change-[left] transition-transform duration-75 hover:scale-110 active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          left:            handleLeft,
          background:      `radial-gradient(circle at 40% 35%, ${accentColor}22 0%, rgba(6,8,12,0.72) 100%)`,
          border:          `2px solid ${accentColor}95`,
          boxShadow:       `0 0 0 4px ${accentColor}18, 0 0 18px ${accentColor}65, 0 0 36px ${accentColor}30, inset 0 1px 0 ${accentColor}35`,
          backdropFilter:  "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          "--tw-ring-color": accentColor,
        } as React.CSSProperties}
      >
        <svg width="17" height="13" viewBox="0 0 17 13" fill="none" aria-hidden>
          <path
            d="M5.5 2L2 6.5L5.5 11M11.5 2L15 6.5L11.5 11"
            stroke={accentColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ── BEFORE label ── */}
      <div className="absolute top-3.5 left-3.5 z-20 pointer-events-none">
        <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold tracking-[0.18em] uppercase text-white/80 bg-black/55 backdrop-blur-md border border-white/12 rounded-full px-2.5 py-1 leading-none">
          Before
        </span>
      </div>

      {/* ── AFTER label ── */}
      <div className="absolute top-3.5 right-3.5 z-20 pointer-events-none">
        <span
          className="inline-flex items-center gap-1 text-[0.6rem] font-bold tracking-[0.18em] uppercase rounded-full px-2.5 py-1 leading-none backdrop-blur-md border"
          style={{
            color:           accentColor,
            borderColor:     `${accentColor}55`,
            backgroundColor: `${accentColor}1a`,
          }}
        >
          After
        </span>
      </div>

      {/* ── "Drag to compare" hint (shown once, fades after first interaction) ── */}
      {!hinted && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium tracking-wide text-white/80 bg-black/55 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/10 whitespace-nowrap">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M5 12H19M5 12l4-4M5 12l4 4M19 12l-4-4M19 12l-4 4"/>
            </svg>
            Drag to compare
          </span>
        </div>
      )}

      {/* ── Bottom label bar (preset name / explanation) ── */}
      {label && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-5 py-3.5 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.40) 60%, transparent 100%)" }}
        >
          <p className="font-display font-bold text-[0.9375rem] text-white/92 leading-snug">{label}</p>
        </div>
      )}

      {/* ── Cinematic vignette ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.42) 100%)" }}
      />

    </div>
  )
}

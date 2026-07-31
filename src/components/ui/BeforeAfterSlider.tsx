"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"

interface BeforeAfterSliderProps {
  beforeSrc:    string
  afterSrc:     string
  alt:          string
  label?:       string
  accentColor?: string
  className?:   string
  height?:      number
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt,
  label,
  accentColor = "#FFD60A",
  className   = "",
  height      = 420,
}: BeforeAfterSliderProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const isDragging    = useRef(false)
  const [position, setPosition] = useState(0.50)
  const [hinted, setHinted]     = useState(false)

  const posFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const { left, width } = el.getBoundingClientRect()
    setPosition(Math.min(1, Math.max(0, (clientX - left) / width)))
    if (!hinted) setHinted(true)
  }, [hinted])

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    posFromClientX(e.clientX)
  }
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) posFromClientX(e.clientX) }
    const onUp   = () => { isDragging.current = false }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
    }
  }, [posFromClientX])

  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true
    posFromClientX(e.touches[0].clientX)
  }
  useEffect(() => {
    const onMove = (e: TouchEvent) => { if (isDragging.current) posFromClientX(e.touches[0].clientX) }
    const onEnd  = () => { isDragging.current = false }
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend",  onEnd)
    return () => {
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend",  onEnd)
    }
  }, [posFromClientX])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft")  { setPosition(p => Math.max(0, p - 0.05)); setHinted(true) }
    if (e.key === "ArrowRight") { setPosition(p => Math.min(1, p + 0.05)); setHinted(true) }
  }

  const beforeClip = `inset(0 ${(position * 100).toFixed(2)}% 0 0)`

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl select-none cursor-col-resize group ${className}`}
      style={{ height }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >

      {/* After layer (base) */}
      <div className="absolute inset-0">
        <Image
          src={afterSrc}
          alt={`${alt} after`}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover object-center"
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 40% 40%, ${accentColor}14 0%, transparent 65%)`,
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* Before layer (clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: beforeClip }}
      >
        <Image
          src={beforeSrc}
          alt={`${alt} before`}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover object-center"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[#0a0e14]/20 mix-blend-multiply" />
      </div>

      {/* Corner labels */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <span className="text-[0.625rem] font-semibold tracking-widest uppercase text-white/85 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
          Before
        </span>
      </div>
      <div className="absolute top-3 right-3 z-20 pointer-events-none">
        <span
          className="text-[0.625rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-1 border backdrop-blur-sm"
          style={{
            color:           accentColor,
            borderColor:     `${accentColor}50`,
            backgroundColor: `${accentColor}20`,
          }}
        >
          After
        </span>
      </div>

      {/* Divider -- glow seam in accent colour */}
      <div
        className="absolute top-0 bottom-0 z-20 w-[2px] pointer-events-none"
        style={{
          left:       `calc(${(position * 100).toFixed(2)}% - 1px)`,
          background: `linear-gradient(to bottom, transparent 0%, ${accentColor}70 10%, ${accentColor} 50%, ${accentColor}70 90%, transparent 100%)`,
          boxShadow:  `0 0 8px ${accentColor}80, 0 0 20px ${accentColor}40`,
        }}
      />

      {/* Drag handle -- glow knob */}
      <div
        role="slider"
        aria-label={`${alt} comparison slider`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute z-30 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full backdrop-blur-lg flex items-center justify-center cursor-col-resize focus-visible:outline-none focus-visible:ring-2 transition-transform duration-75 hover:scale-110 active:scale-95"
        style={{
          left:            `calc(${(position * 100).toFixed(2)}% - 22px)`,
          background:      `radial-gradient(circle at center, ${accentColor}28 0%, rgba(0,0,0,0.55) 100%)`,
          border:          `2px solid ${accentColor}90`,
          boxShadow:       `0 0 14px ${accentColor}60, 0 0 32px ${accentColor}28, inset 0 1px 0 ${accentColor}30`,
          "--tw-ring-color": accentColor,
        } as React.CSSProperties}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <path d="M5 2L2 6L5 10M11 2L14 6L11 10" stroke={accentColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Hint */}
      {!hinted && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <span className="text-[0.7rem] font-medium tracking-wide text-white/85 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 whitespace-nowrap">
            Drag to compare
          </span>
        </div>
      )}

      {/* Bottom info bar */}
      {label && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-4 py-3 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 70%, transparent 100%)" }}
        >
          <p className="font-display font-bold text-[0.9375rem] text-white leading-none">{label}</p>
        </div>
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.40) 100%)" }}
      />
    </div>
  )
}

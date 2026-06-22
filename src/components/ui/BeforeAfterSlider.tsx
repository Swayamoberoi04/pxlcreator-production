"use client"

/**
 * src/components/ui/BeforeAfterSlider.tsx
 *
 * Accessible drag / touch before-after image comparison slider.
 *
 * How it works:
 *   - "Before" image sits at full width, bottom of stack
 *   - "After" image is clipped with `clip-path: inset(0 X% 0 0)`
 *     where X% = (1 - position) * 100.  Dragging the handle changes X.
 *   - Both images use next/image with fill + object-cover inside a
 *     shared positioned container.
 *   - Mouse + touch + keyboard (â†/â†’ keys, 5% step) all work.
 *
 * Props:
 *   beforeSrc  â€” public path, e.g. "/assets/garage_before.webp"
 *   afterSrc   â€” public path, e.g. "/assets/garage_after.webp"
 *   alt        â€” shared base alt text (suffixed "before"/"after")
 *   label      â€” preset name shown in the bottom bar
 *   accentColor â€” hex/rgba for the "after" badge tint
 *   className  â€” extra classes on the outer container
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"

interface BeforeAfterSliderProps {
  beforeSrc:    string
  afterSrc:     string
  alt:          string
  label?:       string
  accentColor?: string
  className?:   string
  height?:      number   // px height of the card (default 420)
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
  const [position, setPosition] = useState(0.50)   // 0 = all before, 1 = all after
  const [hinted, setHinted]     = useState(false)  // hide hint once user drags

  /* â”€â”€ Convert pointer X into 0-1 position â”€â”€ */
  const posFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const { left, width } = el.getBoundingClientRect()
    setPosition(Math.min(1, Math.max(0, (clientX - left) / width)))
    if (!hinted) setHinted(true)
  }, [hinted])

  /* â”€â”€ Mouse handlers â”€â”€ */
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

  /* â”€â”€ Touch handlers â”€â”€ */
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

  /* â”€â”€ Keyboard: left/right arrows for accessibility â”€â”€ */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft")  { setPosition(p => Math.max(0, p - 0.05)); setHinted(true) }
    if (e.key === "ArrowRight") { setPosition(p => Math.min(1, p + 0.05)); setHinted(true) }
  }

  /*
   * Layout: Before = LEFT, After = RIGHT.
   *
   * The "after" (graded) image is the base layer â€” always fully visible.
   * The "before" (unedited) image sits on top, clipped so only its
   * LEFT portion shows: clip-path inset(0 position*100% 0 0).
   *
   *   position=0 (handle far left)  â†’ full before visible  â†’ see unedited
   *   position=0.5 (default centre) â†’ left half before, right half after
   *   position=1 (handle far right) â†’ no before visible   â†’ see fully graded
   */
  const beforeClip = `inset(0 ${(position * 100).toFixed(2)}% 0 0)`

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl select-none cursor-col-resize group ${className}`}
      style={{ height }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >

      {/* â”€â”€ After layer (base â€” always fully visible) â”€â”€ */}
      <div className="absolute inset-0">
        <Image
          src={afterSrc}
          alt={`${alt} â€” after`}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover object-center"
          draggable={false}
        />
        {/* Subtle cinematic warmth overlay â€” lifts the "graded" feel */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 40% 40%, ${accentColor}14 0%, transparent 65%)`,
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* â”€â”€ Before layer (top â€” clipped to left portion only) â”€â”€ */}
      <div
        className="absolute inset-0"
        style={{ clipPath: beforeClip }}
      >
        <Image
          src={beforeSrc}
          alt={`${alt} â€” before`}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover object-center"
          draggable={false}
        />
        {/* Slight cold desaturated tint for "unedited" feel */}
        <div className="absolute inset-0 bg-[#0a0e14]/20 mix-blend-multiply" />
      </div>

      {/* â”€â”€ Corner labels: Before always left, After always right â”€â”€ */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <span className="text-[0.6rem] font-semibold tracking-widest uppercase text-white/50 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
          Before
        </span>
      </div>
      <div className="absolute top-3 right-3 z-20 pointer-events-none">
        <span
          className="text-[0.6rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-1 border backdrop-blur-sm"
          style={{
            color:           accentColor,
            borderColor:     `${accentColor}50`,
            backgroundColor: `${accentColor}20`,
          }}
        >
          After
        </span>
      </div>

      {/* â”€â”€ Divider line â”€â”€ */}
      <div
        className="absolute top-0 bottom-0 z-20 w-[2px] pointer-events-none"
        style={{
          left:       `calc(${(position * 100).toFixed(2)}% - 1px)`,
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.5) 15%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.5) 85%, transparent 100%)",
        }}
      />

      {/* â”€â”€ Drag handle â”€â”€ */}
      <div
        role="slider"
        aria-label={`${alt} comparison slider`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute z-30 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-lg border-2 border-white/50 flex items-center justify-center shadow-xl cursor-col-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-transform duration-75 hover:scale-110"
        style={{ left: `calc(${(position * 100).toFixed(2)}% - 20px)` }}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <path d="M5 2L2 6L5 10M11 2L14 6L11 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* â”€â”€ "Drag to compare" hint (fades once user starts dragging) â”€â”€ */}
      {!hinted && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <span className="text-[0.7rem] font-medium tracking-wide text-white/60 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 whitespace-nowrap">
            Drag to compare
          </span>
        </div>
      )}

      {/* â”€â”€ Bottom info bar â”€â”€ */}
      {label && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-4 py-3 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 70%, transparent 100%)" }}
        >
          <p className="font-display font-bold text-[0.9375rem] text-white leading-none">{label}</p>
        </div>
      )}

      {/* â”€â”€ Vignette â”€â”€ */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.40) 100%)" }}
      />
    </div>
  )
}


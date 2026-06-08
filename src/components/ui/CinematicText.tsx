"use client"

/**
 * CinematicText.tsx
 *
 * GSAP-powered word-split headline reveal.
 * Splits a plain string into individual <span> words, then drives each word
 * through a 3D rotateX + Y-rise animation staggered across the headline.
 *
 * The result feels like the words are "falling into place" from above the
 * screen plane — a signature premium cinematic motion technique.
 *
 * Requirements:
 *   • children MUST be a plain string (no embedded JSX)
 *   • For mixed content (gold gradient spans etc.) use CinematicReveal instead
 *
 * Usage:
 *   <CinematicText as="h2" className="heading-2 text-foreground">
 *     Handpicked for Creators
 *   </CinematicText>
 */

import { useRef, useEffect }  from "react"
/*
 * GSAP is lazy-loaded inside useEffect so it's excluded from the initial
 * HTML payload. ScrollTrigger fires well after mount — the async import
 * completes before the trigger point is ever reached in practice.
 */

type TagType = "h1" | "h2" | "h3" | "h4" | "p" | "span"

interface CinematicTextProps {
  children:  string
  as?:       TagType
  className?: string
  delay?:    number
  /** Stagger seconds between each word. Default 0.045 */
  stagger?:  number
  /** ScrollTrigger start. Default "top 85%" */
  start?:    string
}

export function CinematicText({
  children,
  as: Tag = "h2",
  className,
  delay   = 0,
  stagger = 0.045,
  start   = "top 85%",
}: CinematicTextProps) {
  const ref = useRef<HTMLElement>(null)

  /* Split on spaces, preserving whitespace structure */
  const words = children.split(" ").filter(Boolean)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    /* Bail on reduced motion preference */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const wordEls = el.querySelectorAll<HTMLElement>(".cinema-word")
    if (!wordEls.length) return

    let ctx: { revert: () => void } | undefined

    /* Lazy-load GSAP — deferred until after initial render */
    import("gsap").then(({ default: gsap }) =>
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)
        ctx = gsap.context(() => {
          gsap.from(wordEls, {
            scrollTrigger: {
              trigger:  el,
              start,
            },
            opacity:              0,
            y:                    65,
            rotateX:              -24,
            transformPerspective: 1400,
            transformOrigin:      "50% 0%",
            duration:             0.88,
            ease:                 "expo.out",
            stagger,
            delay,
            /* Clear will-change after animation completes — frees GPU layer */
            onComplete() {
              wordEls.forEach((w) => { w.style.willChange = "auto" })
            },
          })
        }, el)
      })
    )

    return () => { ctx?.revert() }
  }, [delay, stagger, start])

  return (
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    <Tag ref={ref as any} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="cinema-word inline-block"
          style={{ marginRight: i < words.length - 1 ? "0.3em" : 0 }}
        >
          {word}
        </span>
      ))}
    </Tag>
  )
}

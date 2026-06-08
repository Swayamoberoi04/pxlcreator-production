"use client"

import { useState, useEffect }               from "react"
import Link                                   from "next/link"
import Image                                  from "next/image"
import dynamic                                from "next/dynamic"
import { motion, useMotionValue, useSpring }  from "framer-motion"
import { cn }                                 from "@/lib/utils"
import { CinematicBackground }                from "@/components/ui/CinematicBackground"
import { FloatingParticles }                  from "@/components/ui/FloatingParticles"
import { GrainOverlay }                       from "@/components/ui/GrainOverlay"
import { MagneticButton }                     from "@/components/ui/MagneticButton"

/*
 * HeroScene3D is a Three.js canvas — must skip SSR entirely.
 * dynamic() is called at module level (not inside the component) so
 * Next.js can statically analyse the import for code-splitting.
 */
const HeroScene3D = dynamic(
  () => import("@/components/3d/HeroScene3D").then((m) => m.HeroScene3D),
  { ssr: false }
)

/* ─────────────────────────────────────────────────────────────
   Background scenes
   Three real cinematic images cycle every 5.5 s with a 1.8 s
   crossfade. Each scene tints the photo with a matching colour
   grade overlay so the brand palette remains consistent.
───────────────────────────────────────────────────────────── */
const SCENES = [
  {
    /* Warm golden hour — Film Rich vibe */
    img:    "/assets/magical_sunset.webp",
    tint:   "linear-gradient(to bottom, rgba(20,8,0,0.55) 0%, rgba(10,4,0,0.30) 50%, rgba(0,0,0,0.60) 100%)",
    accent: "radial-gradient(ellipse 85% 55% at 28% 38%, rgba(160,85,15,0.22) 0%, transparent 68%)",
  },
  {
    /* Cool cinematic night — Noir Night vibe */
    img:    "/assets/moody_city.webp",
    tint:   "linear-gradient(to bottom, rgba(2,8,20,0.60) 0%, rgba(5,14,30,0.30) 50%, rgba(0,0,0,0.65) 100%)",
    accent: "radial-gradient(ellipse 70% 60% at 72% 32%, rgba(15,55,115,0.28) 0%, transparent 68%)",
  },
  {
    /* Forest / film green — Film Green vibe */
    img:    "/assets/film_green.webp",
    tint:   "linear-gradient(to bottom, rgba(4,10,4,0.58) 0%, rgba(8,18,8,0.28) 50%, rgba(0,0,0,0.62) 100%)",
    accent: "radial-gradient(ellipse 60% 70% at 50% 28%, rgba(20,75,25,0.18) 0%, transparent 68%)",
  },
] as const

export function HeroSection() {
  const [active, setActive] = useState(0)

  /* ── Scene cycling ── */
  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % SCENES.length), 5500)
    return () => clearInterval(id)
  }, [])

  /* ── Mouse parallax — content floats ±8px on pointer move ── */
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const springX = useSpring(rawX, { stiffness: 38, damping: 28, mass: 0.6 })
  const springY = useSpring(rawY, { stiffness: 38, damping: 28, mass: 0.6 })

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) return

    const handleMove = (e: MouseEvent) => {
      const cx = window.innerWidth  / 2
      const cy = window.innerHeight / 2
      rawX.set(((e.clientX - cx) / cx) *  7)
      rawY.set(((e.clientY - cy) / cy) *  5)
    }
    window.addEventListener("mousemove", handleMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMove)
  }, [rawX, rawY])

  return (
    <section
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ minHeight: "calc(100svh - 3.5rem)" }}
    >

      {/* ═══════════════════════════════════════════
          LAYER 0 — Scene: real cinematic photo
          Ken Burns slow zoom via hero-drift keyframe
      ═══════════════════════════════════════════ */}
      {SCENES.map((scene, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out"
          style={{
            opacity:              i === active ? 1 : 0,
            animation:            "hero-drift 22s ease-in-out infinite alternate",
            /* Pause the Ken Burns drift on hidden scenes — saves GPU per frame */
            animationPlayState:   i === active ? "running" : "paused",
            /* Only promote the active layer; inactive ones need no compositor layer */
            willChange:           i === active ? "transform" : "auto",
          }}
        >
          <Image
            src={scene.img}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover object-center"
            draggable={false}
          />
        </div>
      ))}

      {/* ═══════════════════════════════════════════
          LAYER 1 — Per-scene colour-grade tint + accent
      ═══════════════════════════════════════════ */}
      {SCENES.map((scene, i) => (
        <div
          key={`t${i}`}
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          {/* Colour grade tint */}
          <div className="absolute inset-0" style={{ background: scene.tint }} />
          {/* Mood accent light */}
          <div className="absolute inset-0" style={{ background: scene.accent }} />
        </div>
      ))}

      {/* ═══════════════════════════════════════════
          LAYER 2 — Cinematic ambient orbs + spotlight
          (CinematicBackground handles orb-drift keyframes)
      ═══════════════════════════════════════════ */}
      <CinematicBackground variant="hero" className="z-[2]" />

      {/* ═══════════════════════════════════════════
          LAYER 3 — Floating gold dust particles
      ═══════════════════════════════════════════ */}
      <FloatingParticles
        count={9}
        color="rgba(255,215,0,0.65)"
        zIndex={3}
      />

      {/* ═══════════════════════════════════════════
          LAYER 4 — Animated film grain
      ═══════════════════════════════════════════ */}
      <GrainOverlay opacity={0.038} animated zIndex={4} />

      {/* ═══════════════════════════════════════════
          LAYER 5 — Dark readability overlay
      ═══════════════════════════════════════════ */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/50 z-[5]" />

      {/* ═══════════════════════════════════════════
          LAYER 6 — Radial vignette (edges darken)
      ═══════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[6] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* ═══════════════════════════════════════════
          LAYER 7 — Cinematic letterbox bars
      ═══════════════════════════════════════════ */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0    h-[6%] bg-background/70 z-[7]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[6%] bg-background/70 z-[7]" />

      {/* ═══════════════════════════════════════════
          LAYER 9 — R3F 3D glass frames + gold cloud
          Canvas has alpha=true; all layers beneath
          show through. pointer-events=none keeps DOM
          interactions intact for the content above.
      ═══════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[9] pointer-events-none"
      >
        <HeroScene3D />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          HERO CONTENT — floats on mouse parallax spring
      ═══════════════════════════════════════════════════════════ */}
      <motion.div
        style={{ x: springX, y: springY }}
        className="relative z-[10] flex flex-col items-center text-center w-full px-5 select-none"
      >

        {/* ── Eyebrow ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 mb-6 sm:mb-8"
        >
          <span className="h-px w-10 bg-gold/60" aria-hidden="true" />
          <span className="text-label text-gold/80 tracking-[0.2em]">Premium Cinematic Presets</span>
          <span className="h-px w-10 bg-gold/60" aria-hidden="true" />
        </motion.div>

        {/* ── Headline — deep cinematic glow underneath ── */}
        <div className="relative">
          {/* Radial gold bloom behind the headline text */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 pointer-events-none"
            style={{
              background:      "radial-gradient(ellipse 90% 60% at 50% 50%, rgba(255,215,0,0.12) 0%, transparent 70%)",
              animation:       "glow-pulse 5s ease-in-out infinite",
              "--pulse-min":   "0.7",
              "--pulse-max":   "1.0",
              willChange:      "opacity, transform",
              filter:          "blur(2px)",
              transform:       "scale(2.2) translateY(10%)",
            } as React.CSSProperties}
          />

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-black text-white uppercase leading-[0.88] tracking-[-0.025em]"
            style={{ fontSize: "clamp(3.5rem, 11.5vw, 15rem)" }}
          >
            PXL{" "}
            <span className="text-gold logo-glow">CREATOR</span>
          </motion.h1>
        </div>

        {/* ── Subtitle ── */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 sm:mt-10 text-[0.9375rem] sm:text-[1.0625rem] text-white/65 max-w-[440px] leading-relaxed font-normal"
        >
          Handcrafted cinematic presets.<br />
          Your creative identity starts here.
        </motion.p>

        {/* ── CTAs ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-9 sm:mt-11 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {/* Primary — magnetic */}
          <MagneticButton>
            <Link
              href="/store"
              className="inline-flex items-center gap-2.5 rounded-full bg-gold px-9 py-3.5 text-[0.9375rem] font-semibold text-background hover:bg-gold-dim active:scale-[0.97] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent shadow-[0_0_36px_rgba(255,215,0,0.3)] hover:shadow-[0_0_52px_rgba(255,215,0,0.45)]"
            >
              Shop Now
            </Link>
          </MagneticButton>

          {/* Secondary — magnetic */}
          <MagneticButton>
            <Link
              href="/bundles"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-7 py-3.5 text-[0.9375rem] font-semibold text-white/80 hover:border-white/40 hover:bg-white/12 hover:text-white active:scale-[0.97] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Browse Bundles
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </MagneticButton>
        </motion.div>

        {/* ── Trust line ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.8 }}
          className="mt-5 text-[0.8125rem] text-white/45"
        >
          Trusted by{" "}
          <span className="text-white/55 font-medium">10,000+</span>{" "}
          creators worldwide
        </motion.p>

      </motion.div>

      {/* ── Scene indicator dots ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10] flex items-center gap-2">
        {SCENES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Switch to scene ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              i === active
                ? "w-6 h-1.5 bg-gold shadow-[0_0_8px_rgba(255,215,0,0.6)]"
                : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"
            )}
          />
        ))}
      </div>

      {/* ── Bottom fade into next section ── */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent z-[8]"
      />

    </section>
  )
}

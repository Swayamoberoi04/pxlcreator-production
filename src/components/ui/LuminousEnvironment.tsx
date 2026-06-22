"use client"

/**
 * LuminousEnvironment.tsx
 *
 * Pure CSS atmospheric background system that transforms flat dark sections
 * into living, glowing, dimensional cinematic environments.
 *
 * Architecture:
 *   • Absolutely positioned within a `relative` parent section
 *   • Multiple layered radial gradient orbs with CSS `@keyframes` breathing
 *   • 0 R3F / WebGL cost — lightweight CSS animations only
 *   • 8 environment variants, each with a unique atmospheric palette
 *   • Composes with GrainOverlay for micro-texture depth
 *
 * Usage:
 *   <section className="relative overflow-hidden">
 *     <LuminousEnvironment variant="gold" />
 *     <div className="relative z-10">... content ...</div>
 *   </section>
 *
 * Design intent:
 *   Sections should never feel like "dark containers."
 *   They should feel like entering a room lit from multiple soft directions —
 *   warm gold from one side, cool indigo from another, deep teal from below.
 */

type LuminousVariant =
  | "gold"      // warm amber/gold keynote
  | "indigo"    // cool purple/indigo editorial
  | "teal"      // cinematic deep teal/green
  | "store"     // energetic gold + indigo commerce mix
  | "preset"    // warm editorial product atmosphere
  | "studio"    // cool AI/tech spatial atmosphere
  | "vision"    // apple vision-style silver/pearl
  | "neutral"   // balanced default atmosphere

interface LuminousEnvironmentProps {
  variant?:    LuminousVariant
  intensity?:  number   // 0–1, scales opacity. Default 1.0
  animated?:   boolean  // enable breathing animation. Default true
  className?:  string
}

/* ── Orb definitions per variant ─────────────────────────────────── */
type OrbDef = {
  pos:   string   // CSS background-position
  color: string   // rgba
  size:  string   // ellipse size
  anim:  string   // animation name
  delay: string
}

const VARIANTS: Record<LuminousVariant, OrbDef[]> = {
  gold: [
    { pos: "15% 0%",    color: "rgba(255,214,10,0.13)",   size: "80% 45%",  anim: "lenv-breathe-a", delay: "0s"   },
    { pos: "85% 70%",   color: "rgba(224,168,0,0.09)",  size: "65% 55%",  anim: "lenv-breathe-b", delay: "1.8s" },
    { pos: "50% 100%",  color: "rgba(255,180,0,0.06)",   size: "100% 35%", anim: "lenv-breathe-a", delay: "3.2s" },
    { pos: "0% 55%",    color: "rgba(255,100,0,0.04)",   size: "40% 60%",  anim: "lenv-drift",     delay: "0.5s" },
  ],
  indigo: [
    { pos: "80% 10%",   color: "rgba(61,122,138,0.12)",  size: "70% 50%",  anim: "lenv-breathe-b", delay: "0s"   },
    { pos: "10% 80%",   color: "rgba(61,122,138,0.10)",  size: "60% 55%",  anim: "lenv-breathe-a", delay: "2.1s" },
    { pos: "50% 30%",   color: "rgba(61,122,138,0.06)", size: "80% 40%",  anim: "lenv-breathe-b", delay: "1.0s" },
    { pos: "90% 90%",   color: "rgba(67,56,202,0.08)",   size: "45% 45%",  anim: "lenv-drift",     delay: "0.8s" },
  ],
  teal: [
    { pos: "20% 90%",   color: "rgba(20,184,166,0.10)",  size: "70% 50%",  anim: "lenv-breathe-a", delay: "0s"   },
    { pos: "75% 15%",   color: "rgba(6,182,212,0.08)",   size: "55% 55%",  anim: "lenv-breathe-b", delay: "2.5s" },
    { pos: "50% 50%",   color: "rgba(16,185,129,0.05)",  size: "90% 40%",  anim: "lenv-breathe-a", delay: "1.2s" },
    { pos: "5% 30%",    color: "rgba(20,120,100,0.07)",  size: "40% 60%",  anim: "lenv-drift",     delay: "0.3s" },
  ],
  store: [
    { pos: "70% 0%",    color: "rgba(255,214,10,0.11)",   size: "75% 45%",  anim: "lenv-breathe-a", delay: "0s"   },
    { pos: "5% 70%",    color: "rgba(61,122,138,0.10)",  size: "60% 55%",  anim: "lenv-breathe-b", delay: "1.5s" },
    { pos: "50% 100%",  color: "rgba(255,180,0,0.05)",   size: "110% 30%", anim: "lenv-breathe-b", delay: "2.8s" },
    { pos: "90% 60%",   color: "rgba(61,122,138,0.06)",  size: "40% 50%",  anim: "lenv-drift",     delay: "0.7s" },
    { pos: "30% 20%",   color: "rgba(255,214,10,0.05)",   size: "50% 40%",  anim: "lenv-breathe-a", delay: "3.5s" },
  ],
  preset: [
    { pos: "25% 0%",    color: "rgba(255,214,10,0.10)",   size: "85% 40%",  anim: "lenv-breathe-a", delay: "0s"   },
    { pos: "80% 60%",   color: "rgba(255,160,0,0.07)",   size: "55% 50%",  anim: "lenv-breathe-b", delay: "2.0s" },
    { pos: "0% 100%",   color: "rgba(224,168,0,0.05)",  size: "70% 35%",  anim: "lenv-breathe-a", delay: "1.4s" },
    { pos: "60% 40%",   color: "rgba(61,122,138,0.05)",  size: "50% 55%",  anim: "lenv-drift",     delay: "0.9s" },
  ],
  studio: [
    { pos: "85% 5%",    color: "rgba(61,122,138,0.13)",  size: "65% 50%",  anim: "lenv-breathe-b", delay: "0s"   },
    { pos: "10% 80%",   color: "rgba(61,122,138,0.09)", size: "60% 55%",  anim: "lenv-breathe-a", delay: "1.6s" },
    { pos: "50% 50%",   color: "rgba(255,214,10,0.06)",   size: "70% 40%",  anim: "lenv-breathe-b", delay: "2.4s" },
    { pos: "0% 20%",    color: "rgba(67,56,202,0.08)",   size: "45% 60%",  anim: "lenv-drift",     delay: "0.4s" },
    { pos: "95% 90%",   color: "rgba(20,184,166,0.05)",  size: "50% 40%",  anim: "lenv-breathe-a", delay: "3.0s" },
  ],
  vision: [
    { pos: "50% 0%",    color: "rgba(220,225,235,0.08)", size: "100% 40%", anim: "lenv-breathe-a", delay: "0s"   },
    { pos: "0% 60%",    color: "rgba(180,190,210,0.06)", size: "55% 60%",  anim: "lenv-breathe-b", delay: "1.8s" },
    { pos: "100% 40%",  color: "rgba(200,210,230,0.05)", size: "50% 55%",  anim: "lenv-drift",     delay: "0.6s" },
    { pos: "40% 100%",  color: "rgba(255,214,10,0.04)",   size: "80% 30%",  anim: "lenv-breathe-a", delay: "2.2s" },
  ],
  neutral: [
    { pos: "25% 0%",    color: "rgba(255,214,10,0.07)",   size: "70% 40%",  anim: "lenv-breathe-a", delay: "0s"   },
    { pos: "80% 80%",   color: "rgba(61,122,138,0.07)",  size: "55% 50%",  anim: "lenv-breathe-b", delay: "2.0s" },
    { pos: "50% 50%",   color: "rgba(20,184,166,0.04)",  size: "80% 45%",  anim: "lenv-breathe-a", delay: "1.0s" },
    { pos: "5% 50%",    color: "rgba(255,150,0,0.04)",   size: "40% 60%",  anim: "lenv-drift",     delay: "3.0s" },
  ],
}

export function LuminousEnvironment({
  variant   = "neutral",
  intensity = 1,
  animated  = true,
  className = "",
}: LuminousEnvironmentProps) {
  const orbs = VARIANTS[variant]

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        zIndex: 0,
        /*
         * `contain: strict` — tells the browser this element and its
         * subtree do not affect layout/paint outside it. This lets the
         * compositor skip repainting the rest of the page when orbs animate.
         * `willChange` removed from the container: it promoted the wrong
         * layer. CSS animations on opacity+transform inside the container
         * are already compositor-accelerated without explicit promotion.
         */
        contain: "strict",
      }}
    >
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position:       "absolute",
            width:          "100%",
            height:         "100%",
            background:     `radial-gradient(ellipse ${orb.size} at ${orb.pos}, ${scaleAlpha(orb.color, intensity)} 0%, transparent 70%)`,
            animation:      animated
              ? `${orb.anim} ${5 + i * 1.8}s ease-in-out infinite alternate`
              : "none",
            animationDelay: orb.delay,
            /* No per-orb will-change — container handles promotion */
          }}
        />
      ))}

      {/* Subtle horizontal light sweep — cinematic atmosphere */}
      <div
        style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.30) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

/* ── Scale alpha channel of rgba() ──────────────────────────────── */
function scaleAlpha(rgba: string, scale: number): string {
  if (scale === 1) return rgba
  return rgba.replace(/[\d.]+\)$/, (m) => `${(parseFloat(m) * scale).toFixed(3)})`)
}


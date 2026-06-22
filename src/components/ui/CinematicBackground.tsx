/**
 * src/components/ui/CinematicBackground.tsx
 *
 * Reusable atmospheric background layer engine.
 * Renders: animated floating blur orbs + optional cinematic spotlight sweep.
 *
 * Each "variant" encodes the right colour palette and orb configuration for
 * the specific section it's used in. Extend VARIANT_CONFIG to add more.
 *
 * Architecture:
 *   - Pure visual layer. `pointer-events-none`, `aria-hidden`, `z-0`.
 *   - All animations use GPU-only properties (transform, opacity).
 *   - `will-change: transform` pre-promotes layers to the compositor thread.
 *   - CSS class `anim-orb` / `anim-spotlight` are suppressed automatically
 *     by the `prefers-reduced-motion` block in globals.css.
 *
 * Usage:
 *   <section className="relative overflow-hidden">
 *     <CinematicBackground variant="ai-studio" />
 *     <div className="relative z-10">...content...</div>
 *   </section>
 */
"use client"

import { cn } from "@/lib/utils"

/* â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export type CinematicVariant =
  | "hero"
  | "manifesto"
  | "ai-studio"
  | "mission"
  | "dark"
  | "default"

interface OrbConfig {
  color:    string   // rgba colour string for the radial gradient centre
  size:     string   // CSS size (px or vw)
  x:        string   // left position (%)
  y:        string   // top position (%)
  duration: string   // animation-duration
  delay:    string   // animation-delay (negative for mid-cycle start)
  blur?:    string   // extra CSS blur in addition to the gradient softness
}

interface VariantConfig {
  orbs:            OrbConfig[]
  spotlight:       boolean
  spotlightColor?: string
  /** Optional: pulsing central glow */
  centerPulse?:    { color: string; size: string; duration: string }
}

/* â”€â”€ Variant presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const VARIANT_CONFIG: Record<CinematicVariant, VariantConfig> = {

  /* â”€â”€ Hero â€” warm gold / amber atmosphere â”€â”€ */
  hero: {
    spotlight: true,
    spotlightColor: "rgba(255,214,10,0.06)",
    centerPulse: { color: "rgba(255,214,10,0.08)", size: "800px", duration: "7s" },
    orbs: [
      {
        color:    "rgba(255,185,20,0.18)",
        size:     "600px",
        x: "18%", y: "38%",
        duration: "18s", delay: "0s",
      },
      {
        color:    "rgba(180,80,0,0.12)",
        size:     "450px",
        x: "72%", y: "62%",
        duration: "24s", delay: "-7s",
      },
      {
        color:    "rgba(255,140,0,0.09)",
        size:     "350px",
        x: "48%", y: "82%",
        duration: "20s", delay: "-13s",
      },
    ],
  },

  /* â”€â”€ Manifesto / Distinction â€” warm gold identity â”€â”€ */
  manifesto: {
    spotlight: false,
    centerPulse: { color: "rgba(255,214,10,0.07)", size: "900px", duration: "10s" },
    orbs: [
      {
        color:    "rgba(255,214,10,0.09)",
        size:     "700px",
        x: "50%", y: "50%",
        duration: "22s", delay: "0s",
      },
      {
        color:    "rgba(220,140,20,0.07)",
        size:     "400px",
        x: "82%", y: "22%",
        duration: "28s", delay: "-9s",
      },
      {
        color:    "rgba(180,100,0,0.06)",
        size:     "300px",
        x: "15%", y: "72%",
        duration: "18s", delay: "-5s",
      },
    ],
  },

  /* â”€â”€ AI Studio â€” indigo/violet + gold (AI + creativity) â”€â”€ */
  "ai-studio": {
    spotlight: false,
    orbs: [
      {
        color:    "rgba(61,122,138,0.12)",
        size:     "520px",
        x: "82%", y: "18%",
        duration: "20s", delay: "0s",
      },
      {
        color:    "rgba(255,214,10,0.09)",
        size:     "420px",
        x: "15%", y: "72%",
        duration: "18s", delay: "-6s",
      },
      {
        color:    "rgba(61,122,138,0.08)",
        size:     "320px",
        x: "48%", y: "50%",
        duration: "26s", delay: "-13s",
      },
      {
        color:    "rgba(61,122,138,0.07)",
        size:     "250px",
        x: "62%", y: "80%",
        duration: "22s", delay: "-18s",
      },
    ],
  },

  /* â”€â”€ Mission / Why â€” deep cinematic, understated gold haze â”€â”€ */
  mission: {
    spotlight: false,
    orbs: [
      {
        color:    "rgba(255,214,10,0.055)",
        size:     "900px",
        x: "50%", y: "110%",
        duration: "28s", delay: "0s",
      },
      {
        color:    "rgba(180,120,0,0.045)",
        size:     "600px",
        x: "20%", y: "28%",
        duration: "32s", delay: "-12s",
      },
      {
        color:    "rgba(255,180,0,0.035)",
        size:     "400px",
        x: "78%", y: "60%",
        duration: "24s", delay: "-20s",
      },
    ],
  },

  /* â”€â”€ Dark â€” single low-opacity pulse (vision/closing beat) â”€â”€ */
  dark: {
    spotlight: false,
    centerPulse: { color: "rgba(255,214,10,0.06)", size: "1000px", duration: "12s" },
    orbs: [
      {
        color:    "rgba(255,214,10,0.05)",
        size:     "700px",
        x: "50%", y: "90%",
        duration: "30s", delay: "0s",
      },
    ],
  },

  /* â”€â”€ Default â€” minimal safe fallback â”€â”€ */
  default: {
    spotlight: false,
    orbs: [
      {
        color:    "rgba(255,214,10,0.06)",
        size:     "500px",
        x: "50%", y: "50%",
        duration: "20s", delay: "0s",
      },
    ],
  },
}

/* â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

interface CinematicBackgroundProps {
  variant?:  CinematicVariant
  className?: string
}

export function CinematicBackground({
  variant   = "default",
  className,
}: CinematicBackgroundProps) {
  const cfg = VARIANT_CONFIG[variant]

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      style={{ zIndex: 0 }}
    >

      {/* â”€â”€ Floating blur orbs â”€â”€ */}
      {cfg.orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full anim-orb"
          style={{
            width:  orb.size,
            height: orb.size,
            left:   orb.x,
            top:    orb.y,
            /* translate(-50%,-50%) is baked into the keyframe start/end,
               so the orb always centres on (x, y) */
            background: `radial-gradient(ellipse at center, ${orb.color} 0%, transparent 72%)`,
            animation:       `orb-drift ${orb.duration} ease-in-out infinite`,
            animationDelay:  orb.delay,
            /*
             * will-change: transform removed from decorative orbs.
             * CSS keyframe animations are already compositor-promoted by the
             * browser automatically when they only touch transform/opacity.
             * Explicit will-change on every orb forces a dedicated GPU layer
             * per-orb even when they're nearly invisible â€” GPU memory waste.
             */
            filter:          orb.blur ? `blur(${orb.blur})` : undefined,
          }}
        />
      ))}

      {/* â”€â”€ Central breathing glow pulse â”€â”€ */}
      {cfg.centerPulse && (
        <div
          className="absolute rounded-full anim-pulse"
          style={{
            width:  cfg.centerPulse.size,
            height: cfg.centerPulse.size,
            left:   "50%",
            top:    "50%",
            background: `radial-gradient(ellipse at center, ${cfg.centerPulse.color} 0%, transparent 68%)`,
            "--pulse-min": "0.4",
            "--pulse-max": "1.0",
            animation:       `glow-pulse ${cfg.centerPulse.duration} ease-in-out infinite`,
            /* No will-change â€” browser auto-promotes opacity/transform keyframes */
          } as React.CSSProperties}
        />
      )}

      {/* â”€â”€ Cinematic spotlight sweep â”€â”€ */}
      {cfg.spotlight && cfg.spotlightColor && (
        <div
          className="absolute inset-y-0 anim-spotlight"
          style={{
            left:   "-30%",
            width:  "60%",
            background: `linear-gradient(105deg, transparent 0%, ${cfg.spotlightColor} 40%, transparent 80%)`,
            animation:       "spotlight-sweep 9s ease-in-out infinite",
            animationDelay:  "1.5s",
          }}
        />
      )}

    </div>
  )
}


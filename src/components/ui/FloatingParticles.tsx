/**
 * src/components/ui/FloatingParticles.tsx
 *
 * Floating micro-particle field — tiny glowing dust motes that drift upward.
 * Deterministic positions (no Math.random at render) so no hydration mismatch.
 * Uses the `particle-float` CSS keyframe; suppressed by `prefers-reduced-motion`.
 *
 * Usage:
 *   <FloatingParticles count={8} color="rgba(255,214,10,0.7)" />
 *
 * The parent element needs `position: relative` and `overflow-hidden`.
 */
"use client"

import { useMemo }     from "react"
import { cn }          from "@/lib/utils"

interface Particle {
  x:        string
  y:        string
  size:     number
  duration: string
  delay:    string
}

/* 12 fixed seed positions — pick the first `count` */
const SEED_POSITIONS = [
  { x: "12%",  y: "78%" },
  { x: "22%",  y: "52%" },
  { x: "33%",  y: "88%" },
  { x: "46%",  y: "65%" },
  { x: "58%",  y: "40%" },
  { x: "68%",  y: "72%" },
  { x: "76%",  y: "30%" },
  { x: "85%",  y: "58%" },
  { x: "92%",  y: "82%" },
  { x: "5%",   y: "35%" },
  { x: "38%",  y: "20%" },
  { x: "55%",  y: "90%" },
] as const

interface FloatingParticlesProps {
  count?:  number
  color?:  string
  zIndex?: number
  className?: string
}

export function FloatingParticles({
  count    = 8,
  color    = "rgba(255,214,10,0.65)",
  zIndex   = 2,
  className,
}: FloatingParticlesProps) {
  const particles = useMemo<Particle[]>(
    () =>
      SEED_POSITIONS.slice(0, Math.min(count, SEED_POSITIONS.length)).map(
        (pos, i) => ({
          x:        pos.x,
          y:        pos.y,
          size:     i % 3 === 0 ? 2.5 : i % 3 === 1 ? 1.5 : 2,
          duration: `${9 + i * 2.3}s`,
          delay:    `${-i * 1.8}s`,
        })
      ),
    [count]
  )

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ zIndex }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full anim-particle"
          style={{
            left:            p.x,
            top:             p.y,
            width:           `${p.size}px`,
            height:          `${p.size}px`,
            backgroundColor: color,
            boxShadow:       `0 0 ${p.size * 4}px ${color}`,
            animation:       `particle-float ${p.duration} ease-in-out infinite`,
            animationDelay:  p.delay,
            /*
             * willChange removed: each hint promotes the element to its own
             * compositor layer, costing GPU memory. For tiny 2–3px particles
             * the CSS animation engine handles transform/opacity natively without
             * explicit promotion. Let the browser decide — it makes better choices
             * than blanket willChange on every particle.
             */
          }}
        />
      ))}
    </div>
  )
}


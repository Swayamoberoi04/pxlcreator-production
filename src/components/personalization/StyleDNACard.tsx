"use client"

/**
 * StyleDNACard.tsx
 *
 * Compact, reusable Style DNA identity card.
 * Used on the dashboard header and anywhere DNA needs to surface.
 *
 * Variants:
 *  - "full"    — large card with tagline + archetypes + accent bar
 *  - "compact" — pill badge with dot + title only
 */

import { motion } from "framer-motion"
import { cn }     from "@/lib/utils"
import type { StyleDNA } from "@/types/onboarding"

interface StyleDNACardProps {
  dna:       StyleDNA
  variant?:  "full" | "compact"
  className?: string
}

export function StyleDNACard({ dna, variant = "full", className }: StyleDNACardProps) {
  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1",
          "text-[0.75rem] font-bold tracking-widest uppercase",
          className
        )}
        style={{ borderColor: `${dna.primaryColor}50`, color: dna.primaryColor }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ background: dna.primaryColor }}
        />
        {dna.badge}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gold/20",
        "bg-gradient-to-br from-black via-zinc-950 to-black p-6",
        "shadow-[0_0_40px_rgba(255,214,10,0.08)]",
        className
      )}
    >
      {/* Ambient glow from DNA primary colour */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 30% 0%, ${dna.primaryColor}50, transparent 65%)`,
        }}
      />

      {/* Film grain texture */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Badge row */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-bold tracking-widest uppercase"
            style={{ borderColor: `${dna.primaryColor}60`, color: dna.primaryColor }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: dna.primaryColor }} />
            Style DNA — {dna.badge}
          </span>

          {/* Decorative category dots */}
          <div className="flex gap-1">
            {dna.topCategories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="h-1.5 w-1.5 rounded-full opacity-50"
                style={{ background: dna.primaryColor }}
              />
            ))}
          </div>
        </div>

        {/* Title + tagline */}
        <div>
          <h3 className="font-display font-bold text-[1.25rem] leading-tight text-white">
            {dna.title}
          </h3>
          <p className="mt-1.5 text-[0.8125rem] text-white/85 leading-relaxed">
            {dna.tagline}
          </p>
        </div>

        {/* Archetype chips */}
        <div className="flex flex-wrap gap-1.5">
          {dna.archetypes.map((arch) => (
            <span
              key={arch}
              className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium text-white/85 border border-white/10"
            >
              {arch}
            </span>
          ))}
        </div>

        {/* Animated accent bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          style={{ originX: 0, background: `linear-gradient(90deg, ${dna.primaryColor}, transparent)` }}
          className="h-px w-full"
        />
      </div>
    </motion.div>
  )
}


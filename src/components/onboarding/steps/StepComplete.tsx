"use client"

import { motion }  from "framer-motion"
import Link        from "next/link"
import { cn }      from "@/lib/utils"
import type { StyleDNA, PersonalizedSection } from "@/types/onboarding"

interface Props {
  dna:         StyleDNA | null
  sections:    PersonalizedSection[]
  onClose:     () => void
}

export function StepComplete({ dna, sections, onClose }: Props) {
  if (!dna) return null

  const topSections = sections.slice(0, 2)

  return (
    <div className="flex flex-col items-center gap-8 py-2">

      {/* ── DNA card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 32 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="relative w-full max-w-sm mx-auto"
      >
        <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-black via-zinc-950 to-black p-7 shadow-[0_0_60px_rgba(255,215,0,0.12)]">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${dna.primaryColor}40, transparent 70%)`,
            }}
          />

          {/* Grain */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative z-10 flex flex-col gap-5">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.75rem] font-bold tracking-widest uppercase"
                style={{ borderColor: `${dna.primaryColor}60`, color: dna.primaryColor }}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: dna.primaryColor }} />
                Style DNA — {dna.badge}
              </span>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h3 className="font-display font-black text-[1.375rem] leading-tight text-white">
                {dna.title}
              </h3>
              <p className="mt-2 text-[0.875rem] text-white/60 leading-relaxed">
                {dna.tagline}
              </p>
            </motion.div>

            {/* Archetypes */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap gap-2"
            >
              {dna.archetypes.map((arch) => (
                <span
                  key={arch}
                  className="rounded-full px-2.5 py-1 text-[0.7rem] font-medium text-white/50 border border-white/10"
                >
                  {arch}
                </span>
              ))}
            </motion.div>

            {/* Gold accent line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              style={{ originX: 0, background: `linear-gradient(90deg, ${dna.primaryColor}, transparent)` }}
              className="h-px w-full"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Top recommendations preview ── */}
      {topSections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full"
        >
          <p className="text-center text-[0.8125rem] text-muted/50 mb-4">
            Your personalised recommendations are ready
          </p>
          <div className="flex flex-col gap-2">
            {topSections.slice(0, 1).map((section) =>
              section.items.slice(0, 3).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <span className="text-[0.875rem]">
                    {item.type === "preset-bundle" ? "◈" :
                     item.type === "lut-pack"      ? "◉" :
                     item.type === "tutorial"      ? "▷" :
                     item.type === "challenge"     ? "✦" : "⬡"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.875rem] font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-[0.75rem] text-muted truncate">{item.description}</p>
                  </div>
                  {item.badge && (
                    <span className="text-[0.65rem] font-bold tracking-wider text-gold bg-gold/10 border border-gold/20 rounded-full px-2 py-0.5 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* ── CTA buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 w-full"
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View My Dashboard
          <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-[0.9375rem] font-medium text-muted hover:text-foreground hover:border-gold/30 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Explore the Store
        </button>
      </motion.div>
    </div>
  )
}

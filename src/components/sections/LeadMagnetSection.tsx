"use client"

/**
 * LeadMagnetSection — Free cinematic preset email capture.
 *
 * Placed between PhilosophyStrip and CTABanner on the homepage.
 * Calls /api/email/subscribe and shows a download link when the
 * NEXT_PUBLIC_FREE_PRESET_URL env var is set.
 */

import { motion }        from "framer-motion"
import { NewsletterForm } from "@/components/layout/NewsletterForm"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }       from "@/components/ui/GrainOverlay"

const BENEFITS = [
  "1 Cinematic Mobile Preset — free forever",
  "No subscription. No catch. No DSLR required.",
  "XMP + DNG — works in Lightroom Mobile & Desktop",
]

export function LeadMagnetSection() {
  return (
    <section className="relative overflow-hidden border-y border-border py-20 px-4">
      <LuminousEnvironment variant="gold" intensity={0.5} />
      <GrainOverlay opacity={0.015} zIndex={1} />

      <div className="relative z-10 mx-auto max-w-2xl text-center flex flex-col items-center gap-6">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          className="flex items-center gap-3"
        >
          <span className="h-px w-6 bg-gold/50" aria-hidden />
          <span className="text-[0.65rem] font-bold uppercase tracking-widest text-gold/70">
            Free Preset — No Card Required
          </span>
          <span className="h-px w-6 bg-gold/50" aria-hidden />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.07 }}
          className="font-display font-black text-[2rem] sm:text-[2.5rem] leading-[1.05] text-foreground"
        >
          Try It Before You Buy.
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            One Preset. Free. Forever.
          </span>
        </motion.h2>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1], delay: 0.12 }}
          className="text-[0.9375rem] text-muted/85 leading-relaxed"
        >
          Get our cinematic starter preset — the same visual system used across PXL packs —
          delivered to your inbox in under 60 seconds.
        </motion.p>

        {/* Benefit list */}
        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6"
        >
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-[0.8rem] text-muted/85">
              <span className="h-1 w-1 rounded-full bg-gold/60 shrink-0" aria-hidden />
              {b}
            </li>
          ))}
        </motion.ul>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1], delay: 0.22 }}
          className="w-full max-w-md"
        >
          <NewsletterForm
            source="homepage_lead_magnet"
            ctaLabel="Send Me the Free Preset"
            placeholder="your@email.com"
          />
        </motion.div>

        {/* Micro-trust */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="text-[0.72rem] text-muted/70"
        >
          No spam. Unsubscribe anytime. We send presets — not newsletters.
        </motion.p>

      </div>
    </section>
  )
}

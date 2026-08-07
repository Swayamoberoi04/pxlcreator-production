"use client"

/**
 * src/components/sections/FAQSection.tsx
 *
 * Fully DB-driven — content comes from the "faq" row's `title`/`subtitle`/
 * `items` (see src/lib/homepage/repository.ts). Renders nothing if there
 * are no items, so an empty admin-managed FAQ doesn't leave a blank block.
 */

import { useState } from "react"
import { Container } from "@/components/layout/Container"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

interface FAQItem {
  title?: string    // question
  subtitle?: string // answer
}

interface FAQSectionProps {
  title?: string | null
  subtitle?: string | null
  items: FAQItem[]
}

export function FAQSection({ title, subtitle, items }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  if (items.length === 0) return null

  return (
    <section className="relative w-full border-y border-border overflow-hidden depth-section">
      <Container className="relative z-10 py-20 sm:py-28">
        <CinematicReveal variant="rise">
          <div className="flex flex-col items-center text-center gap-4 mb-12 sm:mb-14">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-widest">FAQ</span>
              <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
            </div>
            <h2 className="font-display font-bold text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] tracking-tight text-foreground">
              {title || "Questions, Answered"}
            </h2>
            {subtitle && <p className="text-[0.9375rem] text-muted/85 max-w-md">{subtitle}</p>}
          </div>
        </CinematicReveal>

        <CinematicStagger stagger={0.06} baseDelay={0.02} itemVariant="rise" className="max-w-2xl mx-auto flex flex-col gap-3">
          {items.map((item, i) => {
            const open = openIndex === i
            return (
              <CinematicItem key={i} variant="rise">
                <div className="rounded-2xl border border-border bg-surface/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-[0.9375rem] font-semibold text-foreground">{item.title}</span>
                    <span className={`shrink-0 text-gold transition-transform duration-200 ${open ? "rotate-45" : ""}`} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </span>
                  </button>
                  {open && item.subtitle && (
                    <p className="px-5 pb-4 text-[0.875rem] text-muted/80 leading-relaxed">{item.subtitle}</p>
                  )}
                </div>
              </CinematicItem>
            )
          })}
        </CinematicStagger>
      </Container>
    </section>
  )
}

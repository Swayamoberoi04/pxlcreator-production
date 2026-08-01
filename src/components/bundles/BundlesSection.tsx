/**
 * src/components/bundles/BundlesSection.tsx
 *
 * Homepage section — "Creator Bundles".
 * Server component: fetches featured bundles server-side, passes to client BundleGrid.
 *
 * Position in page.tsx: between FeaturedSection and ManifestoSection,
 * so visitors see bundles immediately after the featured presets hook.
 */

import Link                    from "next/link"
import { Container }           from "@/components/layout/Container"
import { getFeaturedBundles }  from "@/lib/bundles/repository"
import { BundleGrid }          from "./BundleGrid"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export async function BundlesSection() {
  const bundles = await getFeaturedBundles(4)

  if (bundles.length === 0) return null

  return (
    <section
      aria-label="Creator bundles"
      className="relative w-full bg-background border-t border-border py-24 sm:py-32 overflow-hidden depth-section"
    >
      <LuminousEnvironment variant="gold" intensity={0.55} />
      <GrainOverlay opacity={0.015} zIndex={1} />

      <Container className="relative z-10">

        {/* ── Section header ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
          <div className="flex flex-col gap-3">
            {/* Eyebrow */}
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-[0.2em]">Creator Bundles</span>
            </div>

            {/* Heading */}
            <h2 className="font-display text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.08] tracking-tight text-foreground">
              Save more.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Create more.
              </span>
            </h2>

            {/* Sub-heading */}
            <p className="text-[0.9375rem] text-muted/85 max-w-md leading-relaxed">
              Curated collections at 60–74% off individual pack prices.
            </p>
          </div>

          {/* "View all" CTA — desktop only (repeated below on mobile) */}
          <Link
            href="/bundles"
            className="hidden sm:inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-muted/85 hover:text-gold transition-colors whitespace-nowrap"
          >
            View all bundles
            <ArrowRightIcon />
          </Link>
        </div>

        {/* ── Bundle grid ────────────────────────────── */}
        <BundleGrid bundles={bundles} />

        {/* ── Mobile CTA ─────────────────────────────── */}
        <div className="mt-10 flex justify-center sm:hidden">
          <Link
            href="/bundles"
            className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-surface-2 px-7 py-3 text-[0.9375rem] font-semibold text-muted/92 hover:border-gold/30 hover:text-foreground transition-all duration-200"
          >
            View all bundles
            <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
    </section>
  )
}

/* ── Icon ───────────────────────────────────────────────── */

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}



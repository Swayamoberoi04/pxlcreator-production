/**
 * src/components/sections/FooterPromoSection.tsx
 *
 * Fully DB-driven — a promotional strip rendered just above the site
 * footer, from the "footer_promo" homepage_sections row. Scoped to the
 * homepage (not the global SiteFooter component) since this is a
 * homepage-section requirement, not sitewide footer chrome.
 */

import Link from "next/link"

interface FooterPromoSectionProps {
  title?:      string | null
  subtitle?:   string | null
  ctaLabel?:   string | null
  ctaHref?:    string | null
}

export function FooterPromoSection({ title, subtitle, ctaLabel, ctaHref }: FooterPromoSectionProps) {
  if (!title) return null

  return (
    <section className="w-full bg-surface border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-14 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display font-bold text-[1.25rem] text-foreground">{title}</h3>
          {subtitle && <p className="text-[0.9375rem] text-muted/80">{subtitle}</p>}
        </div>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-[0.9375rem] font-semibold text-background hover:bg-gold-dim active:scale-[0.97] transition-all"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  )
}

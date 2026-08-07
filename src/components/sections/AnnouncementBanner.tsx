/**
 * src/components/sections/AnnouncementBanner.tsx
 *
 * Fully DB-driven top-of-page strip — content comes from the
 * "announcement_banner" row (see src/lib/homepage/repository.ts). Off by
 * default (migration 034 seeds it disabled) since it's meant for
 * time-boxed announcements the admin turns on/off and schedules.
 */

import Link from "next/link"

interface AnnouncementBannerProps {
  title?: string | null
  subtitle?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
}

export function AnnouncementBanner({ title, subtitle, ctaLabel, ctaHref }: AnnouncementBannerProps) {
  if (!title) return null

  return (
    <div className="w-full bg-gold/[0.07] border-b border-gold/15">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center">
        <span className="text-[0.8125rem] font-semibold text-foreground">{title}</span>
        {subtitle && <span className="text-[0.8125rem] text-muted/80">{subtitle}</span>}
        {ctaLabel && ctaHref && (
          <Link href={ctaHref} className="text-[0.8125rem] font-semibold text-gold hover:text-gold-dim transition-colors underline underline-offset-2">
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

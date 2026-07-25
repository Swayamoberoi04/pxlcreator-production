import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-[4rem] font-black leading-none text-gold/80">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[1.5rem] font-bold text-foreground">This page doesn&apos;t exist</h1>
        <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted/92">
          The page you&apos;re looking for may have moved or never existed. Explore our presets instead.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/presets"
          className="rounded-full bg-gold px-6 py-2.5 text-[0.875rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Browse presets
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-6 py-2.5 text-[0.875rem] font-medium text-foreground transition-colors hover:border-gold/40 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}

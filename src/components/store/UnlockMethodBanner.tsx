/**
 * UnlockMethodBanner
 *
 * Premium notice explaining the two ways to access presets.
 * Used on the Store page and individual preset detail pages.
 * Server component — no client-side JS needed.
 */

interface UnlockMethodBannerProps {
  variant?: "store" | "detail"
}

export function UnlockMethodBanner({ variant = "store" }: UnlockMethodBannerProps) {
  return (
    <div className="relative rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] via-surface/80 to-background overflow-hidden">

      {/* Subtle corner glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />

      <div className="relative px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">

        {/* Icon */}
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
          <KeyIcon />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1 flex-1">
          <p className="text-[0.875rem] font-semibold text-foreground leading-snug">
            {variant === "detail"
              ? "Two ways to access this preset"
              : "Two ways to access every preset"}
          </p>
          <p className="text-[0.8rem] text-muted/65 leading-relaxed max-w-2xl">
            <span className="text-foreground/80 font-medium">Buy instantly</span> for permanent access and to support PXL Creator
            {" "}—{" "}
            or{" "}
            <span className="text-gold/90 font-medium">unlock free</span> using the password hidden inside our YouTube tutorials.
            Both options give you the same full download.
          </p>
        </div>

        {/* Two method chips */}
        <div className="flex gap-2.5 sm:shrink-0">
          <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gold/20 bg-gold/[0.06]">
            <CartMiniIcon />
            <span className="text-[0.65rem] font-bold tracking-wide text-gold/80 uppercase text-center leading-tight whitespace-nowrap">Buy Now</span>
          </div>
          <div className="flex items-center self-center text-muted/30 text-[0.7rem] font-medium">or</div>
          <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05]">
            <YoutubeMiniIcon />
            <span className="text-[0.65rem] font-bold tracking-wide text-emerald-400/80 uppercase text-center leading-tight whitespace-nowrap">YouTube</span>
          </div>
        </div>

      </div>

      {/* Bottom trust row */}
      <div className="border-t border-gold/10 px-5 sm:px-6 py-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          { icon: <CheckMiniIcon />, label: "Instant access after purchase" },
          { icon: <CheckMiniIcon />, label: "Lifetime ownership" },
          { icon: <CheckMiniIcon />, label: "Free YouTube unlock option" },
          { icon: <CheckMiniIcon />, label: ".xmp + .dng formats included" },
          { icon: <CheckMiniIcon />, label: "Compatible: Lightroom Classic, CC & Camera Raw" },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-emerald-400/80">{icon}</span>
            <span className="text-[0.72rem] text-muted/55">{label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

/* ── Icons ── */
function KeyIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>
}
function CartMiniIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
}
function YoutubeMiniIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/></svg>
}
function CheckMiniIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}

import Link from "next/link"
import { Container }        from "@/components/layout/Container"
import { MobileNav }        from "@/components/layout/MobileNav"
import { NavLinks }         from "@/components/layout/NavLinks"
import { CartButton }       from "@/components/cart/CartButton"
import { NavAuthButtons }   from "@/components/auth/NavAuthButtons"
import { CurrencyToggle }   from "@/components/currency/CurrencyToggle"
import { HeaderScrollState } from "@/components/layout/HeaderScrollState"

export function SiteHeader() {
  return (
    <header
      className="
        sticky top-0 z-50 w-full
        bg-black/30 backdrop-blur-2xl
        transition-[background-color,backdrop-filter,border-color] duration-500
        header-glass
      "
    >
      {/* ── Scroll-state client observer (zero-render) ── */}
      <HeaderScrollState />

      {/* ── Cinematic top accent line ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px
          bg-gradient-to-r from-transparent via-gold/35 to-transparent"
      />

      <Container>
        <div className="flex h-14 items-center justify-between gap-6">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-0.5
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring rounded-sm"
          >
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-foreground/90 uppercase
              transition-colors duration-300 group-hover:text-foreground">
              PXL
            </span>
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-gold logo-glow uppercase
              transition-all duration-300
              group-hover:text-shadow-[0_0_20px_rgba(255,215,0,1)]">
              &nbsp;CREATOR
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <NavLinks />

          {/* ── Right actions ── */}
          <div className="flex items-center gap-2">
            <CurrencyToggle />
            <NavAuthButtons />
            <CartButton />
            <MobileNav />
          </div>

        </div>
      </Container>

      {/* ── Bottom cinematic rule ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px
          bg-gradient-to-r from-transparent via-gold/20 to-transparent
          transition-opacity duration-500 header-border-bottom"
      />
    </header>
  )
}

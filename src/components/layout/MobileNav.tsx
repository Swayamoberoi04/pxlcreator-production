"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { EXPLORE_ITEMS } from "@/components/layout/NavLinks"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

/* Top-level links that appear before the Explore section */
const TOP_LINKS = [
  { label: "Presets", href: "/presets", highlight: false },
  { label: "Bundles", href: "/bundles", highlight: false },
  { label: "Premium", href: "/premium", highlight: true  },
]

/* Bottom links — intentionally empty; About & Contact live in EXPLORE_ITEMS above */
const BOTTOM_LINKS: { label: string; href: string }[] = []

export function MobileNav() {
  const [open, setOpen]       = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef            = useRef<HTMLButtonElement>(null)
  const drawerRef             = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  /*
   * The drawer + backdrop are rendered through a portal into document.body.
   * This is REQUIRED: the site header uses `backdrop-blur` (backdrop-filter),
   * which establishes a containing block for position:fixed descendants.
   * Without the portal, the fixed drawer resolves inset-y-0 against the 56px
   * header instead of the viewport — collapsing it to a 56px sliver and
   * breaking mobile navigation entirely. Portalling to <body> escapes that.
   */
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  /* Close drawer on route change */
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false) }, [pathname])

  /* Lock body scroll while drawer is open — html element for Lenis compatibility */
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = "hidden"
    } else {
      document.documentElement.style.overflow = ""
    }
    return () => { document.documentElement.style.overflow = "" }
  }, [open])

  /* Close on Escape key */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false)
  }, [])
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  /* Focus management (WCAG 2.2 — modal dialog):
     move focus into the drawer on open, restore it to the trigger on close.
     `wasOpen` prevents stealing focus to the trigger on the initial mount. */
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) {
      wasOpen.current = true
      /* Wait a frame so the portalled drawer is in the DOM before focusing. */
      const id = requestAnimationFrame(() => {
        const first = drawerRef.current?.querySelector<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        )
        first?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
    if (wasOpen.current) {
      wasOpen.current = false
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <>
      {/* ── Hamburger trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen((v) => !v)}
        suppressHydrationWarning
        className="md:hidden flex items-center justify-center h-11 w-11 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Drawer + backdrop are portalled to <body> to escape the header's
          backdrop-filter containing block (see note at top of component). */}
      {mounted && createPortal(
      <AnimatePresence>
        {/* ── Backdrop ── */}
        {open && (
          <motion.div
            key="backdrop"
            aria-hidden="true"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          />
        )}

        {/* ── Drawer panel ── */}
        {open && (
        <motion.div
          key="drawer"
          ref={drawerRef}
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col",
            "bg-surface/95 backdrop-blur-2xl border-l border-border/60",
            "pt-[env(safe-area-inset-top)]",
            "shadow-[-24px_0_80px_rgba(0,0,0,0.6)] md:hidden"
          )}
        >

        {/* ── Drawer header ── */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="font-display text-[1rem] font-bold tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <span className="text-foreground/90">PXL </span>
            <span className="text-gold logo-glow">CREATOR</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="-mr-2 flex items-center justify-center h-11 w-11 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Nav links ── */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto" aria-label="Mobile navigation">

          {/* Top links: Presets, Bundles, Premium */}
          {TOP_LINKS.map((item) => (
            <MobileLink
              key={item.href}
              href={item.href}
              label={item.label}
              pathname={pathname}
              onClose={() => setOpen(false)}
              highlight={item.highlight}
            />
          ))}

          {/* ── Explore section ── */}
          <div className="mt-3 mb-1 px-3">
            <span className="text-label text-muted/85 tracking-widest">Explore</span>
          </div>
          {EXPLORE_ITEMS.map((item) => (
            <MobileLink
              key={item.label}
              href={item.href}
              label={item.label}
              pathname={pathname}
              onClose={() => setOpen(false)}
              indent
            />
          ))}

          {/* Divider + extra links (reserved for future use) */}
          {BOTTOM_LINKS.length > 0 && (
            <>
              <div className="my-2 mx-3 h-px bg-border" aria-hidden="true" />
              {BOTTOM_LINKS.map((item) => (
                <MobileLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  pathname={pathname}
                  onClose={() => setOpen(false)}
                />
              ))}
            </>
          )}

        </nav>

        {/* ── Drawer footer ── */}
        <div className="p-4 border-t border-border shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Link
            href="/store"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-full rounded-xl bg-gold py-3.5 text-sm font-semibold text-background transition-colors hover:bg-gold-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse Store
          </Link>
          <div className="flex items-center justify-center gap-2 mt-3">
            <a href={siteConfig.socials.youtube}   target="_blank" rel="noopener noreferrer" aria-label="YouTube"   className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-gold hover:bg-surface-2 transition-colors"><YouTubeIcon /></a>
            <a href={siteConfig.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-gold hover:bg-surface-2 transition-colors"><InstagramIcon /></a>
            <a href={siteConfig.socials.email}     aria-label="Email"     className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-gold hover:bg-surface-2 transition-colors"><EmailIcon /></a>
          </div>
        </div>

        </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  )
}

/* ── Individual mobile nav link ── */
function MobileLink({
  href, label, pathname, onClose, indent, highlight,
}: {
  href: string; label: string; pathname: string; onClose: () => void; indent?: boolean; highlight?: boolean
}) {
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg py-3.5 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        indent ? "px-5" : "px-3",
        highlight && !isActive
          ? "text-gold/80 hover:text-gold hover:bg-gold/5"
          : isActive
          ? "bg-gold/8 text-gold"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
      )}
      {label}
    </Link>
  )
}

/* ── Icons ── */
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="2" y1="5"  x2="16" y2="5"  />
      <line x1="2" y1="9"  x2="16" y2="9"  />
      <line x1="2" y1="13" x2="16" y2="13" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  )
}
function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.6 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.5 15.5V8.5l6.3 3.5-6.3 3.5z"/>
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  )
}

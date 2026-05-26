"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────
   Navigation data
   Explore items are referenced by both
   NavLinks (dropdown) and MobileNav (flat).
───────────────────────────────────────── */
export const EXPLORE_ITEMS = [
  { label: "Store",      href: "/store"    },
  { label: "Bundles",    href: "/bundles"  },
  { label: "AI Studio",  href: "/studio"   },
  { label: "Blog",       href: "/blog"     },
  { label: "E-Learning", href: "/courses"  },
  { label: "FAQ",        href: "/faq"      },
  { label: "Giveaway",   href: "/giveaway" },
] as const

type SimpleItem    = { type: "link";     label: string; href: string }
type DropdownItem  = { type: "dropdown"; label: string; items: readonly { label: string; href: string }[] }
type NavItemConfig = SimpleItem | DropdownItem

const NAV_ITEMS: NavItemConfig[] = [
  { type: "link",     label: "Home",    href: "/"        },
  { type: "link",     label: "Presets", href: "/presets" },
  { type: "link",     label: "Bundles", href: "/bundles" },
  { type: "dropdown", label: "Explore", items: EXPLORE_ITEMS },
  { type: "link",     label: "About",   href: "/about"   },
  { type: "link",     label: "Contact", href: "/contact" },
]

/* ─────────────────────────────────────────
   NavLinks — desktop only (hidden on <md)
───────────────────────────────────────── */
export function NavLinks() {
  const pathname = usePathname()
  const [openKey, setOpenKey]   = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Close on route change */
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpenKey(null) }, [pathname])

  /* Close on outside click */
  useEffect(() => {
    const handler = () => setOpenKey(null)
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  const open  = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenKey(key)
  }
  const close = () => {
    closeTimer.current = setTimeout(() => setOpenKey(null), 120)
  }

  const exploreActive = EXPLORE_ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  )

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">

      {NAV_ITEMS.map((item) => {

        /* ── Simple link ── */
        if (item.type === "link") {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide rounded-md",
                "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-gold text-glow-gold"
                  : "text-muted/70 hover:text-foreground"
              )}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -bottom-px h-px w-4 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_6px_2px_rgba(255,215,0,0.5)]"
                />
              )}
            </Link>
          )
        }

        /* ── Dropdown ── */
        const isOpen   = openKey === item.label
        const isActive = exploreActive

        return (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => open(item.label)}
            onMouseLeave={close}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              suppressHydrationWarning
              className={cn(
                "relative flex items-center gap-1 px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide rounded-md",
                "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive || isOpen
                  ? "text-gold text-glow-gold"
                  : "text-muted/70 hover:text-foreground"
              )}
            >
              {item.label}
              <ChevronDown open={isOpen} />
              {isActive && !isOpen && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -bottom-px h-px w-4 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_6px_2px_rgba(255,215,0,0.5)]"
                />
              )}
            </button>

            {/* ── Dropdown panel — Framer Motion AnimatePresence ── */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  role="listbox"
                  aria-label={`${item.label} submenu`}
                  initial={{ opacity: 0, y: -6, scaleY: 0.94 }}
                  animate={{ opacity: 1, y: 0,  scaleY: 1    }}
                  exit={{    opacity: 0, y: -4,  scaleY: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ originY: 0, originX: 0 }}
                  className={cn(
                    "absolute top-full left-0 mt-2 w-48 overflow-hidden rounded-xl",
                    "border border-border/70 bg-surface/95 backdrop-blur-xl",
                    "shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,215,0,0.04)]"
                  )}
                >
                  {/* Top glow line */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent"
                  />

                  <ul className="py-1.5">
                    {item.items.map((sub) => {
                      const subActive = pathname === sub.href
                      return (
                        <li key={sub.label} role="option" aria-selected={subActive}>
                          <Link
                            href={sub.href}
                            className={cn(
                              "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                              subActive
                                ? "text-gold bg-gold/8"
                                : "text-muted hover:text-foreground hover:bg-surface-2"
                            )}
                          >
                            {subActive && (
                              <span className="h-1 w-1 rounded-full bg-gold shrink-0" aria-hidden="true" />
                            )}
                            {sub.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )
      })}

    </nav>
  )
}

/* ── Chevron icon with open/close rotation ── */
function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("mt-px shrink-0 transition-transform duration-200", open && "rotate-180")}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

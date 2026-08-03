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
  { label: "AI Studio",  href: "/studio"   },
  { label: "Courses",    href: "/courses"  },
  { label: "Blog",       href: "/blog"     },
  { label: "Giveaway",   href: "/giveaway" },
  { label: "FAQ",        href: "/faq"      },
  { label: "About",      href: "/about"    },
  { label: "Contact",    href: "/contact"  },
] as const

export const COMMUNITY_ITEMS = [
  { label: "Community Hub",  href: "/community"             },
  { label: "Discover",       href: "/community/discover"    },
  { label: "Channels",       href: "/community/channels"    },
  { label: "Teams",          href: "/community/teams"       },
  { label: "Projects",       href: "/community/projects"    },
  { label: "Showcase",       href: "/community/showcase"    },
  { label: "Leaderboard",    href: "/community/leaderboard" },
] as const

type SimpleItem    = { type: "link";     label: string; href: string; highlight?: boolean }
type DropdownItem  = { type: "dropdown"; label: string; items: readonly { label: string; href: string }[]; highlightActive?: boolean }
type NavItemConfig = SimpleItem | DropdownItem

const NAV_ITEMS: NavItemConfig[] = [
  { type: "link",     label: "Presets",   href: "/presets"   },
  { type: "link",     label: "Community", href: "/community" },
  { type: "dropdown", label: "Explore",   items: EXPLORE_ITEMS },
  { type: "link",     label: "Premium",   href: "/premium", highlight: true },
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

          /* Premium gets a special gold badge treatment */
          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative px-3.5 py-1.5 text-[0.8125rem] font-semibold tracking-wide rounded-md",
                  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "text-gold text-glow-gold"
                    : "text-gold/80 hover:text-gold"
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -bottom-px h-px w-4 -translate-x-1/2 rounded-full bg-gold/60 shadow-[0_0_6px_2px_rgba(255,214,10,0.25)]"
                />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative px-3.5 py-1.5 text-[0.8125rem] font-medium tracking-wide rounded-md",
                "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-gold text-glow-gold"
                  : "text-muted/92 hover:text-foreground"
              )}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -bottom-px h-px w-4 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_6px_2px_rgba(255,214,10,0.5)]"
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
                "relative flex items-center gap-1 px-3.5 py-1.5 text-[0.8125rem] font-medium tracking-wide rounded-md",
                "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive || isOpen
                  ? "text-gold text-glow-gold"
                  : "text-muted/92 hover:text-foreground"
              )}
            >
              {item.label}
              <ChevronDown open={isOpen} />
              {isActive && !isOpen && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -bottom-px h-px w-4 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_6px_2px_rgba(255,214,10,0.5)]"
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
                    "shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,214,10,0.04)]"
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


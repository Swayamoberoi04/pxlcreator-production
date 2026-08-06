"use client"

import Link     from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn }   from "@/lib/utils"
import { useState } from "react"

interface NavItem {
  label: string
  href:  string
  icon:  React.ReactNode
  badge?: string | number
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href:  "/admin",
    icon:  <DashIcon />,
  },
  {
    label: "Import YouTube",
    href:  "/admin/import",
    icon:  <YoutubeIcon />,
  },
  {
    label: "Sync Channel",
    href:  "/admin/sync",
    icon:  <SyncIcon />,
  },
  {
    label: "Homepage",
    href:  "/admin/homepage",
    icon:  <HomepageIcon />,
  },
  {
    label: "Media Library",
    href:  "/admin/media",
    icon:  <MediaIcon />,
  },
  {
    label: "Presets",
    href:  "/admin/presets",
    icon:  <PresetIcon />,
  },
  {
    label: "Bundles",
    href:  "/admin/bundles",
    icon:  <BundleIcon />,
  },
  {
    label: "Pricing",
    href:  "/admin/pricing",
    icon:  <PriceIcon />,
  },
  {
    label: "Categories",
    href:  "/admin/categories",
    icon:  <CategoryIcon />,
  },
  {
    label: "Orders",
    href:  "/admin/orders",
    icon:  <OrdersIcon />,
  },
  {
    label: "Reviews",
    href:  "/admin/reviews",
    icon:  <ReviewsIcon />,
  },
  {
    label: "Coupons",
    href:  "/admin/coupons",
    icon:  <CouponIcon />,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch("/api/admin/auth", { method: "DELETE" })
      router.push("/admin/login")
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside className="flex flex-col w-[220px] shrink-0 h-full bg-[#0d0d0d] border-r border-white/[0.06]">

      {/* ── Logo ── */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gold/20 border border-gold/30 flex items-center justify-center">
            <span className="text-gold text-[0.65rem] font-bold">PXL</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.8125rem] font-bold text-white/90 leading-none">PXL Creator</span>
            <span className="text-[0.625rem] text-white/70 tracking-widest mt-0.5">( Admin )</span>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto min-h-0">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40",
                isActive
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "text-white/70 hover:text-white/92 hover:bg-white/[0.04]"
              )}
            >
              <span className={cn("shrink-0", isActive ? "text-gold" : "text-white/70")}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-auto text-[0.65rem] font-bold bg-gold/20 text-gold rounded-full px-1.5 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pb-4 flex flex-col gap-1">
        <div className="h-px bg-white/[0.06] mb-2" />

        {/* Back to site */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] text-white/70 hover:text-white/92 transition-colors"
        >
          <ExternalIcon />
          View Site
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          suppressHydrationWarning
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] text-white/70 hover:text-red-400 transition-colors text-left focus-visible:outline-none"
        >
          <LogoutIcon />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

    </aside>
  )
}

/* ── Icons ── */
function DashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function YoutubeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
}
function PresetIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
}
function CategoryIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
function SyncIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
}
function PriceIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}
function ExternalIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
}
function LogoutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function OrdersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
}
function ReviewsIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/></svg>
}
function BundleIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function HomepageIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function MediaIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
}
function CouponIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}

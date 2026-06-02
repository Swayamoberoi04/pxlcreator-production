"use client"

import { useEffect, useState } from "react"
import Link                    from "next/link"
import { usePathname }         from "next/navigation"
import { useAuth }             from "@/contexts/AuthContext"

interface NavItem {
  href:  string
  label: string
  icon:  string
}

const NAV_ITEMS: NavItem[] = [
  { href: "/community",          label: "Hub",      icon: "🏠" },
  { href: "/community/discover", label: "Discover", icon: "🔍" },
  { href: "/community/channels", label: "Channels", icon: "💬" },
  { href: "/community/projects", label: "Projects", icon: "🚀" },
  { href: "/community/showcase", label: "Showcase", icon: "✨" },
  { href: "/community/events",   label: "Events",   icon: "🎉" },
]

function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function fetchUnread() {
      try {
        const token = await user!.getIdToken()
        const res   = await fetch("/api/community/notifications?unread=true", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setCount(data.count ?? data.notifications?.length ?? 0)
        }
      } catch { /* ignore */ }
    }
    void fetchUnread()
    return () => { cancelled = true }
  }, [user])

  return count
}

/** Desktop sidebar — 240 px column, hidden on mobile */
export function CommunitySidebar() {
  const pathname    = usePathname()
  const { user }    = useAuth()
  const unreadCount = useUnreadCount()

  function isActive(href: string) {
    if (href === "/community") return pathname === "/community"
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden md:flex flex-col gap-1 w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6">
      <p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-widest text-muted/40">
        Community
      </p>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={[
            "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-gold/10 text-gold"
              : "text-muted/70 hover:bg-surface-2 hover:text-foreground",
          ].join(" ")}
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span>{item.label}</span>
          {item.href === "/community" && unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      ))}

      {user && (
        <>
          <div className="my-3 h-px bg-border" />
          <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted/40">
            You
          </p>
          <Link
            href="/community/me"
            className={[
              "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              pathname === "/community/me"
                ? "bg-gold/10 text-gold"
                : "text-muted/70 hover:bg-surface-2 hover:text-foreground",
            ].join(" ")}
          >
            <span className="text-base leading-none">👤</span>
            <span>My Profile</span>
          </Link>
        </>
      )}
    </nav>
  )
}

/** Mobile horizontal scroll tabs — shown only on small screens */
export function CommunityMobileTabs() {
  const pathname    = usePathname()
  const { user }    = useAuth()
  const unreadCount = useUnreadCount()

  function isActive(href: string) {
    if (href === "/community") return pathname === "/community"
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden w-full overflow-x-auto border-b border-border bg-surface/80 backdrop-blur-xl sticky top-14 z-40">
      <div className="flex items-center gap-1 px-4 py-2 min-w-max">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive(item.href)
                ? "bg-gold/15 text-gold"
                : "text-muted/60 hover:bg-surface-2 hover:text-foreground",
            ].join(" ")}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.href === "/community" && unreadCount > 0 && (
              <span className="rounded-full bg-gold text-black text-[9px] font-bold px-1 py-0.5 min-w-[14px] text-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
        {user && (
          <Link
            href="/community/me"
            className={[
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              pathname === "/community/me"
                ? "bg-gold/15 text-gold"
                : "text-muted/60 hover:bg-surface-2 hover:text-foreground",
            ].join(" ")}
          >
            <span>👤</span>
            <span>My Profile</span>
          </Link>
        )}
      </div>
    </nav>
  )
}

/** Combined export — renders both (each handles its own visibility) */
export function CommunityNav() {
  return (
    <>
      <CommunityMobileTabs />
      <CommunitySidebar />
    </>
  )
}

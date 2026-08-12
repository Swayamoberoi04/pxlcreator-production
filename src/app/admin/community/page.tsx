"use client"

/**
 * src/app/admin/community/page.tsx
 *
 * Community moderation hub. Covers Posts, Comments, Showcase, Users
 * (ban/verify), and the Reports queue — see migration 039 for scope
 * notes on what's NOT covered yet (Channels, Projects, Teams, Spaces
 * messages — same pattern, straightforward follow-up).
 */

import Link from "next/link"
import { Breadcrumbs } from "@/components/admin/ui/Breadcrumbs"

const SECTIONS = [
  { href: "/admin/community/reports",  label: "Reports Queue", description: "User-flagged posts, comments, showcase items, and profiles awaiting review." },
  { href: "/admin/community/posts",    label: "Posts",         description: "Channel posts — pin, lock, hide, or delete." },
  { href: "/admin/community/comments", label: "Comments",      description: "Post replies — hide or delete." },
  { href: "/admin/community/showcase", label: "Showcase",      description: "Portfolio items — feature, hide, or delete." },
  { href: "/admin/community/users",    label: "Users",         description: "Community profiles — verify, ban, or unban." },
]

export default function CommunityModerationHub() {
  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[800px] mx-auto w-full">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Community" }]} />

      <div className="flex flex-col gap-1">
        <h1 className="text-[1.375rem] font-bold text-white/95">Community Moderation</h1>
        <p className="text-[0.8125rem] text-white/45">
          The Community section is a live social platform — this covers moderation of existing user content, not editing it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 hover:border-gold/25 transition-colors"
          >
            <p className="text-[0.875rem] font-medium text-white/85">{s.label}</p>
            <p className="text-[0.75rem] text-white/40">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

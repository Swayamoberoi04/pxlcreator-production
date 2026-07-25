/**
 * /admin — Dashboard home
 * Shows stats, quick actions, and recent presets.
 */

import type { Metadata } from "next"
import Link              from "next/link"
import { getPresetStats, getPresets } from "@/lib/presets/repository"

export const metadata: Metadata = { title: "Dashboard" }

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const [stats, recent] = await Promise.all([
    getPresetStats(),
    getPresets({ limit: 5, orderBy: "created_at", ascending: false, published: false }),
  ])

  const STAT_CARDS = [
    { label: "Total Presets",    value: stats.totalPresets,    color: "text-gold"         },
    { label: "Free Presets",     value: stats.freePresets,     color: "text-emerald-400"  },
    { label: "Featured",         value: stats.featuredPresets, color: "text-indigo-400"   },
    { label: "Categories",       value: stats.totalCategories, color: "text-white/92"     },
  ]

  const QUICK_ACTIONS = [
    { label: "Sync YouTube Channel",  href: "/admin/sync",       desc: "Import all channel videos at once" },
    { label: "Import from YouTube",  href: "/admin/import",     desc: "Paste a URL, auto-populate fields" },
    { label: "Manage Presets",       href: "/admin/presets",    desc: "Edit, publish, reorder presets"    },
    { label: "Manage Categories",    href: "/admin/categories", desc: "Add or rename preset categories"   },
    { label: "Download Analytics",   href: "/admin/downloads",  desc: "Downloads, revenue & trends per preset" },
    { label: "View Store",           href: "/store",            desc: "See how the store looks live"      },
  ]

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( PXL CREATOR ADMIN )</span>
        </div>
        <h1 className="font-display font-black text-[1.75rem] text-white/90">
          Dashboard
        </h1>
        <p className="text-[0.875rem] text-white/70">
          Manage your preset library and YouTube imports.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-2"
          >
            <span className={`font-display font-black text-[2rem] leading-none ${color}`}>
              {value}
            </span>
            <span className="text-[0.75rem] text-white/70 font-medium">
              ( {label} )
            </span>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[0.8125rem] text-white/70 tracking-widest">( Quick Actions )</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ label, href, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold/20 transition-all p-5"
            >
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[0.9375rem] font-semibold text-white/92 group-hover:text-gold transition-colors">
                  {label}
                </span>
                <span className="text-[0.8125rem] text-white/70">{desc}</span>
              </div>
              <span className="text-white/70 group-hover:text-gold/50 transition-colors shrink-0">→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent presets ── */}
      {recent.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[0.8125rem] text-white/70 tracking-widest">( Recent Presets )</h2>
            <Link href="/admin/presets" className="text-[0.8125rem] text-white/70 hover:text-gold transition-colors">
              View all →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {recent.map((preset, i) => (
              <div
                key={preset.id}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors ${i > 0 ? "border-t border-white/[0.06]" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[0.875rem] text-white/92 truncate">{preset.name}</p>
                  <p className="text-[0.75rem] text-white/70">{preset.category} · ${preset.price}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {preset.isFeatured && (
                    <span className="text-[0.65rem] text-gold bg-gold/10 rounded-full px-2 py-0.5">Featured</span>
                  )}
                  <Link
                    href={`/admin/presets/${preset.id}`}
                    className="text-[0.75rem] text-white/70 hover:text-gold transition-colors"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Setup status ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[0.8125rem] text-white/70 tracking-widest mb-4">( System Status )</h2>
        <div className="flex flex-col gap-2.5">
          {[
            { label: "Supabase URL",       configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co" },
            { label: "Supabase Anon Key",  configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
            { label: "Service Role Key",   configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
            { label: "YouTube API Key",    configured: !!process.env.YOUTUBE_API_KEY && !process.env.YOUTUBE_API_KEY.startsWith("your-") },
            { label: "Admin Password",     configured: !!process.env.ADMIN_PASSWORD },
          ].map(({ label, configured }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={configured ? "text-emerald-400" : "text-red-400/70"}>
                {configured ? "✓" : "○"}
              </span>
              <span className="text-[0.8125rem] text-white/85">{label}</span>
              <span className={`text-[0.75rem] ml-auto ${configured ? "text-emerald-400/70" : "text-white/70"}`}>
                {configured ? "configured" : "not set"}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

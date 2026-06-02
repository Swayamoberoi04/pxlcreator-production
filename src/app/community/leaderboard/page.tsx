"use client"

import { useEffect, useState } from "react"
import Link                    from "next/link"
import { useAuth }             from "@/contexts/AuthContext"
import { FollowButton }        from "@/components/community/FollowButton"
import type { CommunityProfile, UserEarnedBadge } from "@/types/community"

type LeaderboardType = "reputation" | "followers" | "showcases" | "posts"

interface LeaderboardEntry extends CommunityProfile {
  rank:   number
  score:  number
  badges: UserEarnedBadge[]
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 animate-pulse">
      <div className="size-8 w-8 rounded bg-surface-2" />
      <div className="size-10 rounded-full bg-surface-2 shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="h-3 w-32 rounded bg-surface-2" />
        <div className="h-3 w-20 rounded bg-surface-2" />
      </div>
      <div className="h-5 w-16 rounded bg-surface-2" />
    </div>
  )
}

const RANK_STYLES: Record<number, { wrapper: string; rank: string }> = {
  1: { wrapper: "border-gold/40 bg-gold/5",    rank: "text-gold font-black text-xl" },
  2: { wrapper: "border-slate-400/30 bg-slate-400/5", rank: "text-slate-400 font-black text-lg" },
  3: { wrapper: "border-amber-700/30 bg-amber-700/5", rank: "text-amber-600 font-black text-lg" },
}

export default function LeaderboardPage() {
  const { user }                          = useAuth()
  const [entries,  setEntries]            = useState<LeaderboardEntry[]>([])
  const [loading,  setLoading]            = useState(true)
  const [activeTab, setActiveTab]         = useState<LeaderboardType>("reputation")

  async function getHeaders(): Promise<Record<string, string>> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  async function fetchLeaderboard(type: LeaderboardType) {
    setLoading(true)
    try {
      const headers = await getHeaders()
      const res     = await fetch(`/api/community/leaderboard?type=${type}&limit=20`, { headers })
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries ?? data.leaderboard ?? data ?? [])
      }
    } catch { setEntries([]) } finally { setLoading(false) }
  }

  useEffect(() => { void fetchLeaderboard(activeTab) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeTab, user])

  const TABS: { id: LeaderboardType; label: string; icon: string }[] = [
    { id: "reputation", label: "Reputation", icon: "⭐" },
    { id: "followers",  label: "Followers",  icon: "👥" },
    { id: "showcases",  label: "Showcases",  icon: "✨" },
    { id: "posts",      label: "Posts",      icon: "📝" },
  ]

  function scoreLabel(type: LeaderboardType, score: number): string {
    const n = score?.toLocaleString() ?? "0"
    switch (type) {
      case "reputation": return `${n} rep`
      case "followers":  return `${n} followers`
      case "showcases":  return `${n} showcases`
      case "posts":      return `${n} posts`
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-black text-3xl text-foreground">Creator Leaderboard</h1>
        <p className="text-sm text-muted/60 mt-1">Top creators in the PXL community</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-surface border border-border p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === t.id
                ? "bg-gold/15 text-gold"
                : "text-muted/60 hover:text-foreground",
            ].join(" ")}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-4xl">🏆</span>
            <p className="font-semibold text-foreground">No data yet</p>
            <p className="text-sm text-muted/50">Be the first on the leaderboard</p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const rank     = entry.rank ?? idx + 1
            const style    = RANK_STYLES[rank]
            const initial  = (entry.display_name || entry.username || "?")[0].toUpperCase()
            return (
              <div
                key={entry.id}
                className={[
                  "flex items-center gap-4 rounded-2xl border bg-surface p-4 transition-colors hover:border-gold/20",
                  style?.wrapper ?? "border-border",
                ].join(" ")}
              >
                {/* Rank */}
                <span className={["w-8 text-center shrink-0", style?.rank ?? "text-muted/50 font-bold"].join(" ")}>
                  {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
                </span>

                {/* Avatar */}
                <Link href={`/community/${entry.username}`} className="shrink-0">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt={entry.display_name} className="size-11 rounded-full object-cover" />
                  ) : (
                    <span className="size-11 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-base">
                      {initial}
                    </span>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`/community/${entry.username}`} className="font-display font-black text-sm text-foreground hover:text-gold transition-colors truncate">
                      {entry.display_name}
                    </Link>
                    {entry.is_verified && <span className="text-gold text-xs">✓</span>}
                  </div>
                  <p className="text-xs text-muted/50">@{entry.username}</p>

                  {/* Roles */}
                  {entry.roles.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {entry.roles.slice(0, 2).map((r) => (
                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/60">
                          {r.replace(/-/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Badges */}
                {entry.badges?.length > 0 && (
                  <div className="hidden sm:flex gap-1 shrink-0">
                    {entry.badges.slice(0, 2).map((b) => (
                      <span key={b.id} title={b.badge?.name} className="text-base">{b.badge?.icon ?? "🏅"}</span>
                    ))}
                  </div>
                )}

                {/* Score */}
                <span className="text-sm font-bold text-gold shrink-0 hidden sm:block">
                  {scoreLabel(activeTab, entry.score)}
                </span>

                {/* Follow */}
                {user && user.uid !== entry.firebase_uid && (
                  <div className="shrink-0">
                    <FollowButton targetUid={entry.firebase_uid} initialFollowing={false} />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

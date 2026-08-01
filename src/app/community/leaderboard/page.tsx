"use client"

import { useEffect, useState } from "react"
import { motion }               from "framer-motion"
import Link                     from "next/link"
import { useAuth }              from "@/contexts/AuthContext"
import { FollowButton }         from "@/components/community/FollowButton"
import { CommunityFeaturePreview } from "@/components/community/CommunityFeaturePreview"
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
  1: { wrapper: "border-gold/40 bg-gold/5",           rank: "text-gold font-bold text-xl" },
  2: { wrapper: "border-slate-400/30 bg-slate-400/5", rank: "text-slate-400 font-bold text-lg" },
  3: { wrapper: "border-amber-700/30 bg-amber-700/5", rank: "text-amber-600 font-bold text-lg" },
}

// ── Mock leaderboard data shown when API returns empty ────────────
const MOCK_CREATORS = [
  { name: "Elena Cruz",   username: "elenacruz",   roles: ["photographer","cinematographer"], badge: "🏆", badgeLabel: "Elite Creator",   scores: { reputation: 8420, followers: 3200, showcases: 48, posts: 180 } },
  { name: "Yuki Tanaka",  username: "yukitanaka",  roles: ["filmmaker","editor"],             badge: "🏆", badgeLabel: "Elite Creator",   scores: { reputation: 7890, followers: 2900, showcases: 52, posts: 210 } },
  { name: "Marcus Bell",  username: "marcusbell",  roles: ["colorist","editor"],              badge: "⭐", badgeLabel: "Rising Talent",   scores: { reputation: 6750, followers: 2400, showcases: 34, posts: 156 } },
  { name: "Priya Sharma", username: "priyasharma", roles: ["photographer"],                   badge: "⭐", badgeLabel: "Rising Talent",   scores: { reputation: 5920, followers: 1900, showcases: 28, posts: 98  } },
  { name: "Jake Okonkwo", username: "jakeokonkwo", roles: ["filmmaker","vlogger"],            badge: "🔥", badgeLabel: "Top Contributor", scores: { reputation: 5100, followers: 1600, showcases: 22, posts: 320 } },
  { name: "Amara Diallo", username: "amaradiallo", roles: ["travel-photographer"],            badge: "🔥", badgeLabel: "Top Contributor", scores: { reputation: 4600, followers: 1500, showcases: 20, posts: 145 } },
  { name: "Chen Wei",     username: "chenwei",     roles: ["cinematographer"],                badge: "🔥", badgeLabel: "Top Contributor", scores: { reputation: 4100, followers: 1200, showcases: 18, posts: 89  } },
  { name: "Sofia Reyes",  username: "sofiareyes",  roles: ["editor","colorist"],              badge: "⭐", badgeLabel: "Rising Talent",   scores: { reputation: 3700, followers: 980,  showcases: 15, posts: 76  } },
  { name: "Omar Hassan",  username: "omarhassan",  roles: ["photographer"],                   badge: "🔥", badgeLabel: "Top Contributor", scores: { reputation: 3200, followers: 850,  showcases: 12, posts: 240 } },
  { name: "Isla McKay",   username: "islamckay",   roles: ["filmmaker"],                      badge: "⭐", badgeLabel: "Rising Talent",   scores: { reputation: 2900, followers: 720,  showcases: 10, posts: 68  } },
]

function MockLeaderboardRow({ creator, rank, type }: {
  creator: typeof MOCK_CREATORS[0]; rank: number; type: LeaderboardType
}) {
  const style   = RANK_STYLES[rank]
  const initial = creator.name[0].toUpperCase()
  const scoreMap: Record<LeaderboardType, number> = creator.scores
  const score    = scoreMap[type]

  const scoreStr = type === "reputation" ? `${score.toLocaleString()} rep`
    : type === "followers" ? `${score.toLocaleString()} followers`
    : type === "showcases" ? `${score} showcases`
    : `${score} posts`

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: rank * 0.04 }}
      className={["flex items-center gap-4 rounded-2xl border bg-surface p-4 transition-colors", style?.wrapper ?? "border-border"].join(" ")}>
      <span className={["w-8 text-center shrink-0", style?.rank ?? "text-muted/85 font-bold"].join(" ")}>
        {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : rank}
      </span>
      <span className="size-11 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-base shrink-0">
        {initial}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-display font-bold text-sm text-foreground truncate">{creator.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
            {creator.badge} {creator.badgeLabel}
          </span>
        </div>
        <p className="text-xs text-muted/85">@{creator.username}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {creator.roles.slice(0, 2).map((r) => (
            <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/85">
              {r.replace(/-/g, " ")}
            </span>
          ))}
        </div>
      </div>
      <span className="text-sm font-bold text-gold shrink-0 hidden sm:block">{scoreStr}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted/70 shrink-0 hidden md:block">Preview</span>
    </motion.div>
  )
}

export default function LeaderboardPage() {
  const { user }                   = useAuth()
  const [entries,   setEntries]    = useState<LeaderboardEntry[]>([])
  const [loading,   setLoading]    = useState(true)
  const [activeTab, setActiveTab]  = useState<LeaderboardType>("reputation")

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLeaderboard(activeTab)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

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

  const isEmpty = !loading && entries.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">Creator Leaderboard</h1>
        <p className="text-sm text-muted/85 mt-1">The top creators in the PXL ecosystem — ranked and celebrated</p>
      </div>

      {/* Badge legend */}
      <div className="flex flex-wrap gap-3">
        {[["🏆", "Elite Creator"], ["⭐", "Rising Talent"], ["🔥", "Top Contributor"]].map(([icon, label]) => (
          <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-surface">
            <span>{icon}</span>
            <span className="text-xs font-semibold text-muted/92">{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-surface border border-border p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={["flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors", activeTab === t.id ? "bg-gold/15 text-gold" : "text-muted/85 hover:text-foreground"].join(" ")}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
        ) : entries.length > 0 ? (
          entries.map((entry, idx) => {
            const rank    = entry.rank ?? idx + 1
            const style   = RANK_STYLES[rank]
            const initial = (entry.display_name || entry.username || "?")[0].toUpperCase()
            return (
              <div key={entry.id} className={["flex items-center gap-4 rounded-2xl border bg-surface p-4 transition-colors hover:border-gold/20", style?.wrapper ?? "border-border"].join(" ")}>
                <span className={["w-8 text-center shrink-0", style?.rank ?? "text-muted/85 font-bold"].join(" ")}>
                  {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : rank}
                </span>
                <Link href={`/community/${entry.username}`} className="shrink-0">
                  {entry.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.avatar_url} alt={entry.display_name} className="size-11 rounded-full object-cover" />
                  ) : (
                    <span className="size-11 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-base">{initial}</span>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`/community/${entry.username}`} className="font-display font-bold text-sm text-foreground hover:text-gold transition-colors truncate">{entry.display_name}</Link>
                    {entry.is_verified && <span className="text-gold text-xs">✓</span>}
                  </div>
                  <p className="text-xs text-muted/85">@{entry.username}</p>
                  {entry.roles.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {entry.roles.slice(0, 2).map((r) => (
                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/85">{r.replace(/-/g, " ")}</span>
                      ))}
                    </div>
                  )}
                </div>
                {entry.badges?.length > 0 && (
                  <div className="hidden sm:flex gap-1 shrink-0">
                    {entry.badges.slice(0, 2).map((b) => <span key={b.id} title={b.badge?.name} className="text-base">{b.badge?.icon ?? "🏅"}</span>)}
                  </div>
                )}
                <span className="text-sm font-bold text-gold shrink-0 hidden sm:block">{scoreLabel(activeTab, entry.score)}</span>
                {user && user.uid !== entry.firebase_uid && (
                  <div className="shrink-0"><FollowButton targetUid={entry.firebase_uid} initialFollowing={false} /></div>
                )}
              </div>
            )
          })
        ) : (
          /* Empty — show mock leaderboard */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/5 px-5 py-4 mb-2">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-display font-bold text-sm text-foreground">Official rankings launch soon</p>
                <p className="text-xs text-muted/85 mt-0.5">A preview of what the leaderboard will look like at launch</p>
              </div>
            </div>
            {MOCK_CREATORS.map((creator, idx) => (
              <MockLeaderboardRow key={creator.username} creator={creator} rank={idx + 1} type={activeTab} />
            ))}
          </motion.div>
        )}
      </div>

      {isEmpty && (
        <CommunityFeaturePreview
          variant="globe"
          featureKey="leaderboard"
          launch="Q3 2026"
          roadmap={[
            { quarter: "Q1 2026", label: "Reputation & scoring engine", done: true },
            { quarter: "Q2 2026", label: "Badge system & milestones", done: true },
            { quarter: "Q3 2026", label: "Live leaderboards open", done: false },
            { quarter: "Q4 2026", label: "Sponsored creator spotlight & rewards", done: false },
          ]}
          benefits={[
            "Your early activity counts toward your rank",
            "First badge recipients in the ecosystem",
            "Guaranteed Top 100 consideration at launch",
            "Sponsored creator spotlight opportunities",
          ]}
        />
      )}
    </div>
  )
}

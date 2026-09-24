"use client"

/**
 * /community/leaderboard — real creator rankings.
 *
 * Phase 5.7 audit fixed three things here:
 *  1. The page rendered 10 fabricated creators with invented reputation
 *     scores and badges whenever the API returned empty. That contradicted
 *     the whole point of Phase 5.6's transparent ranking.
 *  2. The "Reputation" tab sent type=reputation, which stopped being a valid
 *     type in Phase 5.6 (rank|followers|showcases|posts). The API silently
 *     fell back to rank, so the tab worked by accident under a wrong name.
 *  3. Rows read entry.score, but the API returns total_score for the rank
 *     tab and plain profile counts for the others — so every real row
 *     rendered "0". Real data looked broken while the fake data looked rich.
 */

import { useCallback, useEffect, useState } from "react"
import Link                     from "next/link"
import { useAuth }              from "@/contexts/AuthContext"
import { FollowButton }         from "@/components/community/FollowButton"

type LeaderboardType = "rank" | "followers" | "showcases" | "posts"

interface RankComponent {
  key: string
  label: string
  detail: string
  points: number
  max: number | null
}

interface LeaderboardEntry {
  rank:           number
  firebase_uid:   string
  username:       string
  display_name:   string
  avatar_url:     string | null
  is_verified:    boolean
  follower_count: number
  showcase_count: number
  post_count:     number
  /** Only present on the rank tab. */
  total_score?:   number
  components?:    RankComponent[]
}

const TABS: { id: LeaderboardType; label: string; icon: string }[] = [
  { id: "rank",      label: "Creator score", icon: "⭐" },
  { id: "followers", label: "Followers",     icon: "👥" },
  { id: "showcases", label: "Showcases",     icon: "✨" },
  { id: "posts",     label: "Posts",         icon: "📝" },
]

const RANK_STYLES: Record<number, { wrapper: string; rank: string }> = {
  1: { wrapper: "border-gold/40 bg-gold/5",           rank: "text-gold font-bold text-xl" },
  2: { wrapper: "border-slate-400/30 bg-slate-400/5", rank: "text-slate-400 font-bold text-lg" },
  3: { wrapper: "border-amber-700/30 bg-amber-700/5", rank: "text-amber-600 font-bold text-lg" },
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 animate-pulse">
      <div className="h-8 w-8 rounded bg-surface-2" />
      <div className="size-10 rounded-full bg-surface-2 shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="h-3 w-32 rounded bg-surface-2" />
        <div className="h-3 w-20 rounded bg-surface-2" />
      </div>
      <div className="h-5 w-16 rounded bg-surface-2" />
    </div>
  )
}

/** The metric actually being ranked on, read from the field the API returns. */
function scoreLabel(type: LeaderboardType, entry: LeaderboardEntry): string {
  switch (type) {
    case "rank":      return `${(entry.total_score ?? 0).toLocaleString()} pts`
    case "followers": return `${(entry.follower_count ?? 0).toLocaleString()} followers`
    case "showcases": return `${(entry.showcase_count ?? 0).toLocaleString()} showcases`
    case "posts":     return `${(entry.post_count ?? 0).toLocaleString()} posts`
  }
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [entries,   setEntries]   = useState<LeaderboardEntry[]>([])
  const [explainer, setExplainer] = useState<{ summary: string } | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<LeaderboardType>("rank")
  const [openScore, setOpenScore] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async (type: LeaderboardType) => {
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      if (user) {
        try { headers.Authorization = `Bearer ${await user.getIdToken()}` } catch { /* anonymous is fine */ }
      }
      const res = await fetch(`/api/community/leaderboard?type=${type}&limit=20`, { headers })
      if (!res.ok) throw new Error("Couldn't load the leaderboard.")
      const data = await res.json()
      setEntries(data.leaderboard ?? [])
      setExplainer(data.explainer ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the leaderboard.")
      setEntries([])
    } finally {
      setLoading(false)
    }
  // Keyed on the uid, not the User object: the object identity changes on
  // every token refresh, which would re-run the effect below for no reason.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  // Waits for auth to settle before fetching. Previously this ran once with
  // user === null and again the moment Firebase resolved the session, so every
  // visit by a signed-in member hit the endpoint twice and rendered the
  // unauthenticated (unfiltered-by-blocks) result first.
  useEffect(() => {
    if (authLoading) return
    setTimeout(() => void fetchLeaderboard(activeTab), 0)
  }, [activeTab, authLoading, fetchLeaderboard])

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">Creator Leaderboard</h1>
        <p className="text-sm text-muted/85 mt-1">
          Ranked from real, published activity — every score can be opened and checked.
        </p>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Leaderboard metric" className="flex flex-wrap gap-1 rounded-xl bg-surface border border-border p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={["flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60", activeTab === t.id ? "bg-gold/15 text-gold" : "text-muted/85 hover:text-foreground"].join(" ")}
          >
            <span aria-hidden="true">{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* How scoring works — only on the tab where a score is computed */}
      {activeTab === "rank" && explainer && (
        <p className="text-xs text-muted/85 leading-relaxed rounded-2xl border border-border bg-surface px-4 py-3 max-w-2xl">
          {explainer.summary}
        </p>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-red-400/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => void fetchLeaderboard(activeTab)}
            className="text-xs font-semibold text-gold hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : entries.length > 0 ? (
          entries.map((entry) => {
            const style   = RANK_STYLES[entry.rank]
            const initial = (entry.display_name || entry.username || "?")[0].toUpperCase()
            const isOpen  = openScore === entry.firebase_uid
            const hasBreakdown = activeTab === "rank" && (entry.components?.length ?? 0) > 0

            return (
              <div key={entry.firebase_uid} className={["rounded-2xl border bg-surface transition-colors hover:border-gold/20", style?.wrapper ?? "border-border"].join(" ")}>
                <div className="flex items-center gap-4 p-4">
                  <span className={["w-8 text-center shrink-0", style?.rank ?? "text-muted/85 font-bold"].join(" ")}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                  </span>

                  <Link href={`/community/${entry.username}`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60">
                    {entry.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatar_url} alt="" loading="lazy" decoding="async" className="size-11 rounded-full object-cover" />
                    ) : (
                      <span className="size-11 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-base" aria-hidden="true">{initial}</span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/community/${entry.username}`} className="font-display font-bold text-sm text-foreground hover:text-gold transition-colors truncate">
                        {entry.display_name}
                      </Link>
                      {entry.is_verified && <span className="text-gold text-xs" title="Verified">✓</span>}
                    </div>
                    <p className="text-xs text-muted/85">@{entry.username}</p>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-sm font-bold text-gold">{scoreLabel(activeTab, entry)}</span>
                    {hasBreakdown && (
                      <button
                        onClick={() => setOpenScore(isOpen ? null : entry.firebase_uid)}
                        aria-expanded={isOpen}
                        className="text-[0.6875rem] text-muted/70 hover:text-gold transition-colors"
                      >
                        {isOpen ? "Hide breakdown" : "How?"}
                      </button>
                    )}
                  </div>

                  {user && user.uid !== entry.firebase_uid && (
                    <div className="shrink-0 hidden sm:block">
                      <FollowButton targetUid={entry.firebase_uid} initialFollowing={false} />
                    </div>
                  )}
                </div>

                {/* The same itemised arithmetic the profile shows — a rank is
                    never presented as a number you have to take on trust. */}
                {isOpen && hasBreakdown && (
                  <div className="border-t border-border px-4 py-3 flex flex-col gap-2">
                    {entry.components!.map((c) => (
                      <div key={c.key} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{c.label}</p>
                          <p className="text-[0.6875rem] text-muted/70 leading-snug">{c.detail}</p>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${c.points < 0 ? "text-red-400" : "text-gold"}`}>
                          {c.points > 0 ? "+" : ""}{c.points}
                          {c.max !== null && <span className="text-muted/50 font-normal"> / {c.max}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border border-border bg-surface">
            <span className="text-4xl" aria-hidden="true">🏆</span>
            <p className="font-semibold text-foreground">No ranked creators yet</p>
            <p className="text-sm text-muted/85 max-w-sm">
              Scores appear once creators publish work and receive real engagement.
              Nothing is ranked until there&apos;s something real to rank.
            </p>
            <Link href="/community/discover" className="mt-2 text-xs text-gold hover:underline">
              Discover creators →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

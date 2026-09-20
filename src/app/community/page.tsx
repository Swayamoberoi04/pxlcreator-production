"use client"

import { useEffect, useState } from "react"
import Link                    from "next/link"
import { motion }              from "framer-motion"
import { useAuth }             from "@/contexts/AuthContext"
import { ChannelCard }         from "@/components/community/ChannelCard"
import { CreatorCard }         from "@/components/community/CreatorCard"
import { ProjectCard }         from "@/components/community/ProjectCard"
import type { ChannelWithMeta, CommunityProfile, ProjectWithMeta, EventWithMeta } from "@/types/community"

type RecommendedCreator = CommunityProfile & { matchPct: number; reason?: string }

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

/* Lightweight section header reveal — opacity + y only, no 3D */
const SECTION_HEADER_VARIANTS = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.55, ease: EASE } },
} as const

interface CommunityStats {
  creators: number
  channels: number
  projects: number
}

function StatPill({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className="rounded-full border border-gold/20 bg-gold/5 px-5 py-2 text-sm"
    >
      <span className="font-bold text-gold">{(value ?? 0).toLocaleString()}</span>
      <span className="text-muted/85 ml-1.5">{label}</span>
    </motion.div>
  )
}

function SkeletonCard({ h = "h-40" }: { h?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface ${h} animate-pulse`} />
  )
}

export default function CommunityHubPage() {
  const { user } = useAuth()

  const [stats,    setStats]    = useState<CommunityStats | null>(null)
  const [channels, setChannels] = useState<ChannelWithMeta[]>([])
  const [creators, setCreators] = useState<CommunityProfile[]>([])
  const [projects, setProjects] = useState<ProjectWithMeta[]>([])

  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingCreators, setLoadingCreators] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)

  /* Personalized recs — real signals only (see /api/community/recommended):
     onboarding professions, the user's own profile tags, and who the people
     they follow, follow. Shown for any signed-in user with a signal, not
     gated behind onboarding completion — a community-profile-only user gets
     recs too now. */
  const [recCreators, setRecCreators] = useState<RecommendedCreator[]>([])
  const [recChannels, setRecChannels] = useState<ChannelWithMeta[]>([])
  const [loadingRecs,  setLoadingRecs]  = useState(false)
  /** 'cold_start' = not enough real signal yet; the UI must say so rather
      than presenting a generic list as if it were personalised. */
  const [recStrategy, setRecStrategy] = useState<"personalised" | "cold_start">("personalised")

  const [trending, setTrending] = useState<(CommunityProfile & { recent_follows: number })[]>([])
  const [newCreators, setNewCreators] = useState<CommunityProfile[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithMeta[]>([])

  async function getHeaders(): Promise<HeadersInit> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  /** "Not interested" — a real, persisted dismissal, so this creator stops
      being recommended instead of reappearing on the next load. */
  async function dismissCreator(targetUid: string) {
    if (!user) return
    setRecCreators((prev) => prev.filter((c) => c.firebase_uid !== targetUid))
    try {
      const token = await user.getIdToken()
      await fetch("/api/community/recommended/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: "creator", target_id: targetUid }),
      })
    } catch { /* the card is already hidden locally; retry happens on reload */ }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      const headers = await getHeaders()

      // Stats
      try {
        const res = await fetch("/api/community/stats", { headers })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        if (!cancelled) setStats({ creators: 0, channels: 0, projects: 0 })
      }

      // Featured channels
      try {
        const res = await fetch("/api/community/channels?featured=true&limit=6", { headers })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setChannels(data.channels ?? data ?? [])
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingChannels(false) }

      // Discover creators
      try {
        const res = await fetch("/api/community/search?q=&type=profiles&limit=8", { headers })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setCreators(data.profiles ?? [])
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingCreators(false) }

      // Latest open projects
      try {
        const res = await fetch("/api/community/projects?status=open&limit=3", { headers })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setProjects(data.projects ?? data ?? [])
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingProjects(false) }

      // Personalised recommendations — real signals (onboarding professions,
      // own profile tags, follows-of-follows). The endpoint itself returns
      // an empty list when the user has none of those signals yet, so no
      // separate "has onboarding completed" gate is needed here anymore.
      if (user) {
        setLoadingRecs(true)
        try {
          const recRes = await fetch("/api/community/recommended?limit=6", { headers })
          if (recRes.ok && !cancelled) {
            const recData = await recRes.json()
            setRecCreators(recData.creators ?? [])
            setRecChannels(recData.channels ?? [])
            setRecStrategy(recData.strategy ?? "personalised")
          }
        } catch { /* ignore */ }
        finally { if (!cancelled) setLoadingRecs(false) }
      }

      // Trending + New — public, real activity/created_at, no auth needed.
      try {
        const [trendRes, newRes] = await Promise.all([
          fetch("/api/community/discover/trending?limit=6"),
          fetch("/api/community/discover/new?limit=6"),
        ])
        if (trendRes.ok && !cancelled) setTrending((await trendRes.json()).creators ?? [])
        if (newRes.ok && !cancelled) setNewCreators((await newRes.json()).creators ?? [])
      } catch { /* ignore */ }

      // Upcoming events — real rows only; the section simply doesn't render
      // when nothing is scheduled.
      try {
        const eventsRes = await fetch("/api/community/events?upcoming=true&limit=3", { headers })
        if (eventsRes.ok && !cancelled) setUpcomingEvents((await eventsRes.json()).events ?? [])
      } catch { /* ignore */ }
    }

    void load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className="flex flex-col gap-16">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center gap-6 pt-4">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="font-display font-bold text-4xl md:text-5xl text-foreground"
        >
          PXL Creator{" "}
          <span className="text-gold">Community</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="text-muted/92 text-lg tracking-widest font-light"
        >
          Connect · Create · Collaborate
        </motion.p>

        {/* Stat pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {stats ? (
            <>
              <StatPill label="Creators"  value={stats.creators}  delay={0.2} />
              <StatPill label="Channels"  value={stats.channels}  delay={0.3} />
              <StatPill label="Projects"  value={stats.projects}  delay={0.4} />
            </>
          ) : (
            [0, 1, 2].map((i) => (
              <div key={i} className="h-9 w-32 rounded-full bg-surface animate-pulse" />
            ))
          )}
        </div>
      </section>

      {/* ── Recommended For You (personalised, logged-in only) ── */}
      {user && (recCreators.length > 0 || recChannels.length > 0 || loadingRecs) && (
        <section className="flex flex-col gap-5">
          <motion.div
            className="flex items-center justify-between"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-20px" }}
            variants={SECTION_HEADER_VARIANTS}
          >
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">
                {recStrategy === "cold_start" ? "New to the community" : "Recommended For You"}
              </h2>
              <p className="text-[0.8125rem] text-muted/85 mt-0.5">
                {recStrategy === "cold_start"
                  ? "Not personalised yet — follow creators and fill in your profile and these become tailored to you."
                  : "Based on your profile, follows, and what you've engaged with"}
              </p>
            </div>
            <Link href="/account#preferences" className="text-sm text-gold hover:underline">
              Edit profile →
            </Link>
          </motion.div>

          {loadingRecs ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface h-24 w-64 shrink-0 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Matched creators */}
              {recCreators.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {recCreators.map((profile) => (
                    <div key={profile.id} className="shrink-0 w-64 relative" title={profile.reason}>
                      <CreatorCard profile={profile} compact showFollowButton />
                      {profile.matchPct > 0 && (
                        <span className="absolute top-2 right-8 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.625rem] font-bold text-gold/90">
                          {profile.matchPct}% match
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label="Not interested"
                        title="Not interested — stop recommending this creator"
                        onClick={() => void dismissCreator(profile.firebase_uid)}
                        className="absolute top-2 right-2 rounded-full bg-black/60 px-1.5 text-[0.625rem] text-muted/70 hover:text-foreground transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Matched channels */}
              {recChannels.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recChannels.map((ch) => (
                    <ChannelCard key={ch.id} channel={ch} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Trending Creators (real follower growth, last 7 days) ── */}
      {trending.length > 0 && (
        <section className="flex flex-col gap-5">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }}
            variants={SECTION_HEADER_VARIANTS}
          >
            <h2 className="font-display font-bold text-xl text-foreground">🔥 Trending This Week</h2>
            <p className="text-[0.8125rem] text-muted/85 mt-0.5">Creators gaining the most followers right now</p>
          </motion.div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {trending.map((p) => (
              <div key={p.id} className="shrink-0 w-64 relative">
                <CreatorCard profile={p} compact showFollowButton />
                <span className="absolute top-2 right-2 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.625rem] font-bold text-gold/90">
                  +{p.recent_follows} this week
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── New Creators ─────────────────────────────────────── */}
      {newCreators.length > 0 && (
        <section className="flex flex-col gap-5">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }}
            variants={SECTION_HEADER_VARIANTS}
          >
            <h2 className="font-display font-bold text-xl text-foreground">✨ New Creators</h2>
          </motion.div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {newCreators.map((p) => (
              <div key={p.id} className="shrink-0 w-64">
                <CreatorCard profile={p} compact showFollowButton />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming Events ─────────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <section className="flex flex-col gap-5">
          <motion.div
            className="flex items-center justify-between"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }}
            variants={SECTION_HEADER_VARIANTS}
          >
            <h2 className="font-display font-bold text-xl text-foreground">📅 Upcoming Events</h2>
            <Link href="/community/events" className="text-sm text-gold hover:underline">
              See all →
            </Link>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((e) => (
              <Link key={e.id} href={`/community/events/${e.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 hover:border-gold/30 transition-colors">
                <p className="text-[0.6875rem] uppercase tracking-wider text-gold/80">
                  {new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" · "}{e.event_type}
                </p>
                <h3 className="font-display font-bold text-sm text-foreground line-clamp-2">{e.title}</h3>
                <p className="text-xs text-muted/85 line-clamp-2">{e.description}</p>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <span className="text-[0.6875rem] text-muted/70">
                    {e.attendance_mode === "online" ? "Online" : e.location ?? e.attendance_mode}
                  </span>
                  {e.source === "external" && (
                    <span className="text-[0.625rem] rounded-full border border-border px-1.5 py-0.5 text-muted/70">External</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Channels ───────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <motion.div
          className="flex items-center justify-between"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          variants={SECTION_HEADER_VARIANTS}
        >
          <h2 className="font-display font-bold text-xl text-foreground">Featured Channels</h2>
          <Link href="/community/channels" className="text-sm text-gold hover:underline">
            Browse all →
          </Link>
        </motion.div>

        {loadingChannels ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} h="h-44" />)}
          </div>
        ) : channels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
          </div>
        ) : (
          <p className="text-muted/85 text-sm">No featured channels yet.</p>
        )}
      </section>

      {/* ── Discover Creators ───────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <motion.div
          className="flex items-center justify-between"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          variants={SECTION_HEADER_VARIANTS}
        >
          <h2 className="font-display font-bold text-xl text-foreground">Discover Creators</h2>
          <Link href="/community/discover" className="text-sm text-gold hover:underline">
            See all →
          </Link>
        </motion.div>

        {loadingCreators ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface h-20 w-64 shrink-0 animate-pulse" />
            ))}
          </div>
        ) : creators.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {creators.map((profile) => (
              <div key={profile.id} className="shrink-0 w-64">
                <CreatorCard profile={profile} compact showFollowButton />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted/85 text-sm">No creators found.</p>
        )}
      </section>

      {/* ── Latest Projects ─────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <motion.div
          className="flex items-center justify-between"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          variants={SECTION_HEADER_VARIANTS}
        >
          <h2 className="font-display font-bold text-xl text-foreground">Open Projects</h2>
          <Link href="/community/projects" className="text-sm text-gold hover:underline">
            Browse all →
          </Link>
        </motion.div>

        {loadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} h="h-56" />)}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        ) : (
          <p className="text-muted/85 text-sm">No open projects right now.</p>
        )}
      </section>

      {/* ── CTA row ─────────────────────────────────────────── */}
      <motion.section
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-20px" }}
        variants={{
          hidden:  {},
          visible: { transition: { staggerChildren: 0.10, delayChildren: 0 } },
        }}
      >
        {[
          {
            href:    "/community/showcase",
            title:   "Share Your Work",
            desc:    "Showcase photos, edits, and reels to the community",
            cta:     "Go to Showcase →",
          },
          {
            href:    "/community/discover",
            title:   "Find Collaborators",
            desc:    "Browse creators by skill, role, and availability",
            cta:     "Discover Creators →",
          },
        ].map((card) => (
          <motion.div
            key={card.href}
            variants={{
              hidden:  { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
            }}
          >
            <Link
              href={card.href}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 hover:border-gold/40 hover:bg-surface-2 transition-colors h-full"
            >
              <div>
                <h3 className="font-display font-bold text-base text-foreground group-hover:text-gold transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-muted/85 mt-1">{card.desc}</p>
              </div>
              <span className="text-gold text-sm font-semibold">{card.cta}</span>
            </Link>
          </motion.div>
        ))}
      </motion.section>
    </div>
  )
}

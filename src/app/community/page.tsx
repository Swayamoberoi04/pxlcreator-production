"use client"

import { useEffect, useState } from "react"
import Link                    from "next/link"
import { motion }              from "framer-motion"
import { useAuth }             from "@/contexts/AuthContext"
import { ChannelCard }         from "@/components/community/ChannelCard"
import { CreatorCard }         from "@/components/community/CreatorCard"
import { ProjectCard }         from "@/components/community/ProjectCard"
import type { ChannelWithMeta, CommunityProfile, ProjectWithMeta } from "@/types/community"

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
      <span className="font-black text-gold">{(value ?? 0).toLocaleString()}</span>
      <span className="text-muted/60 ml-1.5">{label}</span>
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

  /* Personalized recs — only for logged-in users with completed onboarding */
  const [recCreators, setRecCreators] = useState<(CommunityProfile & { matchPct: number })[]>([])
  const [recChannels, setRecChannels] = useState<ChannelWithMeta[]>([])
  const [loadingRecs,  setLoadingRecs]  = useState(false)

  async function getHeaders(): Promise<HeadersInit> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
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

      // Personalised recommendations — only if signed in with completed onboarding
      if (user) {
        setLoadingRecs(true)
        try {
          const statusRes = await fetch("/api/onboarding/status", { headers })
          if (statusRes.ok && !cancelled) {
            const statusData = await statusRes.json()
            if (statusData.completed) {
              const recRes = await fetch("/api/community/recommended?limit=6", { headers })
              if (recRes.ok && !cancelled) {
                const recData = await recRes.json()
                setRecCreators(recData.creators ?? [])
                setRecChannels(recData.channels ?? [])
              }
            }
          }
        } catch { /* ignore */ }
        finally { if (!cancelled) setLoadingRecs(false) }
      }
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
          className="font-display font-black text-4xl md:text-5xl text-foreground"
        >
          PXL Creator{" "}
          <span className="text-gold">Community</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="text-muted/70 text-lg tracking-widest font-light"
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
              <h2 className="font-display font-black text-xl text-foreground">
                Recommended For You
              </h2>
              <p className="text-[0.8rem] text-muted/50 mt-0.5">Based on your creative profile</p>
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
                    <div key={profile.id} className="shrink-0 w-64 relative">
                      <CreatorCard profile={profile} compact showFollowButton />
                      {profile.matchPct > 0 && (
                        <span className="absolute top-2 right-2 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.6rem] font-bold text-gold/90">
                          {profile.matchPct}% match
                        </span>
                      )}
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

      {/* ── Featured Channels ───────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <motion.div
          className="flex items-center justify-between"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          variants={SECTION_HEADER_VARIANTS}
        >
          <h2 className="font-display font-black text-xl text-foreground">Featured Channels</h2>
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
          <p className="text-muted/50 text-sm">No featured channels yet.</p>
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
          <h2 className="font-display font-black text-xl text-foreground">Discover Creators</h2>
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
          <p className="text-muted/50 text-sm">No creators found.</p>
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
          <h2 className="font-display font-black text-xl text-foreground">Open Projects</h2>
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
          <p className="text-muted/50 text-sm">No open projects right now.</p>
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
                <h3 className="font-display font-black text-base text-foreground group-hover:text-gold transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-muted/60 mt-1">{card.desc}</p>
              </div>
              <span className="text-gold text-sm font-semibold">{card.cta}</span>
            </Link>
          </motion.div>
        ))}
      </motion.section>
    </div>
  )
}

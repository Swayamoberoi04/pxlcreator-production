"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams }                          from "next/navigation"
import Link                                                    from "next/link"
import { useAuth }                                  from "@/contexts/AuthContext"
import { CreatorCard }                              from "@/components/community/CreatorCard"
import { FeaturedCreatorCard }                      from "@/components/community/FeaturedCreatorCard"
import { CollabRequestCard, type CollabRequest }    from "@/components/community/CollabRequestCard"
import { CREATOR_ROLES }                            from "@/types/community"
import { useLiveProfileCounts, useRealtimeTable }   from "@/lib/community/useRealtime"
import type { CommunityProfile, SkillLevel, Availability, CreatorTag, FeaturedCreator } from "@/types/community"

/**
 * Offline fallback only. The real filter vocabulary comes from
 * GET /api/community/tags (the `creator_tags` table) — see loadTags() below.
 */
const FALLBACK_ROLE_TAGS: CreatorTag[] = CREATOR_ROLES.map((r, i) => ({
  id: r.id, kind: "role", label: r.label, icon: r.icon, color: r.color, sort_order: i,
}))

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "beginner",     label: "Beginner"     },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced"     },
  { value: "professional", label: "Professional" },
]

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "open_for_work",   label: "Open for Work"  },
  { value: "open_for_collab", label: "Open to Collab" },
  { value: "hiring",          label: "Hiring"         },
]

const AVAILABLE_FOR_OPTIONS = [
  { id: "Paid Work",       label: "Paid Work"       },
  { id: "Collaboration",   label: "Collaboration"   },
  { id: "Internship",      label: "Internship"      },
  { id: "Team Building",   label: "Team Building"   },
]

type PageTab = "discover" | "requests"
type RequestsTab = "received" | "sent"

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-60 animate-pulse" />
}

/* ─── Collab Request Modal ─────────────────────────────────────────────────── */
interface CollabRequestModalProps {
  recipient: CommunityProfile
  onClose:   () => void
  onSent:    () => void
}

function CollabRequestModal({ recipient, onClose, onSent }: CollabRequestModalProps) {
  const { user }             = useAuth()
  const [collabType, setCollabType] = useState("Collaboration")
  const [roleNeeded, setRoleNeeded] = useState<string>(CREATOR_ROLES[0].id)
  const [message,    setMessage]    = useState("")
  const [budget,     setBudget]     = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err,        setErr]        = useState<string | null>(null)

  const initial = (recipient.display_name || recipient.username || "?")[0].toUpperCase()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (message.trim().length < 10) { setErr("Message must be at least 10 characters"); return }
    if (message.trim().length > 1000) { setErr("Message must be under 1000 characters"); return }
    setSubmitting(true)
    setErr(null)
    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/community/collab-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          recipient_uid: recipient.firebase_uid,
          collab_type:   collabType,
          role_needed:   roleNeeded,
          message:       message.trim(),
          budget:        budget.trim() || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to send request") }
      onSent()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send request")
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-bold text-lg">Send Collab Request</h2>
          <button onClick={onClose} className="text-muted/85 hover:text-foreground text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Recipient card */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
              {recipient.avatar_url ? (
                <img src={recipient.avatar_url} alt={recipient.display_name} loading="lazy" decoding="async" className="size-10 rounded-full object-cover shrink-0" />
              ) : (
                <span className="size-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{recipient.display_name}</p>
                <p className="text-xs text-muted/85">@{recipient.username}</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4 px-6 pb-6">
            {err && <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">{err}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted/92">Collab Type *</label>
                <select
                  value={collabType} onChange={(e) => setCollabType(e.target.value)}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50"
                >
                  {AVAILABLE_FOR_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted/92">Role Needed *</label>
                <select
                  value={roleNeeded} onChange={(e) => setRoleNeeded(e.target.value)}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50"
                >
                  {CREATOR_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/92">Message * (10–1000 chars)</label>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                placeholder="Describe your project and what you're looking for…"
                rows={4}
                className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50 resize-none"
              />
              <p className="text-[10px] text-muted/70 text-right">{message.length}/1000</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/92">Budget (optional)</label>
              <input
                value={budget} onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. $500, negotiable, rev-share"
                className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-border text-muted/85 hover:text-foreground transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || message.trim().length < 10} className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50">
                {submitting ? "Sending…" : "Send Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page inner — uses useSearchParams, must be inside Suspense ─────── */
function DiscoverPageInner() {
  const { user }       = useAuth()
  const router         = useRouter()
  const searchParams   = useSearchParams()

  const [pageTab,      setPageTab]      = useState<PageTab>("discover")
  const [query,        setQuery]        = useState(searchParams.get("q") ?? "")
  const [roles,        setRoles]        = useState<string[]>(searchParams.getAll("role"))
  const [skillLevel,   setSkillLevel]   = useState<SkillLevel | "">((searchParams.get("skill") as SkillLevel) ?? "")
  const [availability, setAvailability] = useState<Availability | "">((searchParams.get("avail") as Availability) ?? "")
  const [location,     setLocation]     = useState(searchParams.get("loc") ?? "")
  const [availableFor, setAvailableFor] = useState<string[]>([])
  const [needRole,     setNeedRole]     = useState("")
  const [styles,       setStyles]       = useState<string[]>(searchParams.getAll("style"))

  // Filter vocabulary — loaded from the database, not a hardcoded array.
  const [roleTags,  setRoleTags]  = useState<CreatorTag[]>(FALLBACK_ROLE_TAGS)
  const [styleTags, setStyleTags] = useState<CreatorTag[]>([])

  const [profiles,  setProfiles]  = useState<CommunityProfile[]>([])
  const [total,     setTotal]     = useState<number | null>(null)
  const [loading,   setLoading]   = useState(true)
  /** True when the public directory itself is empty, not just this filter set. */
  const [directoryEmpty, setDirectoryEmpty] = useState(false)

  // Trending / New / Featured — independent of the filter form above.
  const [trending, setTrending] = useState<(CommunityProfile & { recent_follows: number })[]>([])
  const [newCreators, setNewCreators] = useState<CommunityProfile[]>([])
  const [featured, setFeatured] = useState<FeaturedCreator[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)

  const [collabModal, setCollabModal]   = useState<CommunityProfile | null>(null)

  // Requests tab
  const [requestsTab, setRequestsTab]   = useState<RequestsTab>("received")
  const [received,    setReceived]      = useState<CollabRequest[]>([])
  const [sent,        setSent]          = useState<CollabRequest[]>([])
  const [reqLoading,  setReqLoading]    = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function getHeaders(): Promise<HeadersInit> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  const search = useCallback(async (q: string, role: string[], skill: string, avail: string, loc: string, avFor: string[], needR: string, style: string[]) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: "profiles", limit: "50" })
      if (q)      params.set("q",            q)
      if (skill)  params.set("skill_level",  skill)
      if (avail)  params.set("availability", avail)
      if (loc)    params.set("location",     loc)
      if (needR)  params.set("need_role",    needR)
      role.forEach((r)  => params.append("role", r))
      style.forEach((s) => params.append("style", s))
      avFor.forEach((a) => params.append("available_for", a))

      const headers = await getHeaders()
      const res     = await fetch(`/api/community/search?${params}`, { headers })
      if (res.ok) {
        const data  = await res.json()
        const found = (data.profiles ?? []) as CommunityProfile[]
        setProfiles(found)
        setTotal(data.totals?.profiles ?? data.total ?? found.length)

        // Distinguish "nobody matches these filters" from "nobody has joined
        // yet" — the second must never be dressed up as the first.
        if (found.length === 0) {
          const unfiltered = new URLSearchParams({ type: "profiles", limit: "1" })
          const probe = await fetch(`/api/community/search?${unfiltered}`, { headers })
          const probeData = probe.ok ? await probe.json() : null
          setDirectoryEmpty((probeData?.totals?.profiles ?? 1) === 0)
        } else {
          setDirectoryEmpty(false)
        }
      }
    } catch { setProfiles([]) } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* Load the filter vocabulary from the database once. */
  useEffect(() => {
    let cancelled = false
    async function loadTags() {
      try {
        const res = await fetch("/api/community/tags")
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data.roles)  && data.roles.length)  setRoleTags(data.roles)
        if (Array.isArray(data.styles) && data.styles.length) setStyleTags(data.styles)
      } catch { /* keep the offline fallback */ }
    }
    void loadTags()
    return () => { cancelled = true }
  }, [])

  /* Trending / New / Featured — reusable so realtime can trigger a refetch. */
  const loadSections = useCallback(async () => {
    setSectionsLoading(true)
    try {
      const [trendRes, newRes, featRes] = await Promise.all([
        fetch("/api/community/discover/trending?limit=8"),
        fetch("/api/community/discover/new?limit=8"),
        fetch("/api/community/featured-creators"),
      ])
      if (trendRes.ok) setTrending((await trendRes.json()).creators ?? [])
      if (newRes.ok) setNewCreators((await newRes.json()).creators ?? [])
      if (featRes.ok) setFeatured((await featRes.json()).creators ?? [])
    } catch { /* sections are supplementary; leave whatever loaded */ }
    finally { setSectionsLoading(false) }
  }, [])

  useEffect(() => { setTimeout(() => void loadSections(), 0) }, [loadSections])

  /* Trending is literally "recent follow activity" — a new follow anywhere
     can change the ranking, so refetch (debounced) on any follow change. */
  const trendingRefetchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useRealtimeTable({ table: "creator_follows", event: "INSERT" }, () => {
    if (trendingRefetchRef.current) clearTimeout(trendingRefetchRef.current)
    trendingRefetchRef.current = setTimeout(() => void loadSections(), 2000)
  })

  /* Live follower counts: re-render a card when someone follows that creator. */
  useLiveProfileCounts(true, (row) => {
    setProfiles((prev) => {
      if (!prev.some((p) => p.firebase_uid === row.firebase_uid)) return prev
      return prev.map((p) =>
        p.firebase_uid === row.firebase_uid
          ? { ...p, follower_count: row.follower_count, showcase_count: row.showcase_count }
          : p
      )
    })
  })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (query)       params.set("q", query)
      if (skillLevel)  params.set("skill", skillLevel)
      if (availability) params.set("avail", availability)
      if (location)    params.set("loc", location)
      roles.forEach((r) => params.append("role", r))
      styles.forEach((s) => params.append("style", s))
      router.replace(`/community/discover?${params}`, { scroll: false })
      void search(query, roles, skillLevel, availability, location, availableFor, needRole, styles)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, roles, skillLevel, availability, location, availableFor, needRole, styles])

  async function fetchRequests() {
    if (!user) return
    setReqLoading(true)
    try {
      const headers = await getHeaders()
      const [recRes, sentRes] = await Promise.all([
        fetch("/api/community/collab-requests?type=received", { headers }),
        fetch("/api/community/collab-requests?type=sent",     { headers }),
      ])
      if (recRes.ok)  { const d = await recRes.json();  setReceived(d.requests ?? d ?? []) }
      if (sentRes.ok) { const d = await sentRes.json(); setSent(d.requests ?? d ?? []) }
    } catch { /* ignore */ } finally { setReqLoading(false) }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pageTab === "requests" && user) void fetchRequests()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTab, user])

  function toggleRole(roleId: string) {
    setRoles((prev) => prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId])
  }

  function toggleStyle(styleId: string) {
    setStyles((prev) => prev.includes(styleId) ? prev.filter((s) => s !== styleId) : [...prev, styleId])
  }

  function toggleAvailableFor(opt: string) {
    setAvailableFor((prev) => prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt])
  }

  function handleStatusChange(id: string, status: string) {
    const updater = (list: CollabRequest[]) => list.map((r) => r.id === id ? { ...r, status: status as CollabRequest["status"] } : r)
    setReceived(updater)
    setSent(updater)
  }

  const hasFilters = roles.length > 0 || styles.length > 0 || skillLevel || availability || location || availableFor.length > 0 || needRole

  return (
    <div className="flex flex-col gap-8">
      {/* Page tabs */}
      <div className="flex gap-1 rounded-xl bg-surface border border-border p-1 w-fit">
        <button
          onClick={() => setPageTab("discover")}
          className={["rounded-lg px-5 py-2 text-sm font-medium transition-colors", pageTab === "discover" ? "bg-gold/15 text-gold" : "text-muted/85 hover:text-foreground"].join(" ")}
        >
          Discover
        </button>
        <button
          onClick={() => { if (!user) return; setPageTab("requests") }}
          disabled={!user}
          className={["rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed", pageTab === "requests" ? "bg-gold/15 text-gold" : "text-muted/85 hover:text-foreground"].join(" ")}
        >
          My Requests
        </button>
      </div>

      {/* ── REQUESTS TAB ── */}
      {pageTab === "requests" && (
        <div className="flex flex-col gap-6">
          <h1 className="font-display font-bold text-3xl text-foreground">Collab Requests</h1>

          <div className="flex gap-1 rounded-xl bg-surface border border-border p-1 w-fit">
            {(["received", "sent"] as RequestsTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setRequestsTab(t)}
                className={["rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors", requestsTab === t ? "bg-gold/15 text-gold" : "text-muted/85 hover:text-foreground"].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>

          {reqLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 rounded-2xl border border-border bg-surface animate-pulse" />)}
            </div>
          ) : (requestsTab === "received" ? received : sent).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl">🤝</span>
              <p className="font-semibold text-foreground">No {requestsTab} requests</p>
              <p className="text-sm text-muted/85">
                {requestsTab === "received" ? "When someone sends you a collab request it will appear here" : "Requests you send to other creators will appear here"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(requestsTab === "received" ? received : sent).map((req) => (
                <CollabRequestCard
                  key={req.id}
                  request={req}
                  viewType={requestsTab}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DISCOVER TAB ── */}
      {pageTab === "discover" && (
        <>
          {/* Trending — real follower growth in the last 7 days. Section is
              simply absent when nobody gained a follow; never backfilled. */}
          {(trending.length > 0 || sectionsLoading) && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display font-bold text-lg text-foreground">🔥 Trending This Week</h2>
              {sectionsLoading ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* New creators — real signups, ordered by real created_at. */}
          {(newCreators.length > 0 || sectionsLoading) && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display font-bold text-lg text-foreground">✨ New Creators</h2>
              {sectionsLoading ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {newCreators.map((p) => (
                    <div key={p.id} className="shrink-0 w-64">
                      <CreatorCard profile={p} compact showFollowButton />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Featured / Inspiration — external creators, clearly not PXL members */}
          {featured.length > 0 && (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">Featured Creators</h2>
                <p className="text-xs text-muted/85 mt-0.5">
                  Inspiration from outside PXL — not registered members, shown for creative reference only.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((c) => <FeaturedCreatorCard key={c.id} creator={c} />)}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-6" />

          <div>
            <h1 className="font-display font-bold text-3xl text-foreground">Discover Creators</h1>
            {total !== null && (
              <p className="text-sm text-muted/85 mt-1">
                {total.toLocaleString()} result{total !== 1 ? "s" : ""}
                {query ? ` for "${query}"` : ""}
              </p>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/70 text-lg">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creators by name, role, or location…"
              className="w-full rounded-xl border border-border bg-surface px-11 py-3 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50 focus:bg-surface-2 transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/70 hover:text-foreground transition-colors">✕</button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted/85">Filters</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Skill Level */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted/92">Skill Level</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as SkillLevel | "")}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50"
                >
                  <option value="">Any level</option>
                  {SKILL_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Availability */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted/92">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as Availability | "")}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50"
                >
                  <option value="">Any status</option>
                  {AVAILABILITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              {/* Location */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted/92">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or country…"
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50"
                />
              </div>

              {/* Need Role */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted/92">I Need</label>
                <select
                  value={needRole}
                  onChange={(e) => setNeedRole(e.target.value)}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50"
                >
                  <option value="">Any role</option>
                  {roleTags.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {/* Available For */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted/92">Available For</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleAvailableFor(opt.id)}
                    className={[
                      "inline-flex items-center rounded-full px-3 min-h-9 text-xs font-medium transition-colors border",
                      availableFor.includes(opt.id)
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-border bg-surface-2 text-muted/85 hover:border-gold/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Roles — vocabulary from the creator_tags table */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted/92">Roles</label>
              <div className="flex flex-wrap gap-2">
                {roleTags.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={[
                      "flex items-center gap-1 rounded-full px-3 min-h-9 text-xs font-medium transition-colors border",
                      roles.includes(role.id)
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-border bg-surface-2 text-muted/85 hover:border-gold/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    <span>{role.icon}</span>
                    <span>{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style / subject tags — also from creator_tags */}
            {styleTags.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted/92">Style &amp; Subject</label>
                <div className="flex flex-wrap gap-2">
                  {styleTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleStyle(tag.id)}
                      className={[
                        "flex items-center gap-1 rounded-full px-3 min-h-9 text-xs font-medium transition-colors border",
                        styles.includes(tag.id)
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-border bg-surface-2 text-muted/85 hover:border-gold/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      <span>{tag.icon}</span>
                      <span>{tag.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setRoles([]); setStyles([]); setSkillLevel(""); setAvailability(""); setLocation(""); setAvailableFor([]); setNeedRole("") }}
                className="self-start text-xs text-muted/85 hover:text-gold transition-colors underline underline-offset-2"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Results grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : profiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p) => (
                <div key={p.id} className="flex flex-col">
                  <CreatorCard profile={p} showFollowButton />
                  {user && user.uid !== p.firebase_uid && (
                    <button
                      onClick={() => setCollabModal(p)}
                      className="mt-2 w-full rounded-xl py-2 text-xs font-bold border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                    >
                      🤝 Send Collab Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : directoryEmpty ? (
            /* Genuinely nobody public in the directory yet — say so plainly
               rather than implying the search was at fault. */
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <span className="text-4xl">🌱</span>
              <p className="text-foreground font-semibold">No creators have joined yet</p>
              <p className="text-sm text-muted/85 max-w-sm">
                The creator directory is empty right now. Be the first — set up your
                profile and you&apos;ll show up here for everyone else.
              </p>
              <Link
                href="/community/setup"
                className="mt-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-gold/90 transition-colors"
              >
                Create my creator profile
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-foreground font-semibold">
                No creators match {hasFilters && query ? "this search and these filters" : hasFilters ? "these filters" : "this search"}
              </p>
              <p className="text-sm text-muted/85">
                There are registered creators — none of them fit what you picked. Try
                widening your filters.
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setRoles([]); setStyles([]); setSkillLevel(""); setAvailability(""); setLocation(""); setAvailableFor([]); setNeedRole("") }}
                  className="mt-1 text-xs text-gold hover:underline underline-offset-2"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Collab request modal */}
      {collabModal && (
        <CollabRequestModal
          recipient={collabModal}
          onClose={() => setCollabModal(null)}
          onSent={() => { /* optionally switch to requests tab */ }}
        />
      )}
    </div>
  )
}

/* ─── Skeleton shown while Suspense resolves ───────────────────────────────── */
function DiscoverSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-10 w-60 rounded-2xl bg-surface border border-border" />
      <div className="h-12 w-full rounded-xl bg-surface border border-border" />
      <div className="h-40 w-full rounded-2xl bg-surface border border-border" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-60 rounded-2xl bg-surface border border-border" />
        ))}
      </div>
    </div>
  )
}

/* ─── Default export wraps inner in Suspense (required for useSearchParams) ── */
export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverPageInner />
    </Suspense>
  )
}

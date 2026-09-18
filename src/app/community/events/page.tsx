"use client"

import { useCallback, useEffect, useState } from "react"
import Link                       from "next/link"
import { motion }                 from "framer-motion"
import { useAuth }                from "@/contexts/AuthContext"
import { useRealtimeTable }       from "@/lib/community/useRealtime"
import type { EventWithMeta, CreatorTag } from "@/types/community"

const EVENT_ICONS: Record<string, string> = {
  challenge: "⚡",
  contest:   "🏆",
  meetup:    "🤝",
  workshop:  "🎓",
  webinar:   "📡",
}

const STATUS_STYLES: Record<string, string> = {
  upcoming:  "text-gold bg-gold/10 border-gold/20",
  active:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  ended:     "text-muted/85 bg-surface border-border",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
}

const EVENT_TYPES = [
  { id: "",          label: "All types" },
  { id: "challenge", label: "Challenges" },
  { id: "contest",   label: "Contests" },
  { id: "workshop",  label: "Workshops" },
  { id: "webinar",   label: "Webinars" },
  { id: "meetup",    label: "Meetups" },
]

const ATTENDANCE = [
  { id: "",        label: "Anywhere" },
  { id: "online",  label: "Online" },
  { id: "offline", label: "In person" },
  { id: "hybrid",  label: "Hybrid" },
]

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return "Ended"
  const days  = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

export default function EventsPage() {
  const { user } = useAuth()
  const [events,  setEvents]  = useState<EventWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<"upcoming" | "active" | "ended">("upcoming")
  const [eventType,  setEventType]  = useState("")
  const [attendance, setAttendance] = useState("")
  const [query,      setQuery]      = useState("")
  const [tags,       setTags]       = useState<string[]>([])
  const [roleTags,   setRoleTags]   = useState<CreatorTag[]>([])
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetch("/api/community/tags?kind=role")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.roles?.length) setRoleTags(d.roles) })
      .catch(() => { /* filter chips are supplementary */ })
  }, [])

  const load = useCallback(async (pg: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      if (user) { try { headers.Authorization = `Bearer ${await user.getIdToken()}` } catch { /* ignore */ } }
      const params = new URLSearchParams({ status: tab, page: String(pg), limit: "12" })
      if (query) params.set("q", query)
      if (eventType) params.set("event_type", eventType)
      if (attendance) params.set("attendance", attendance)
      tags.forEach((t) => params.append("tags", t))
      const res = await fetch(`/api/community/events?${params}`, { headers })
      if (!res.ok) throw new Error("Failed to load events.")
      const data = await res.json()
      setEvents(append ? (prev) => [...prev, ...(data.events ?? [])] : (data.events ?? []))
      setHasMore(!!data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events.")
      if (!append) setEvents([])
    } finally { setLoading(false) }
  }, [user, tab, query, eventType, attendance, tags])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void load(1, false) }, 250)
    return () => clearTimeout(t)
  }, [load])

  // An event flipping status or filling up is public information worth
  // reflecting without a manual refresh.
  useRealtimeTable<{ id: string; participant_count: number; status: string }>(
    { table: "community_events", event: "UPDATE" },
    (payload) => {
      const next = payload.new
      if (!next?.id) return
      setEvents((prev) => prev.some((e) => e.id === next.id)
        ? prev.map((e) => e.id === next.id
            ? { ...e, participant_count: next.participant_count, status: next.status as EventWithMeta["status"] }
            : e)
        : prev)
    }
  )

  function toggleTag(id: string) {
    setTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  const hasFilters = !!query || !!eventType || !!attendance || tags.length > 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[1.75rem] text-foreground">Community Events</h1>
          <p className="text-[0.9375rem] text-muted/85 mt-1">Challenges, contests, workshops and meetups for creators.</p>
        </div>
        {user && (
          <button type="button" onClick={() => setShowCreate(true)}
            className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-[0.875rem] font-semibold text-background hover:bg-gold/90 transition-colors">
            + Create Event
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events…"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40"
        />
        <div className="flex gap-2">
          {(["upcoming", "active", "ended"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-[0.8125rem] font-medium capitalize transition-all ${tab === t ? "bg-gold text-background" : "border border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {EVENT_TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => setEventType(t.id)}
              className={`rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all ${eventType === t.id ? "bg-gold/20 text-gold border border-gold/40" : "border border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {ATTENDANCE.map((a) => (
            <button key={a.id} type="button" onClick={() => setAttendance(a.id)}
              className={`rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all ${attendance === a.id ? "bg-gold/20 text-gold border border-gold/40" : "border border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
              {a.label}
            </button>
          ))}
        </div>
        {roleTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {roleTags.map((t) => (
              <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-[0.75rem] font-medium border transition-all ${tags.includes(t.id) ? "border-gold/40 bg-gold/10 text-gold" : "border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

      {/* Events grid */}
      {loading && page === 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-surface border border-border animate-pulse" />)}
        </div>
      ) : events.length > 0 ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <Link key={event.id} href={`/community/events/${event.id}`}
                className="relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-gold/25 transition-all p-5 flex flex-col gap-3">
                {event.banner_url && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[1.75rem]">{EVENT_ICONS[event.event_type] ?? "✦"}</span>
                    <div>
                      <h3 className="font-display font-bold text-[1rem] text-foreground leading-tight">{event.title}</h3>
                      <p className="text-[0.75rem] text-muted/85 capitalize mt-0.5">
                        {event.event_type} · {event.attendance_mode === "online" ? "Online" : event.location ?? event.attendance_mode}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[0.65rem] font-bold tracking-wide uppercase rounded-full px-2 py-0.5 border ${STATUS_STYLES[event.status]}`}>
                    {event.status}
                  </span>
                </div>

                {/* External events are never presented as PXL-run */}
                {event.source === "external" && (
                  <span className="relative self-start text-[0.65rem] rounded-full border border-border bg-surface-2 px-2 py-0.5 text-muted/85">
                    External event{event.organizer_name ? ` · ${event.organizer_name}` : ""}
                  </span>
                )}

                <p className="relative text-[0.875rem] text-muted/92 line-clamp-2">{event.description}</p>

                <div className="relative flex items-center justify-between text-[0.8125rem]">
                  <span className="text-muted/85">
                    {event.participant_count.toLocaleString()} registered
                    {event.max_participants ? ` / ${event.max_participants}` : ""}
                  </span>
                  {event.status !== "ended" && event.status !== "cancelled" && (
                    <span className="text-gold/70 font-medium">{timeUntil(event.end_date ?? event.start_date)}</span>
                  )}
                </div>
              </Link>
            ))}
          </motion.div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button type="button" onClick={() => { const next = page + 1; setPage(next); void load(next, true) }}
                disabled={loading}
                className="rounded-full border border-border px-6 py-2.5 text-[0.875rem] text-muted hover:text-foreground hover:border-gold/30 transition-all disabled:opacity-50">
                {loading ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border border-border bg-surface">
          <span className="text-4xl">📅</span>
          <p className="font-semibold text-foreground">
            {hasFilters ? "No events match these filters" : `No ${tab} events`}
          </p>
          <p className="text-sm text-muted/85 max-w-sm">
            {hasFilters
              ? "Try widening your filters or switching tabs."
              : "Nobody has scheduled an event yet — this isn't a bug. Create the first one."}
          </p>
          {hasFilters ? (
            <button onClick={() => { setQuery(""); setEventType(""); setAttendance(""); setTags([]) }}
              className="mt-1 text-xs text-gold hover:underline">
              Clear all filters
            </button>
          ) : user ? (
            <button onClick={() => setShowCreate(true)}
              className="mt-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-gold/90 transition-colors">
              Create an event
            </button>
          ) : null}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          roleTags={roleTags}
          onClose={() => setShowCreate(false)}
          onCreated={(e) => { setEvents((prev) => [e, ...prev]); setShowCreate(false) }}
        />
      )}
    </div>
  )
}

/* ── Create event modal ───────────────────────────────────── */
function CreateEventModal({ roleTags, onClose, onCreated }: {
  roleTags: CreatorTag[]
  onClose: () => void
  onCreated: (e: EventWithMeta) => void
}) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: "", description: "", event_type: "meetup", start_date: "", end_date: "",
    location: "", attendance_mode: "online", registration_mode: "internal",
    registration_url: "", banner_url: "", max_participants: "", visibility: "public",
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true); setError("")
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/community/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          end_date: form.end_date || null,
          location: form.location || null,
          banner_url: form.banner_url || null,
          registration_url: form.registration_url || null,
          max_participants: form.max_participants ? parseInt(form.max_participants, 10) : null,
          tags: selectedTags,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? d.errors?.[0]?.message ?? "Failed to create event.")
      }
      const { event } = await res.json()
      onCreated(event)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event.")
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-black/90 backdrop-blur-2xl p-6 flex flex-col gap-4 my-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[1.125rem]">Create an Event</h2>
          <button type="button" onClick={onClose} className="text-muted/70 hover:text-muted text-[1.5rem] leading-none">×</button>
        </div>
        {error && <p className="text-[0.875rem] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex flex-col gap-3">
          <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Event title *" maxLength={150}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          <textarea required value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="What is it, and who is it for? *" rows={4} maxLength={3000}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none" />

          <div className="grid grid-cols-2 gap-3">
            <select value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
              {["challenge", "contest", "meetup", "workshop", "webinar"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.attendance_mode} onChange={(e) => setForm((p) => ({ ...p, attendance_mode: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
              <option value="online">Online</option>
              <option value="offline">In person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[0.75rem] text-muted/70">
              Starts *
              <input required type="datetime-local" value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40" />
            </label>
            <label className="flex flex-col gap-1 text-[0.75rem] text-muted/70">
              Ends
              <input type="datetime-local" value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40" />
            </label>
          </div>

          {form.attendance_mode !== "online" && (
            <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Location (city, venue)"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          )}

          <select value={form.registration_mode} onChange={(e) => setForm((p) => ({ ...p, registration_mode: e.target.value }))}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
            <option value="internal">Register here on PXL</option>
            <option value="external">Register on my own site</option>
            <option value="none">No registration — info only</option>
          </select>

          {form.registration_mode === "external" && (
            <input required value={form.registration_url} onChange={(e) => setForm((p) => ({ ...p, registration_url: e.target.value }))}
              placeholder="Registration URL *" type="url"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          )}

          {form.registration_mode === "internal" && (
            <input value={form.max_participants} onChange={(e) => setForm((p) => ({ ...p, max_participants: e.target.value }))}
              placeholder="Max participants (optional)" type="number" min="1"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          )}

          <input value={form.banner_url} onChange={(e) => setForm((p) => ({ ...p, banner_url: e.target.value }))}
            placeholder="Cover image URL (optional)"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />

          {roleTags.length > 0 && (
            <div>
              <p className="text-[0.8125rem] text-muted/85 mb-2">Who is this for?</p>
              <div className="flex flex-wrap gap-2">
                {roleTags.map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => setSelectedTags((prev) => prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id])}
                    className={`text-[0.75rem] rounded-full px-3 py-1 border transition-all ${selectedTags.includes(t.id) ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-[0.8125rem] text-muted/85">
            <input type="checkbox" checked={form.visibility === "private"}
              onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.checked ? "private" : "public" }))} />
            Private (not listed in discovery)
          </label>
        </div>

        <button type="submit" disabled={saving}
          className="rounded-full bg-gold py-3 font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors">
          {saving ? "Creating…" : "Create Event"}
        </button>
      </motion.form>
    </div>
  )
}

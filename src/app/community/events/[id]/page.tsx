"use client"

import { useCallback, useEffect, useState, use } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import type { EventWithMeta } from "@/types/community"

const EVENT_ICONS: Record<string, string> = {
  challenge: "⚡", contest: "🏆", meetup: "🤝", workshop: "🎓", webinar: "📡",
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [event, setEvent] = useState<EventWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (user) { try { headers.Authorization = `Bearer ${await user.getIdToken()}` } catch { /* ignore */ } }
      const res = await fetch(`/api/community/events/${id}`, { headers })
      if (res.status === 404) { setNotFound(true); return }
      if (res.ok) setEvent((await res.json()).event)
    } finally { setLoading(false) }
  }, [id, user])

  useEffect(() => { setTimeout(() => void load(), 0) }, [load])

  // Real view, logged once the event resolves. Organiser views aren't counted.
  useEffect(() => {
    if (event) void fetch(`/api/community/events/${id}/view`, { method: "POST" }).catch(() => {})
  }, [event, id])

  async function toggleRegistration(level: "registered" | "interested") {
    if (!user || !event || busy) return
    setBusy(true); setActionError("")
    try {
      const token = await user.getIdToken()
      const alreadyThis = event.is_registered && event.interest_level === level
      const res = await fetch(`/api/community/events/${id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: alreadyThis ? "unregister" : "register", interest_level: level }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed.")
      setEvent((e) => e ? {
        ...e,
        is_registered: data.is_registered,
        interest_level: data.interest_level,
        participant_count: data.participant_count,
      } : e)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed.")
    } finally { setBusy(false) }
  }

  if (loading) return <div className="max-w-2xl mx-auto w-full h-80 rounded-2xl bg-surface border border-border animate-pulse" />
  if (notFound || !event) {
    return (
      <div className="max-w-2xl mx-auto w-full text-center py-20">
        <p className="font-display font-bold text-xl text-foreground">Event not found</p>
        <Link href="/community/events" className="text-gold mt-3 inline-block hover:underline">← Back to Events</Link>
      </div>
    )
  }

  const isFull = event.max_participants !== null && event.participant_count >= event.max_participants
  const isOver = event.status === "ended" || event.status === "cancelled"

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {event.banner_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={event.banner_url} alt="" className="w-full aspect-[3/1] object-cover" />
        )}

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[2rem]">{EVENT_ICONS[event.event_type] ?? "✦"}</span>
              <div>
                <h1 className="font-display font-bold text-xl text-foreground">{event.title}</h1>
                <p className="text-xs text-muted/85 capitalize mt-0.5">
                  {event.event_type} · {event.attendance_mode === "online" ? "Online" : event.location ?? event.attendance_mode}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[0.65rem] font-bold uppercase rounded-full border border-border px-2 py-0.5 text-muted/85">
              {event.status}
            </span>
          </div>

          {/* Organiser — a member profile only when this is genuinely a PXL event */}
          {event.source === "external" ? (
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
              <p className="text-xs text-muted/85">
                External event{event.organizer_name ? <> organised by <strong className="text-foreground">{event.organizer_name}</strong></> : ""} —
                not run by PXL.
              </p>
              {event.organizer_url && (
                <a href={event.organizer_url} target="_blank" rel="noopener noreferrer nofollow"
                  className="text-xs text-gold hover:underline mt-1 inline-block">
                  Organiser&apos;s site →
                </a>
              )}
            </div>
          ) : event.organiser ? (
            <Link href={`/community/${event.organiser.username}`} className="flex items-center gap-2 text-xs text-muted/85 hover:text-gold w-fit">
              Organised by <strong className="text-foreground">{event.organiser.display_name}</strong>
              {event.organiser.is_verified && <span className="text-gold">✓</span>}
            </Link>
          ) : null}

          <p className="text-sm text-muted/92 whitespace-pre-wrap">{event.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-border pt-3">
            <div>
              <p className="text-[0.6875rem] uppercase tracking-wider text-muted/70">Starts</p>
              <p className="text-foreground">{formatDate(event.start_date)}</p>
            </div>
            {event.end_date && (
              <div>
                <p className="text-[0.6875rem] uppercase tracking-wider text-muted/70">Ends</p>
                <p className="text-foreground">{formatDate(event.end_date)}</p>
              </div>
            )}
          </div>

          {event.rules && (
            <div>
              <p className="text-[0.6875rem] uppercase tracking-wider text-muted/70 mb-1">Rules</p>
              <p className="text-sm text-muted/92 whitespace-pre-wrap">{event.rules}</p>
            </div>
          )}

          {/* Real counters only */}
          <div className="flex items-center gap-4 text-xs text-muted/70 border-t border-border pt-3">
            <span>
              {event.participant_count.toLocaleString()} registered
              {event.max_participants ? ` / ${event.max_participants}` : ""}
            </span>
            <span>{event.view_count.toLocaleString()} view{event.view_count !== 1 ? "s" : ""}</span>
          </div>

          {actionError && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{actionError}</p>}

          {/* Registration */}
          <div className="flex items-center gap-2 flex-wrap">
            {event.registration_mode === "external" && event.registration_url ? (
              <a href={event.registration_url} target="_blank" rel="noopener noreferrer nofollow"
                className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-black hover:bg-gold/90 transition-colors">
                Register on organiser&apos;s site →
              </a>
            ) : event.registration_mode === "none" ? (
              <p className="text-xs text-muted/70">This listing is informational — there&apos;s no registration.</p>
            ) : !user ? (
              <Link href={`/login?from=/community/events/${id}`} className="text-xs text-gold hover:underline">Sign in to register</Link>
            ) : isOver ? (
              <p className="text-xs text-muted/70">Registration is closed.</p>
            ) : (
              <>
                <button onClick={() => toggleRegistration("registered")} disabled={busy || (isFull && !event.is_registered)}
                  className={`rounded-full px-5 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                    event.is_registered && event.interest_level === "registered"
                      ? "bg-gold/20 text-gold border border-gold/40"
                      : "bg-gold text-black hover:bg-gold/90"
                  }`}>
                  {event.is_registered && event.interest_level === "registered" ? "✓ Registered" : isFull ? "Event full" : "Register"}
                </button>
                <button onClick={() => toggleRegistration("interested")} disabled={busy}
                  className={`rounded-full px-4 py-2 text-xs font-medium border transition-colors disabled:opacity-50 ${
                    event.is_registered && event.interest_level === "interested"
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-border text-muted/85 hover:text-foreground"
                  }`}>
                  {event.is_registered && event.interest_level === "interested" ? "★ Interested" : "Interested"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

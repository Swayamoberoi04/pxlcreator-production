"use client"

import { useEffect, useState }  from "react"
import { motion }               from "framer-motion"
import { createAdminClient }    from "@/lib/supabase/admin"
import type { CommunityEvent }  from "@/types/community"

const EVENT_ICONS: Record<string, string> = {
  challenge: "⚡",
  contest:   "🏆",
  meetup:    "🤝",
  workshop:  "🎓",
  webinar:   "📡",
}

const STATUS_STYLES: Record<string, string> = {
  upcoming: "text-gold bg-gold/10 border-gold/20",
  active:   "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  ended:    "text-muted/50 bg-surface border-border",
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return "Ended"
  const days  = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

export default function EventsPage() {
  const [events,  setEvents]  = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<"upcoming"|"active"|"ended">("active")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res  = await fetch(`/api/community/events?status=${tab}&limit=20`)
        if (!res.ok) throw new Error()
        const data = await res.json() as { events: CommunityEvent[] }
        setEvents(data.events ?? [])
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [tab])

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-[1.75rem] text-foreground">
          Community Events
        </h1>
        <p className="text-[0.9375rem] text-muted/60 mt-1">
          Challenges, contests, workshops and meetups for creators.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["active","upcoming","ended"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-[0.8125rem] font-medium capitalize transition-all ${
              tab === t
                ? "bg-gold text-background"
                : "border border-border text-muted/60 hover:border-gold/30 hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-[3rem]">🗓</span>
          <p className="font-display font-black text-[1.25rem]">No {tab} events</p>
          <p className="text-muted/60">Check back soon — new events are added regularly.</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {events.map((event, i) => (
            <motion.article
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-gold/25 transition-all p-5 flex flex-col gap-3"
            >
              {/* Banner */}
              {event.banner_url && (
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[1.75rem]">{EVENT_ICONS[event.event_type] ?? "✦"}</span>
                  <div>
                    <h3 className="font-display font-black text-[1rem] text-foreground leading-tight">
                      {event.title}
                    </h3>
                    <p className="text-[0.75rem] text-muted/50 capitalize mt-0.5">
                      {event.event_type} · {event.is_online ? "Online" : event.location ?? "In-person"}
                    </p>
                  </div>
                </div>

                <span className={`shrink-0 text-[0.65rem] font-bold tracking-wide uppercase rounded-full px-2 py-0.5 border ${STATUS_STYLES[event.status]}`}>
                  {event.status}
                </span>
              </div>

              <p className="relative text-[0.875rem] text-muted/70 line-clamp-2">
                {event.description}
              </p>

              {/* Prizes */}
              {event.prizes && event.prizes.length > 0 && (
                <div className="relative flex flex-wrap gap-2">
                  {event.prizes.slice(0, 3).map((p) => (
                    <span key={p.rank} className="text-[0.75rem] text-gold/80 bg-gold/8 border border-gold/20 rounded-full px-2.5 py-0.5">
                      {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"} {p.prize}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative flex items-center justify-between text-[0.8125rem]">
                <span className="text-muted/50">
                  {event.participant_count.toLocaleString()} participants
                </span>
                {event.status !== "ended" && (
                  <span className="text-gold/70 font-medium">
                    {timeUntil(event.end_date ?? event.start_date)}
                  </span>
                )}
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}
    </div>
  )
}

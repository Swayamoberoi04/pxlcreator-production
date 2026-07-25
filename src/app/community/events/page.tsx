"use client"

import { useEffect, useState }  from "react"
import { motion }               from "framer-motion"
import { CommunityFeaturePreview } from "@/components/community/CommunityFeaturePreview"
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
  ended:    "text-muted/85 bg-surface border-border",
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return "Ended"
  const days  = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

// ── Sample events shown when API returns empty ────────────────────
const SAMPLE_EVENTS = [
  {
    id: "se1", title: "Monthly Editing Challenge — July Edition",
    description: "Submit your best colour-graded edit from any footage shot this month. Judged on creativity, colour work, and storytelling.",
    event_type: "challenge", status: "upcoming",
    start_date: "2026-07-01", end_date: "2026-07-31",
    is_online: true, location: null,
    participant_count: 0, max_participants: 500,
    prizes: [{ rank: 1, prize: "$500 Adobe Credit" }, { rank: 2, prize: "$200 Adobe Credit" }, { rank: 3, prize: "$100 Adobe Credit" }],
    banner_url: null,
  },
  {
    id: "se2", title: "Travel Storytelling Contest",
    description: "Share a 60–90 second travel film that tells a story. Any location, any style. Best narrative wins.",
    event_type: "contest", status: "upcoming",
    start_date: "2026-08-01", end_date: "2026-08-15",
    is_online: true, location: null,
    participant_count: 0, max_participants: 300,
    prizes: [{ rank: 1, prize: "DJI Mini 4 Pro" }, { rank: 2, prize: "$300 Cash" }, { rank: 3, prize: "PXL Pro 1yr" }],
    banner_url: null,
  },
  {
    id: "se3", title: "Cinematic Reel Competition",
    description: "Create a 2–3 minute cinematic reel showcasing your best footage from 2026. Music, colour, and cuts all count.",
    event_type: "contest", status: "upcoming",
    start_date: "2026-09-01", end_date: "2026-09-30",
    is_online: true, location: null,
    participant_count: 0, max_participants: 400,
    prizes: [{ rank: 1, prize: "$1,000 Cash + Feature" }, { rank: 2, prize: "$400 Cash" }, { rank: 3, prize: "$200 Cash" }],
    banner_url: null,
  },
  {
    id: "se4", title: "Creator Meetup — London",
    description: "An in-person meetup for PXL Creator community members in London. Network, share gear, and collab opportunities.",
    event_type: "meetup", status: "upcoming",
    start_date: "2026-10-12", end_date: "2026-10-12",
    is_online: false, location: "London, UK",
    participant_count: 0, max_participants: 80,
    prizes: [],
    banner_url: null,
  },
]

function SampleEventCard({ event, i }: { event: typeof SAMPLE_EVENTS[0]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-gold/25 transition-all p-5 flex flex-col gap-3"
    >
      <div className="absolute top-3 right-3">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">Preview</span>
      </div>
      <div className="flex items-start gap-3 pr-16">
        <span className="text-[1.75rem]">{EVENT_ICONS[event.event_type] ?? "✦"}</span>
        <div>
          <h3 className="font-display font-black text-[1rem] text-foreground leading-tight">{event.title}</h3>
          <p className="text-[0.75rem] text-muted/85 capitalize mt-0.5">
            {event.event_type} · {event.is_online ? "Online" : event.location ?? "In-person"}
          </p>
        </div>
      </div>
      <p className="text-[0.875rem] text-muted/92 line-clamp-2">{event.description}</p>
      {event.prizes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {event.prizes.slice(0, 3).map((p) => (
            <span key={p.rank} className="text-[0.75rem] text-gold/80 bg-gold/8 border border-gold/20 rounded-full px-2.5 py-0.5">
              {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"} {p.prize}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-[0.8125rem] pt-1">
        <span className="text-muted/85">
          Up to {event.max_participants} participants
        </span>
        <span className={`text-[0.65rem] font-bold tracking-wide uppercase rounded-full px-2.5 py-1 border ${STATUS_STYLES[event.status]}`}>
          {event.status}
        </span>
      </div>
    </motion.div>
  )
}

export default function EventsPage() {
  const [events,  setEvents]  = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<"upcoming"|"active"|"ended">("upcoming")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res  = await fetch(`/api/community/events?status=${tab}&limit=20`)
        if (!res.ok) throw new Error()
        const data = await res.json() as { events: CommunityEvent[] }
        setEvents(data.events ?? [])
      } catch { setEvents([]) }
      finally { setLoading(false) }
    }
    void load()
  }, [tab])

  const isEmpty = !loading && events.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-black text-[1.75rem] text-foreground">Community Events</h1>
        <p className="text-[0.9375rem] text-muted/85 mt-1">Challenges, contests, workshops and meetups for creators.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["upcoming","active","ended"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-[0.8125rem] font-medium capitalize transition-all ${tab === t ? "bg-gold text-background" : "border border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-surface border border-border animate-pulse" />)}
        </div>
      ) : events.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event, i) => (
            <motion.article key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
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
                    <h3 className="font-display font-black text-[1rem] text-foreground leading-tight">{event.title}</h3>
                    <p className="text-[0.75rem] text-muted/85 capitalize mt-0.5">
                      {event.event_type} · {event.is_online ? "Online" : event.location ?? "In-person"}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 text-[0.65rem] font-bold tracking-wide uppercase rounded-full px-2 py-0.5 border ${STATUS_STYLES[event.status]}`}>{event.status}</span>
              </div>
              <p className="relative text-[0.875rem] text-muted/92 line-clamp-2">{event.description}</p>
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
                <span className="text-muted/85">{event.participant_count.toLocaleString()} participants</span>
                {event.status !== "ended" && <span className="text-gold/70 font-medium">{timeUntil(event.end_date ?? event.start_date)}</span>}
              </div>
            </motion.article>
          ))}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
          <div className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/5 px-5 py-4">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-display font-black text-sm text-foreground">Community events launching soon</p>
              <p className="text-xs text-muted/85 mt-0.5">Preview the contests and challenges coming to PXL Creator</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAMPLE_EVENTS.map((event, i) => <SampleEventCard key={event.id} event={event} i={i} />)}
          </div>
        </motion.div>
      )}

      {isEmpty && (
        <CommunityFeaturePreview
          variant="lightning"
          featureKey="events"
          launch="Q3 2026"
          roadmap={[
            { quarter: "Q1 2026", label: "Event infrastructure & submissions", done: true },
            { quarter: "Q2 2026", label: "Prize pool & judging framework", done: true },
            { quarter: "Q3 2026", label: "First live community contests", done: false },
            { quarter: "Q4 2026", label: "Sponsored events & meetups globally", done: false },
          ]}
          benefits={[
            "Guaranteed spot in the first community contest",
            "Early bird prize pool multiplier",
            "Judge consideration for early members",
            "Event notification before public announcement",
          ]}
        />
      )}
    </div>
  )
}

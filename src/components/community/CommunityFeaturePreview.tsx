"use client"

import { useState } from "react"
import { motion }   from "framer-motion"

export type PreviewVariant = "rocket" | "lightning" | "film" | "globe"

const VARIANTS: Record<PreviewVariant, { icon: string; headline: string; sub: string; color: string }> = {
  rocket: {
    icon:     "🚀",
    headline: "Building Something Extraordinary",
    sub:      "This section is being crafted for the next generation of creators. Join early and help shape the future of the PXL Creator ecosystem.",
    color:    "gold",
  },
  lightning: {
    icon:     "⚡",
    headline: "Creator Labs — In Active Development",
    sub:      "Our engineering team is working around the clock to bring this feature to life. Your feedback shapes the final experience.",
    color:    "blue",
  },
  film: {
    icon:     "🎬",
    headline: "In Production",
    sub:      "Our team is building this experience behind the scenes. Every detail is being polished before the curtain rises.",
    color:    "purple",
  },
  globe: {
    icon:     "🌍",
    headline: "Coming to the Ecosystem",
    sub:      "This feature will launch globally for all creators very soon. Be the first to experience it when it drops.",
    color:    "emerald",
  },
}

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; btn: string }> = {
  gold:    { border: "border-gold/30",     bg: "bg-gold/10",     text: "text-gold",     btn: "bg-gold text-background hover:bg-gold/90" },
  blue:    { border: "border-blue-400/30", bg: "bg-blue-400/10", text: "text-blue-400", btn: "bg-blue-500 text-white hover:bg-blue-600" },
  purple:  { border: "border-purple-400/30", bg: "bg-purple-400/10", text: "text-purple-400", btn: "bg-purple-500 text-white hover:bg-purple-600" },
  emerald: { border: "border-emerald-400/30", bg: "bg-emerald-400/10", text: "text-emerald-400", btn: "bg-emerald-500 text-white hover:bg-emerald-600" },
}

interface RoadmapItem {
  quarter: string
  label:   string
  done?:   boolean
}

interface Props {
  variant:       PreviewVariant
  featureKey:    string          // e.g. "channels" — sent to waitlist API
  launch?:       string          // e.g. "Q3 2026"
  roadmap?:      RoadmapItem[]
  benefits?:     string[]
  className?:    string
}

const DEFAULT_ROADMAP: RoadmapItem[] = [
  { quarter: "Q1 2026", label: "Infrastructure & Architecture", done: true },
  { quarter: "Q2 2026", label: "Beta Testing with Select Creators", done: true },
  { quarter: "Q3 2026", label: "Public Launch", done: false },
  { quarter: "Q4 2026", label: "Advanced Features & Integrations", done: false },
]

const DEFAULT_BENEFITS = [
  "Early access before public launch",
  "Shape the feature with direct feedback",
  "Exclusive early-adopter badge",
  "Priority support from our team",
]

export function CommunityFeaturePreview({
  variant,
  featureKey,
  launch = "Q3 2026",
  roadmap = DEFAULT_ROADMAP,
  benefits = DEFAULT_BENEFITS,
  className = "",
}: Props) {
  const v      = VARIANTS[variant]
  const colors = COLOR_MAP[v.color]

  const [email,       setEmail]       = useState("")
  const [name,        setName]        = useState("")
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [err,         setErr]         = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setErr("Email is required"); return }
    setSubmitting(true)
    setErr("")
    try {
      const res = await fetch("/api/community/waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), email: email.trim(), feature: featureKey }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? "Something went wrong")
      }
      setSubmitted(true)
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Please try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col gap-10 ${className}`}
    >
      {/* Coming Soon Banner */}
      <div className={`rounded-3xl border ${colors.border} ${colors.bg} p-8 md:p-12 text-center relative overflow-hidden`}>
        {/* Decorative blobs */}
        <div className={`absolute -top-16 -right-16 size-48 rounded-full ${colors.bg} blur-3xl opacity-50 pointer-events-none`} />
        <div className={`absolute -bottom-16 -left-16 size-48 rounded-full ${colors.bg} blur-3xl opacity-30 pointer-events-none`} />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <span className="text-6xl">{v.icon}</span>
          <div>
            <h2 className={`font-display font-black text-2xl md:text-3xl ${colors.text}`}>{v.headline}</h2>
            <p className="text-sm text-muted/70 mt-2 max-w-xl mx-auto leading-relaxed">{v.sub}</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${colors.border} ${colors.bg}`}>
            <span className="text-xs font-bold uppercase tracking-widest text-muted/60">Expected Launch</span>
            <span className={`text-xs font-black uppercase tracking-widest ${colors.text}`}>{launch}</span>
          </div>
        </div>
      </div>

      {/* Roadmap + Benefits side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Roadmap */}
        <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col gap-4">
          <h3 className="font-display font-black text-sm uppercase tracking-widest text-muted/50">Roadmap Preview</h3>
          <div className="flex flex-col gap-3">
            {roadmap.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={[
                  "size-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                  item.done ? `${colors.border} ${colors.bg}` : "border-border bg-transparent",
                ].join(" ")}>
                  {item.done && <span className={`text-[10px] ${colors.text}`}>✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-black ${item.done ? colors.text : "text-muted/40"}`}>{item.quarter}</span>
                  <span className="mx-2 text-muted/30">·</span>
                  <span className={`text-xs ${item.done ? "text-foreground" : "text-muted/50"}`}>{item.label}</span>
                </div>
                {!item.done && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted/30 shrink-0">Soon</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Community Benefits */}
        <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col gap-4">
          <h3 className="font-display font-black text-sm uppercase tracking-widest text-muted/50">Why Join Early</h3>
          <div className="flex flex-col gap-3">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`text-sm mt-0.5 shrink-0 ${colors.text}`}>★</span>
                <span className="text-sm text-foreground/80">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Waitlist Form */}
      <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
        <div className="max-w-lg mx-auto flex flex-col gap-5">
          <div className="text-center">
            <h3 className="font-display font-black text-lg text-foreground">Get Notified at Launch</h3>
            <p className="text-sm text-muted/60 mt-1">Join the waitlist and we&#39;ll notify you the moment this goes live.</p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 text-center`}
            >
              <span className="text-3xl">🎉</span>
              <p className={`font-display font-black text-base mt-2 ${colors.text}`}>You&#39;re on the list!</p>
              <p className="text-sm text-muted/60 mt-1">We&#39;ll email you when this feature launches.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
                />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
                />
              </div>
              {err && <p className="text-xs text-red-400">{err}</p>}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full rounded-xl px-6 py-3 text-sm font-black transition-all duration-150 disabled:opacity-60 ${colors.btn}`}
              >
                {submitting ? "Joining…" : "Notify Me When It Launches"}
              </button>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  )
}

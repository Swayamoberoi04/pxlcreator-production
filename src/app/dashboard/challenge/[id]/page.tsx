"use client"

/**
 * /dashboard/challenge/[id]
 *
 * Full challenge detail page — shows every day, tracks completion per day,
 * persists all progress to Supabase via the existing progress API.
 *
 * Data flow:
 *  1. Challenge content  — CHALLENGE_MAP[id]  (static, from challenges.ts)
 *  2. Completed days     — GET /api/dashboard/progress → challengeCompletions[id]
 *  3. Mark day complete  — POST /api/dashboard/progress { action: "complete_day" }
 *  4. Start challenge    — POST /api/dashboard/progress { action: "start_item" }
 */

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter }             from "next/navigation"
import { motion, AnimatePresence }          from "framer-motion"
import Link                                 from "next/link"
import { useAuth }                          from "@/contexts/AuthContext"
import { ProgressRing }                     from "@/components/dashboard/ProgressRing"
import { CHALLENGE_MAP, type Challenge, type ChallengeDay } from "@/lib/dashboard/challenges"

/* ── Types ──────────────────────────────────────────────────────── */
interface ProgressRow {
  item_id:         string
  item_type:       string
  stage_index:     number
  completed_tasks: number
  total_tasks:     number
  progress_pct:    number
  completed:       boolean
}

interface ProgressResponse {
  progress:             ProgressRow[]
  challengeCompletions: Record<string, number[]>
}

/* ── Difficulty badge color ──────────────────────────────────────── */
function difficultyColor(d: string) {
  if (d === "beginner")     return "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
  if (d === "advanced")     return "text-rose-400 bg-rose-400/10 border-rose-400/25"
  return "text-amber-400 bg-amber-400/10 border-amber-400/25"
}

/* ── Task-type icon (mirrors growth-path types) ─────────────────── */
function taskTypeIcon(skills: string[]): string {
  if (!skills.length) return "◈"
  return "◈"
}

/* ── Day bubble ─────────────────────────────────────────────────── */
function DayBubble({
  day,
  isCompleted,
  isCurrent,
  isSelected,
  accentColor,
  onClick,
}: {
  day:         number
  isCompleted: boolean
  isCurrent:   boolean
  isSelected:  boolean
  accentColor: string
  onClick:     () => void
}) {
  const base = "relative flex items-center justify-center rounded-full text-[0.7rem] font-black transition-all duration-200 cursor-pointer select-none"
  const size = "size-9 sm:size-10"

  let style: React.CSSProperties = {}
  let cls = `${base} ${size}`

  if (isCompleted) {
    style = { background: `${accentColor}20`, borderColor: accentColor, color: accentColor }
    cls  += " border-2"
  } else if (isCurrent) {
    style = { borderColor: accentColor, color: accentColor }
    cls  += " border-2 ring-2 ring-offset-1 ring-offset-black"
    style.boxShadow = `0 0 0 2px ${accentColor}40`
  } else if (isSelected) {
    style = { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)" }
    cls  += " border bg-surface-2"
  } else {
    style = { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }
    cls  += " border bg-surface/40"
  }

  return (
    <button type="button" onClick={onClick} className={cls} style={style} aria-label={`Day ${day}`}>
      {isCompleted ? "✓" : day}
    </button>
  )
}

/* ── Day detail panel ────────────────────────────────────────────── */
function DayDetail({
  dayData,
  isCompleted,
  isCurrent,
  accentColor,
  onMarkComplete,
  saving,
}: {
  dayData:        ChallengeDay
  isCompleted:    boolean
  isCurrent:      boolean
  accentColor:    string
  onMarkComplete: (note: string) => void
  saving:         boolean
}) {
  const [note, setNote] = useState("")

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-surface overflow-hidden"
    >
      {/* Day header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
        <div
          className="shrink-0 size-9 rounded-full border-2 flex items-center justify-center text-[0.75rem] font-black"
          style={{ borderColor: isCompleted ? accentColor : "rgba(255,255,255,0.15)", background: isCompleted ? `${accentColor}20` : "transparent", color: isCompleted ? accentColor : "rgba(255,255,255,0.4)" }}
        >
          {isCompleted ? "✓" : dayData.day}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70 mb-0.5">Day {dayData.day}</p>
          <p className="font-display font-black text-[1rem] text-foreground leading-tight">{dayData.title}</p>
        </div>
        <span className="shrink-0 text-xs text-muted/70">⏱ {dayData.estimatedMinutes} min</span>
      </div>

      {/* Prompt */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70 mb-2">Your Prompt</p>
        <p className="text-[0.9375rem] text-foreground/90 leading-relaxed">{dayData.prompt}</p>
      </div>

      {/* Tip */}
      <div className="mx-5 mb-4 rounded-xl border border-border bg-surface-2 px-4 py-3 flex items-start gap-2.5">
        <span className="text-gold text-sm shrink-0 mt-0.5">💡</span>
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gold/60 mb-1">Pro Tip</p>
          <p className="text-[0.8125rem] text-muted/92 leading-relaxed">{dayData.tip}</p>
        </div>
      </div>

      {/* Skills */}
      {dayData.skills.length > 0 && (
        <div className="px-5 mb-4 flex flex-wrap gap-2">
          {dayData.skills.map((skill) => (
            <span key={skill} className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[0.7rem] font-medium text-muted/85">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Preset recommendation */}
      {dayData.presetRecommended && (
        <div className="px-5 mb-4">
          <Link
            href={`/presets/${dayData.presetRecommended}`}
            className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/5 px-3 py-1.5 text-[0.75rem] font-medium text-gold/80 hover:bg-gold/10 transition-colors"
          >
            <span className="opacity-70">◈</span>
            Recommended preset: {dayData.presetRecommended.replace(/-/g, " ")}
          </Link>
        </div>
      )}

      {/* Note + Mark Complete */}
      {!isCompleted && isCurrent && (
        <div className="px-5 pb-5 flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="day-note" className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70">
              Add a note (optional)
            </label>
            <textarea
              id="day-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you capture? What did you learn?"
              rows={2}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-[0.875rem] text-foreground placeholder:text-muted/70 resize-none focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => onMarkComplete(note.trim())}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-2.5 text-[0.875rem] font-bold text-background hover:bg-gold/90 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="size-3.5 rounded-full border-2 border-background/40 border-t-background animate-spin" />
                Saving…
              </>
            ) : (
              "✓ Mark Day Complete"
            )}
          </button>
        </div>
      )}

      {/* Already completed note */}
      {isCompleted && (
        <div className="px-5 pb-5 flex items-center gap-2 border-t border-border pt-4">
          <span style={{ color: accentColor }}>✓</span>
          <p className="text-[0.8125rem]" style={{ color: accentColor }}>Day {dayData.day} completed</p>
        </div>
      )}

      {/* Future day: can still mark complete (non-sequential) */}
      {!isCompleted && !isCurrent && (
        <div className="px-5 pb-5 flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-[0.75rem] text-muted/70">You can mark any day complete at any time.</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="day-note-future" className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70">
              Add a note (optional)
            </label>
            <textarea
              id="day-note-future"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you capture? What did you learn?"
              rows={2}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-[0.875rem] text-foreground placeholder:text-muted/70 resize-none focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => onMarkComplete(note.trim())}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-2.5 text-[0.875rem] font-semibold text-muted/92 hover:border-gold/30 hover:text-foreground transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Mark Complete"}
          </button>
        </div>
      )}
    </motion.div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function ChallengeSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-4 w-24 rounded-full bg-surface-2" />
      <div className="h-36 rounded-2xl bg-surface border border-border" />
      <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-full bg-surface border border-border" />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-surface border border-border" />
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ChallengePage() {
  const params  = useParams()
  const router  = useRouter()
  const { user } = useAuth()

  const id        = typeof params.id === "string" ? params.id : ""
  const challenge = CHALLENGE_MAP[id] as Challenge | undefined

  const [completedDays,    setCompletedDays]    = useState<number[]>([])
  const [progressRow,      setProgressRow]      = useState<ProgressRow | null>(null)
  const [selectedDay,      setSelectedDay]      = useState<number | null>(null)
  const [savingDay,        setSavingDay]        = useState<number | null>(null)
  const [starting,         setStarting]         = useState(false)
  const [hasStarted,       setHasStarted]       = useState(false)
  const [loading,          setLoading]          = useState(true)

  // Redirect if challenge doesn't exist
  useEffect(() => {
    if (!id || !challenge) router.replace("/dashboard")
  }, [id, challenge, router])

  const loadProgress = useCallback(async () => {
    if (!user || !challenge) return
    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/dashboard/progress", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json() as ProgressResponse

      const days = (data.challengeCompletions?.[id] ?? []).sort((a, b) => a - b)
      setCompletedDays(days)

      const row = (data.progress ?? []).find(
        (p) => p.item_id === id && p.item_type === "challenge"
      ) ?? null
      setProgressRow(row)
      setHasStarted(row !== null)

      // Auto-select current day (first uncompleted)
      if (selectedDay === null) {
        const completedSet = new Set(days)
        const next = Array.from({ length: challenge.totalDays }, (_, i) => i + 1)
          .find((d) => !completedSet.has(d))
        setSelectedDay(next ?? challenge.totalDays)
      }
    } catch (err) {
      console.error("[challenge page]", err)
    } finally {
      setLoading(false)
    }
  }, [user, challenge, id, selectedDay])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void loadProgress()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleStart() {
    if (!user || !challenge) return
    setStarting(true)
    try {
      const token = await user.getIdToken()
      await fetch("/api/dashboard/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ action: "start_item", itemType: "challenge", itemId: id }),
      })
      setHasStarted(true)
      await loadProgress()
    } catch (err) {
      console.error("[challenge start]", err)
    } finally {
      setStarting(false)
    }
  }

  async function handleMarkComplete(day: number, note: string) {
    if (!user || !challenge) return
    setSavingDay(day)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/dashboard/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          action:    "complete_day",
          itemType:  "challenge",
          itemId:    id,
          dayNumber: day,
          note:      note || undefined,
        }),
      })
      if (res.ok) {
        // Optimistically update local state immediately
        setCompletedDays((prev) => {
          const next = Array.from(new Set([...prev, day])).sort((a, b) => a - b)
          return next
        })
        // Advance selected day to next uncompleted
        setSelectedDay((prev) => {
          const completedSet = new Set([...(completedDays), day])
          const next = Array.from({ length: challenge.totalDays }, (_, i) => i + 1)
            .find((d) => !completedSet.has(d))
          return next ?? prev
        })
        // Refresh from server for accurate progress %
        void loadProgress()
      }
    } catch (err) {
      console.error("[challenge complete]", err)
    } finally {
      setSavingDay(null)
    }
  }

  if (!challenge) return null

  const completedSet = new Set(completedDays)
  const totalDays    = challenge.totalDays
  const doneCount    = completedDays.length
  const progressPct  = progressRow?.progress_pct ?? Math.round((doneCount / totalDays) * 100)
  const accentColor  = challenge.color

  // Current day = next uncompleted (for styling the "active" bubble)
  const currentDay = Array.from({ length: totalDays }, (_, i) => i + 1)
    .find((d) => !completedSet.has(d)) ?? totalDays

  const selectedDayData = selectedDay !== null
    ? challenge.days.find((d) => d.day === selectedDay) ?? null
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">

      {/* Back link */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted/70 hover:text-foreground transition-colors mb-8">
        ← Dashboard
      </Link>

      {loading ? (
        <ChallengeSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-8"
        >

          {/* ── Challenge header card ── */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 w-full" style={{ background: accentColor }} />

            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                {/* Icon + progress ring */}
                <div className="relative shrink-0">
                  <ProgressRing progress={progressPct} size={56} stroke={3.5} color={accentColor}>
                    <span className="text-2xl leading-none">{challenge.icon}</span>
                  </ProgressRing>
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${difficultyColor(challenge.difficulty)}`}
                    >
                      {challenge.difficulty}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[0.65rem] font-medium text-muted/85">
                      {totalDays} days
                    </span>
                  </div>
                  <h1 className="font-display font-black text-[1.25rem] sm:text-[1.5rem] text-foreground leading-tight">
                    {challenge.title}
                  </h1>
                  <p className="text-[0.8125rem] text-muted/85 mt-1">{challenge.tagline}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-[0.875rem] text-muted/85 leading-relaxed">{challenge.description}</p>

              {/* Progress strip */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%`, background: accentColor }}
                  />
                </div>
                <span className="shrink-0 text-[0.75rem] font-bold tabular-nums" style={{ color: accentColor }}>
                  {doneCount} / {totalDays}
                </span>
              </div>

              {/* Reward */}
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 flex items-center gap-2.5">
                <span className="text-gold">🏆</span>
                <p className="text-[0.8125rem] text-muted/85">
                  <span className="font-semibold text-foreground/92">Reward: </span>
                  {challenge.reward}
                </p>
              </div>

              {/* Start button — shown only when not yet started */}
              {!hasStarted && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={starting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-3 text-[0.9375rem] font-bold text-background hover:bg-gold/90 transition-all active:scale-[0.97] disabled:opacity-60"
                >
                  {starting ? (
                    <>
                      <span className="size-4 rounded-full border-2 border-background/40 border-t-background animate-spin" />
                      Starting…
                    </>
                  ) : (
                    "Start Challenge"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ── Day grid ── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-[0.9375rem] text-foreground/92 uppercase tracking-wider">
                All Days
              </h2>
              {doneCount > 0 && (
                <span className="text-[0.75rem] font-semibold" style={{ color: accentColor }}>
                  {doneCount} completed
                </span>
              )}
            </div>

            {/* Grid of day bubbles */}
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {challenge.days.map((d) => (
                <DayBubble
                  key={d.day}
                  day={d.day}
                  isCompleted={completedSet.has(d.day)}
                  isCurrent={d.day === currentDay}
                  isSelected={d.day === selectedDay}
                  accentColor={accentColor}
                  onClick={() => setSelectedDay((prev) => prev === d.day ? null : d.day)}
                />
              ))}
            </div>

            <p className="text-[0.75rem] text-muted/70">
              Tap any day to view the prompt. Days can be completed in any order.
            </p>
          </section>

          {/* ── Selected day detail ── */}
          <AnimatePresence mode="wait">
            {selectedDayData && (
              <motion.section key={selectedDay} className="flex flex-col gap-3">
                <DayDetail
                  dayData={selectedDayData}
                  isCompleted={completedSet.has(selectedDayData.day)}
                  isCurrent={selectedDayData.day === currentDay}
                  accentColor={accentColor}
                  onMarkComplete={(note) => handleMarkComplete(selectedDayData.day, note)}
                  saving={savingDay === selectedDayData.day}
                />
              </motion.section>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </div>
  )
}

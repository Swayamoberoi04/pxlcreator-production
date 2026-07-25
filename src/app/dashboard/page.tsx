"use client"

/**
 * /dashboard — Intelligent, personalized creator dashboard.
 *
 * Sections:
 *  1. Welcome header — greeting + Style DNA badge + streak
 *  2. Style DNA card (full)
 *  3. Creator Analytics strip
 *  4. Growth Path card — current stage + next task
 *  5. Active Challenge — today's prompt + mark complete
 *  6. Continue Learning — current course + next lesson
 *  7. Personalised recommendation feed
 *  8. Community picks
 *  9. Quick actions
 */

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence }          from "framer-motion"
import Link                                  from "next/link"
import { useAuth }                          from "@/contexts/AuthContext"
import { useOnboardingStore }               from "@/store/onboarding"
import { StyleDNACard }                     from "@/components/personalization/StyleDNACard"
import { PersonalizedFeed }                 from "@/components/personalization/PersonalizedFeed"
import { ProgressRing }                     from "@/components/dashboard/ProgressRing"
import type { StyleDNA }                    from "@/types/onboarding"
import type { CreatorAnalytics }            from "@/app/api/dashboard/analytics/route"

/* ── Types ──────────────────────────────────────────────────── */
interface DashboardProfile {
  id: string; firebase_uid: string; professions: string[]; skill_level: string
  style_dna_title?: string; style_dna_tagline?: string; style_dna_badge?: string; style_dna_color?: string
  style_dna_archetypes?: string[]; onboarding_completed_at?: string
  active_path_id?: string; active_challenge_id?: string; active_course_id?: string
  consistency_streak?: number; last_activity_at?: string
}

interface PathProgress { stage_index: number; completed_tasks: number; total_tasks: number; progress_pct: number; completed: boolean }
interface ActivePath   { id: string; title: string; tagline: string; icon: string; color: string; difficulty: string; estimatedWeeks: number; score: number; progress: PathProgress | null; stages: { index: number; title: string; description: string; tasks: { id: string; title: string; description: string; estimatedMinutes: number; type: string }[] }[] }
interface ActiveChallenge { id: string; title: string; tagline: string; icon: string; color: string; totalDays: number; progress: PathProgress | null; completedDays: number[]; todaysDay: number; days: { day: number; title: string; prompt: string; tip: string; estimatedMinutes: number }[] }
interface ActiveCourse  { id: string; title: string; tagline: string; icon: string; color: string; totalLessons: number; estimatedHours: number; progress: PathProgress | null; completedLessonIds: string[]; nextLesson: { lessonId: string; lessonTitle: string; moduleTitle: string; duration: string; lessonType?: string } | null; modules: { id: string; title: string; lessons: { id: string; title: string; duration: string; type: string; free: boolean }[] }[] }

interface DashboardData {
  profile:         DashboardProfile
  activePath:      ActivePath | null
  activeChallenge: ActiveChallenge | null
  activeCourse:    ActiveCourse | null
  topPaths:        { id: string; title: string; tagline: string; icon: string; color: string; score: number }[]
  topChallenges:   { id: string; title: string; tagline: string; icon: string; color: string; score: number; totalDays: number }[]
  topCourses:      { id: string; title: string; tagline: string; icon: string; color: string; score: number; totalLessons: number }[]
}

/* ── Helpers ─────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function dnaFromProfile(p: DashboardProfile): StyleDNA | null {
  if (!p.style_dna_title || !p.style_dna_tagline || !p.style_dna_badge || !p.style_dna_color) return null
  return {
    title:         p.style_dna_title,
    tagline:       p.style_dna_tagline,
    badge:         p.style_dna_badge,
    primaryColor:  p.style_dna_color,
    archetypes:    p.style_dna_archetypes    ?? [],
    topCategories: [],
  }
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 rounded-full bg-surface-2" />
        <div className="h-8 w-64 rounded-full bg-surface-2 opacity-70" />
      </div>
      <div className="h-44 rounded-2xl bg-surface border border-border" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-surface border border-border" />)}
      </div>
      {[0,1].map((i) => <div key={i} className="h-32 rounded-2xl bg-surface border border-border" />)}
    </div>
  )
}

/* ── Empty / no onboarding ───────────────────────────────────── */
function EmptyDashboard({ onStart }: { onStart: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      className="flex flex-col items-center gap-8 py-16 text-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
        <div className="absolute inset-3 rounded-full bg-gold/15 animate-pulse [animation-delay:150ms]" />
        <div className="absolute inset-6 rounded-full bg-gold/20 flex items-center justify-center">
          <span className="text-[1.5rem]">✦</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 max-w-md">
        <h2 className="font-display font-black text-[1.5rem] text-foreground">Your creative universe awaits</h2>
        <p className="text-[0.9375rem] text-muted/92 leading-relaxed">
          Complete the 5-minute onboarding to unlock your personalised Style DNA, growth path, curated challenges, and a dashboard built entirely around you.
        </p>
      </div>
      <button type="button" onClick={onStart}
        className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-[0.9375rem] font-semibold text-background hover:bg-gold/90 transition-all active:scale-[0.97]">
        Build My Style DNA <span aria-hidden="true">→</span>
      </button>
    </motion.div>
  )
}

/* ── Analytics strip ─────────────────────────────────────────── */
function AnalyticsStrip({ analytics, accentColor }: { analytics: CreatorAnalytics; accentColor: string }) {
  const stats = [
    { label: "Challenge Days",   value: analytics.challengeDaysCompleted },
    { label: "Lessons Done",     value: analytics.coursesCompleted },
    { label: "Presets Explored", value: analytics.presetsViewed },
    { label: "Community Rep",    value: analytics.communityReputation },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-surface p-3.5 flex flex-col gap-1">
          <p className="font-display font-black text-[1.25rem] text-foreground" style={{ color: s.value > 0 ? accentColor : undefined }}>
            {s.value.toLocaleString()}
          </p>
          <p className="text-[0.7rem] text-muted/85 uppercase tracking-wider font-semibold">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Growth Path card ────────────────────────────────────────── */
function GrowthPathCard({ path, onCompleteTask, accentColor }: {
  path: ActivePath; onCompleteTask: () => void; accentColor: string
}) {
  const progress    = path.progress
  const stageIndex  = progress?.stage_index ?? 0
  const stage       = path.stages[stageIndex]
  const nextTask    = stage?.tasks[progress?.completed_tasks ?? 0]
  const progressPct = progress?.progress_pct ?? 0
  const [completing, setCompleting] = useState(false)

  async function handleComplete() {
    setCompleting(true)
    try { onCompleteTask() } finally { setCompleting(false) }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-sm text-foreground truncate">{path.title}</p>
          <p className="text-xs text-muted/85 mt-0.5">Stage {stageIndex + 1} of {path.stages.length}: {stage?.title}</p>
        </div>
        <ProgressRing progress={progressPct} size={44} stroke={3} color={accentColor}>
          <span className="text-[0.6rem] font-black text-foreground">{progressPct}%</span>
        </ProgressRing>
      </div>

      {/* Current task */}
      {nextTask ? (
        <div className="p-5 flex flex-col gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70 mb-1">Next Task</p>
            <p className="font-display font-black text-[0.9375rem] text-foreground">{nextTask.title}</p>
            <p className="text-xs text-muted/85 mt-1 leading-relaxed line-clamp-2">{nextTask.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted/70">â± {nextTask.estimatedMinutes} min</span>
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className="ml-auto rounded-full px-4 py-1.5 text-xs font-bold bg-gold text-background hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {completing ? "Marking…" : "Mark Complete"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center">
          <p className="text-sm font-semibold text-gold">Stage Complete — moving to the next stage…</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-surface-2">
        <div className="h-full transition-all duration-700" style={{ width: `${progressPct}%`, background: accentColor }} />
      </div>
    </div>
  )
}

/* ── Challenge card ──────────────────────────────────────────── */
function ChallengeCard({ challenge, onCompleteDay, accentColor }: {
  challenge: ActiveChallenge; onCompleteDay: (day: number) => void; accentColor: string
}) {
  const completedSet = new Set(challenge.completedDays)
  const todayDay     = Math.min(challenge.todaysDay, challenge.totalDays)
  const todayData    = challenge.days.find((d) => d.day === todayDay)
  const alreadyDone  = completedSet.has(todayDay)
  const progressPct  = Math.round((completedSet.size / challenge.totalDays) * 100)
  const [marking, setMarking] = useState(false)
  const [done,    setDone]    = useState(alreadyDone)

  async function markComplete() {
    if (done) return
    setMarking(true)
    try { onCompleteDay(todayDay); setDone(true) } finally { setMarking(false) }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-sm text-foreground truncate">{challenge.title}</p>
          <p className="text-xs text-muted/85 mt-0.5">{completedSet.size} / {challenge.totalDays} days complete</p>
        </div>
        <ProgressRing progress={progressPct} size={44} stroke={3} color={accentColor}>
          <span className="text-[0.6rem] font-black text-foreground">{progressPct}%</span>
        </ProgressRing>
      </div>

      {todayData && (
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 size-7 rounded-full border-2 flex items-center justify-center text-[0.65rem] font-black"
              style={{ borderColor: done ? accentColor : undefined, background: done ? `${accentColor}20` : undefined, color: done ? accentColor : "var(--muted)" }}>
              {done ? "✓" : todayDay}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-[0.9375rem] text-foreground">{todayData.title}</p>
              <p className="text-xs text-muted/85 mt-1 leading-relaxed line-clamp-3">{todayData.prompt}</p>
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 flex items-start gap-2.5">
            <span className="text-gold text-[0.6rem] font-bold uppercase tracking-widest shrink-0 mt-0.5">Tip</span>
            <p className="text-xs text-muted/92 leading-relaxed">{todayData.tip}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted/70">â± {todayData.estimatedMinutes} min</span>
            <button
              type="button"
              onClick={markComplete}
              disabled={marking || done}
              className={[
                "ml-auto rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                done
                  ? "bg-surface-2 text-muted/85 cursor-default"
                  : "bg-gold text-background hover:bg-gold/90",
              ].join(" ")}
            >
              {done ? "✓ Completed" : marking ? "Saving…" : "Mark Complete"}
            </button>
          </div>
        </div>
      )}

      <div className="h-1 bg-surface-2">
        <div className="h-full transition-all duration-700" style={{ width: `${progressPct}%`, background: accentColor }} />
      </div>
    </div>
  )
}

/* ── Lesson type label ───────────────────────────────────────────── */
function lessonTypeLabel(type: string): string {
  switch (type) {
    case "read":      return "Study"
    case "article":   return "Read"
    case "exercise":  return "Practice"
    case "checklist": return "Checklist"
    default:          return "Study"
  }
}

/* ── Course card ─────────────────────────────────────────────── */
function CourseCard({ course, onCompleteLesson, accentColor }: {
  course: ActiveCourse; onCompleteLesson: (lessonId: string) => void; accentColor: string
}) {
  const completedSet  = new Set(course.completedLessonIds)
  const next          = course.nextLesson
  const progressPct   = course.progress?.progress_pct ?? Math.round((completedSet.size / course.totalLessons) * 100)
  const [marking, setMarking] = useState(false)
  const [done,    setDone]    = useState(next ? completedSet.has(next.lessonId) : true)

  async function handleComplete() {
    if (!next || done) return
    setMarking(true)
    try { onCompleteLesson(next.lessonId); setDone(true) } finally { setMarking(false) }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-sm text-foreground truncate">{course.title}</p>
          <p className="text-xs text-muted/85 mt-0.5">{completedSet.size} / {course.totalLessons} lessons · {course.estimatedHours}h total</p>
        </div>
        <ProgressRing progress={progressPct} size={44} stroke={3} color={accentColor}>
          <span className="text-[0.6rem] font-black text-foreground">{progressPct}%</span>
        </ProgressRing>
      </div>

      {next ? (
        <div className="p-5 flex flex-col gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70 mb-1">
              {lessonTypeLabel(next.lessonType ?? "read")} · {next.moduleTitle}
            </p>
            <p className="font-display font-black text-[0.9375rem] text-foreground">{next.lessonTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted/70">â± {next.duration}</span>
            <button
              type="button"
              onClick={handleComplete}
              disabled={marking || done}
              className={[
                "ml-auto rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                done ? "bg-surface-2 text-muted/85 cursor-default" : "bg-gold text-background hover:bg-gold/90",
              ].join(" ")}
            >
              {done ? "✓ Complete" : marking ? "Saving…" : "Mark Complete"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center">
          <p className="text-sm font-semibold text-gold">Course Complete — check your badge.</p>
        </div>
      )}

      <div className="h-1 bg-surface-2">
        <div className="h-full transition-all duration-700" style={{ width: `${progressPct}%`, background: accentColor }} />
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user }                         = useAuth()
  const { open: openOnboarding }         = useOnboardingStore()

  const [dna,          setDna]          = useState<StyleDNA | null>(null)
  const [dashboard,    setDashboard]    = useState<DashboardData | null>(null)
  const [analytics,    setAnalytics]    = useState<CreatorAnalytics | null>(null)
  const [hasProfile,   setHasProfile]   = useState<boolean | null>(null)
  const [fetching,     setFetching]     = useState(true)
  const [displayName,  setDisplayName]  = useState("")

  const loadDashboard = useCallback(async () => {
    if (!user) return
    setFetching(true)
    try {
      const token = await user.getIdToken()

      // Check onboarding first
      const statusRes = await fetch("/api/onboarding/status", { headers: { Authorization: `Bearer ${token}` } })
      if (!statusRes.ok) return
      const statusData = await statusRes.json() as { completed: boolean; profile: DashboardProfile | null }
      setHasProfile(statusData.completed)
      if (!statusData.completed) return

      // Parallel: load dashboard profile + analytics
      const [profileRes, analyticsRes] = await Promise.all([
        fetch("/api/dashboard/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/dashboard/analytics", { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (profileRes.ok) {
        const data = await profileRes.json() as DashboardData
        setDashboard(data)
        const d = dnaFromProfile(data.profile)
        if (d) setDna(d)
      }
      if (analyticsRes.ok) {
        const { analytics: a } = await analyticsRes.json() as { analytics: CreatorAnalytics }
        setAnalytics(a)
      }
    } catch (err) {
      console.error("[Dashboard]", err)
    } finally {
      setFetching(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(user.displayName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Creator")
      void loadDashboard()
    }
  }, [user, loadDashboard])

  /* Progress callbacks — call API then refresh */
  async function handleCompleteTask(pathId: string) {
    if (!user || !dashboard?.activePath) return
    const token = await user.getIdToken()
    const stage = dashboard.activePath.progress?.stage_index ?? 0
    await fetch("/api/dashboard/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "complete_task", itemType: "growth_path", itemId: pathId, stageIndex: stage }),
    })
    void loadDashboard()
  }

  async function handleCompleteDay(challengeId: string, day: number) {
    if (!user) return
    const token = await user.getIdToken()
    await fetch("/api/dashboard/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "complete_day", itemType: "challenge", itemId: challengeId, dayNumber: day }),
    })
    void loadDashboard()
  }

  async function handleCompleteLesson(courseId: string, lessonId: string) {
    if (!user) return
    const token = await user.getIdToken()
    await fetch("/api/dashboard/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "complete_lesson", itemType: "course", itemId: courseId, lessonId }),
    })
    void loadDashboard()
  }

  const accentColor = dna?.primaryColor ?? "#FFD60A"

  /* ── Loading ── */
  if (fetching) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <DashboardSkeleton />
      </div>
    )
  }

  /* ── No onboarding ── */
  if (hasProfile === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <EmptyDashboard onStart={openOnboarding} />
      </div>
    )
  }

  const activeChallenge  = dashboard?.activeChallenge ?? null
  const activePath       = dashboard?.activePath ?? null
  const activeCourse     = dashboard?.activeCourse ?? null

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
      <AnimatePresence mode="wait">
        <motion.div key="dashboard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
          className="flex flex-col gap-10">

          {/* ── Welcome header ── */}
          <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col gap-2">
            <p className="text-[0.8125rem] font-semibold tracking-widest uppercase text-gold/60">{getGreeting()}</p>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="font-display font-black text-[1.75rem] sm:text-[2rem] text-foreground leading-tight">{displayName}</h1>
              {dna && <StyleDNACard dna={dna} variant="compact" />}
              {(dashboard?.profile.consistency_streak ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[0.75rem] font-bold text-orange-400">
                  {dashboard!.profile.consistency_streak} day streak
                </span>
              )}
            </div>
            <p className="text-[0.9375rem] text-muted/85 mt-1">Your creative universe, personalised just for you.</p>
          </motion.header>

          {/* ── Style DNA card ── */}
          {dna && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }}
              className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-[0.9375rem] text-foreground/92 uppercase tracking-wider">Your Style DNA</h2>
                <button type="button" onClick={openOnboarding} className="text-[0.75rem] text-muted/70 hover:text-gold transition-colors rounded">
                  Retake →
                </button>
              </div>
              <StyleDNACard dna={dna} variant="full" />
            </motion.section>
          )}

          {/* ── Creator Analytics ── */}
          {analytics && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.5 }}
              className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-[0.9375rem] text-foreground/92 uppercase tracking-wider">Your Progress</h2>
                <Link href="/community" className="text-[0.75rem] text-muted/70 hover:text-gold transition-colors">View Community →</Link>
              </div>
              <AnalyticsStrip analytics={analytics} accentColor={accentColor} />
            </motion.section>
          )}

          {/* ── Growth Path ── */}
          {activePath && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5 }}
              className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-[0.9375rem] text-foreground/92 uppercase tracking-wider">Your Growth Path</h2>
                <Link href={`/dashboard/path/${activePath.id}`} className="text-[0.75rem] text-muted/70 hover:text-gold transition-colors">Full Path →</Link>
              </div>
              <GrowthPathCard
                path={activePath}
                onCompleteTask={() => handleCompleteTask(activePath.id)}
                accentColor={accentColor}
              />
              {/* Alternative paths */}
              {(dashboard?.topPaths.length ?? 0) > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dashboard!.topPaths.filter((p) => p.id !== activePath.id).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={async () => {
                        if (!user) return
                        const token = await user.getIdToken()
                        await fetch("/api/dashboard/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ active_path_id: p.id }) })
                        void loadDashboard()
                      }}
                      className="shrink-0 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted/85 hover:border-gold/30 hover:text-foreground transition-all"
                    >
                      <span>{p.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* ── Two-column: Challenge + Course ── */}
          {(activeChallenge || activeCourse) && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.5 }}
              className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-[0.9375rem] text-foreground/92 uppercase tracking-wider">Active Learning</h2>
                {activeChallenge && (
                  <Link href={`/dashboard/challenge/${activeChallenge.id}`} className="text-[0.75rem] text-muted/70 hover:text-gold transition-colors">
                    Full Challenge →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeChallenge && (
                  <ChallengeCard
                    challenge={activeChallenge}
                    onCompleteDay={(day) => handleCompleteDay(activeChallenge.id, day)}
                    accentColor={accentColor}
                  />
                )}
                {activeCourse && (
                  <CourseCard
                    course={activeCourse}
                    onCompleteLesson={(lessonId) => handleCompleteLesson(activeCourse.id, lessonId)}
                    accentColor={accentColor}
                  />
                )}
              </div>
            </motion.section>
          )}

          {/* ── Made For You (existing recommendation engine) ── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5 }}
            className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-[0.9375rem] text-foreground/92 uppercase tracking-wider">Made for You</h2>
              {dna && <span className="text-[0.75rem] text-muted/70">Based on your {dna.badge} profile</span>}
            </div>
            <PersonalizedFeed dna={dna} maxSections={4} />
          </motion.section>

          {/* ── Quick Actions ── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.5 }}
            className="flex flex-col gap-3">
            <h2 className="font-display font-black text-[0.9375rem] text-foreground/92 uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "◈", label: "Presets For You",   sub: "Sorted by your style",    href: "/store/for-you",  color: "#FFD60A" },
                { icon: "▷", label: "Continue Learning", sub: "Pick up where you left off", href: "/courses",      color: "#FF6B35" },
                { icon: "✦", label: "Enter Giveaway",    sub: "Free presets every month",  href: "/giveaway",     color: "#10B981" },
                { icon: "◉", label: "Explore Bundles",   sub: "Maximum value packs",       href: "/bundles",      color: "#8B5CF6" },
              ].map((action) => (
                <Link key={action.href} href={action.href}
                  className="group flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4 hover:border-gold/25 hover:bg-surface-2 transition-all duration-200">
                  <span className="text-[1.5rem] leading-none transition-transform duration-200 group-hover:scale-110" style={{ color: action.color }}>{action.icon}</span>
                  <div>
                    <p className="text-[0.875rem] font-semibold text-foreground group-hover:text-white transition-colors leading-tight">{action.label}</p>
                    <p className="text-[0.75rem] text-muted/85 mt-0.5 leading-snug">{action.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>

          {/* ── Bottom CTA ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
            <Link href="/store/for-you"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-[0.875rem] font-medium text-muted hover:text-foreground hover:border-gold/30 transition-all active:scale-[0.97]">
              Browse Presets For You
            </Link>
            <Link href="/giveaway"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-[0.875rem] font-semibold text-background transition-all hover:bg-gold/90 active:scale-[0.97]">
              ✦ Enter This Month&apos;s Giveaway
            </Link>
          </motion.div>

        </motion.div>
      </AnimatePresence>
    </div>
  )
}



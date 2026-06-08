"use client"

/**
 * /dashboard/path/[id]
 *
 * Full growth path detail page — shows all stages and tasks, tracks
 * completion per task, persists all progress to Supabase via the
 * existing progress API.
 *
 * Data flow:
 *  1. Path content   — GROWTH_PATH_MAP[id]  (static, from growth-paths.ts)
 *  2. Progress row   — GET /api/dashboard/progress → progress[]
 *  3. Mark complete  — POST /api/dashboard/progress { action: "complete_task" }
 *  4. Start path     — POST /api/dashboard/progress { action: "start_item" }
 *                      + PATCH /api/dashboard/profile { active_path_id }
 *
 * Task tracking design:
 *  - creator_progress stores stage_index + completed_tasks (a counter).
 *  - Tasks 0..(completed_tasks-1) in the current stage are marked done.
 *  - All tasks in stages < stage_index are fully done.
 *  - Tasks in stages > stage_index are locked.
 */

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter }             from "next/navigation"
import { motion, AnimatePresence }          from "framer-motion"
import Link                                 from "next/link"
import { useAuth }                          from "@/contexts/AuthContext"
import { ProgressRing }                     from "@/components/dashboard/ProgressRing"
import { GROWTH_PATH_MAP, type GrowthPath, type GrowthPathTask } from "@/lib/dashboard/growth-paths"

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

/* ── Task type icon & label ──────────────────────────────────────── */
function taskTypeIcon(type: string): string {
  switch (type) {
    case "read":     return "📖"
    case "watch":    return "📖"   // legacy — now read
    case "practice": return "✏️"
    case "create":   return "🎨"
    case "share":    return "🌐"
    case "connect":  return "🤝"
    default:         return "◈"
  }
}

function taskTypeLabel(type: string): string {
  switch (type) {
    case "read":     return "Study"
    case "watch":    return "Study"
    case "practice": return "Practice"
    case "create":   return "Create"
    case "share":    return "Publish"
    case "connect":  return "Connect"
    default:         return "Task"
  }
}

/* ── Difficulty badge color ──────────────────────────────────────── */
function difficultyColor(d: string) {
  if (d === "beginner")     return "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
  if (d === "advanced")     return "text-rose-400 bg-rose-400/10 border-rose-400/25"
  return "text-amber-400 bg-amber-400/10 border-amber-400/25"
}

/* ── Stage status ────────────────────────────────────────────────── */
type StageStatus = "completed" | "active" | "locked"

/* ── Individual task row ─────────────────────────────────────────── */
function TaskRow({
  task,
  status,   // "done" | "current" | "upcoming"
  accentColor,
  onComplete,
  saving,
}: {
  task:        GrowthPathTask
  status:      "done" | "current" | "upcoming"
  accentColor: string
  onComplete:  () => void
  saving:      boolean
}) {
  const [expanded, setExpanded] = useState(status === "current")

  return (
    <div
      className={[
        "rounded-xl border overflow-hidden transition-all duration-200",
        status === "done"     ? "border-border/50 bg-surface/50 opacity-60"   : "",
        status === "current"  ? "border-border bg-surface"                    : "",
        status === "upcoming" ? "border-border/30 bg-surface/20 opacity-40"   : "",
      ].join(" ")}
    >
      {/* Task header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={status === "upcoming"}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Status indicator */}
        <div
          className="shrink-0 size-6 rounded-full border-2 flex items-center justify-center text-[0.6rem] font-black transition-all"
          style={{
            borderColor: status === "done" ? accentColor : status === "current" ? accentColor : "rgba(255,255,255,0.12)",
            background:  status === "done" ? `${accentColor}20` : "transparent",
            color:       status === "done" ? accentColor : status === "current" ? accentColor : "rgba(255,255,255,0.2)",
          }}
        >
          {status === "done" ? "✓" : taskTypeIcon(task.type)}
        </div>

        <div className="flex-1 min-w-0">
          <p className={[
            "text-[0.875rem] font-semibold leading-tight",
            status === "done" ? "text-muted/50 line-through" : "text-foreground",
          ].join(" ")}>
            {task.title}
          </p>
          <p className="text-[0.7rem] text-muted/35 mt-0.5">
            {taskTypeLabel(task.type)} · {task.estimatedMinutes} min
          </p>
        </div>

        {status !== "upcoming" && (
          <span className="shrink-0 text-muted/30 text-sm transition-transform duration-200" style={{ transform: expanded ? "rotate(90deg)" : undefined }}>
            ›
          </span>
        )}
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && status !== "upcoming" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border/50 pt-3">
              {/* Description */}
              <p className="text-[0.8125rem] text-muted/65 leading-relaxed">{task.description}</p>

              {/* Resource link */}
              {task.resource && (
                <Link
                  href={task.resource.url}
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-muted/50 hover:text-gold transition-colors"
                >
                  <span>↗</span>
                  {task.resource.title}
                </Link>
              )}

              {/* Preset recommendation */}
              {task.presetRecommended && (
                <Link
                  href={`/presets/${task.presetRecommended}`}
                  className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-[0.7rem] font-medium text-gold/70 hover:bg-gold/10 transition-colors w-fit"
                >
                  <span>◈</span>
                  {task.presetRecommended.replace(/-/g, " ")}
                </Link>
              )}

              {/* Mark complete button — only for current task */}
              {status === "current" && (
                <button
                  type="button"
                  onClick={onComplete}
                  disabled={saving}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-2 text-[0.8125rem] font-bold text-background hover:bg-gold/90 transition-all active:scale-[0.97] disabled:opacity-50 w-fit"
                >
                  {saving ? (
                    <>
                      <span className="size-3 rounded-full border-2 border-background/40 border-t-background animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "✓ Mark Complete"
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Stage card ──────────────────────────────────────────────────── */
function StageCard({
  stage,
  stageStatus,
  completedTasksInStage,
  accentColor,
  onCompleteTask,
  savingTask,
  stageIndex,
}: {
  stage:                 GrowthPath["stages"][number]
  stageStatus:           StageStatus
  completedTasksInStage: number
  accentColor:           string
  onCompleteTask:        (stageIdx: number) => void
  savingTask:            boolean
  stageIndex:            number
}) {
  const [open, setOpen] = useState(stageStatus === "active")

  const stagePct = stageStatus === "completed"
    ? 100
    : Math.round((completedTasksInStage / stage.tasks.length) * 100)

  return (
    <div
      className={[
        "rounded-2xl border overflow-hidden transition-all duration-300",
        stageStatus === "completed" ? "border-border/40 bg-surface/40"  : "",
        stageStatus === "active"    ? "border-border bg-surface"        : "",
        stageStatus === "locked"    ? "border-border/20 bg-surface/10 opacity-50" : "",
      ].join(" ")}
    >
      {/* Stage header */}
      <button
        type="button"
        onClick={() => stageStatus !== "locked" && setOpen((v) => !v)}
        disabled={stageStatus === "locked"}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Stage number / status */}
        <div
          className="shrink-0 size-10 rounded-full border-2 flex items-center justify-center text-[0.75rem] font-black"
          style={{
            borderColor: stageStatus === "completed"
              ? accentColor
              : stageStatus === "active"
              ? accentColor
              : "rgba(255,255,255,0.1)",
            background: stageStatus === "completed"
              ? `${accentColor}20`
              : "transparent",
            color: stageStatus === "completed"
              ? accentColor
              : stageStatus === "active"
              ? accentColor
              : "rgba(255,255,255,0.2)",
          }}
        >
          {stageStatus === "completed" ? "✓" : stageStatus === "locked" ? "🔒" : stage.index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/35 mb-0.5">
            Stage {stage.index + 1} {stageStatus === "completed" ? "· Complete" : stageStatus === "locked" ? "· Locked" : `· ${completedTasksInStage}/${stage.tasks.length} tasks`}
          </p>
          <p className="font-display font-black text-[0.9375rem] text-foreground leading-tight">{stage.title}</p>
          {stage.badge && stageStatus === "completed" && (
            <p className="text-[0.7rem] text-gold/70 mt-0.5">🏅 {stage.badge} badge earned</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ProgressRing progress={stagePct} size={40} stroke={3} color={accentColor}>
            <span className="text-[0.55rem] font-black text-foreground">{stagePct}%</span>
          </ProgressRing>
          {stageStatus !== "locked" && (
            <span className="text-muted/30 text-sm transition-transform duration-200" style={{ transform: open ? "rotate(90deg)" : undefined }}>
              ›
            </span>
          )}
        </div>
      </button>

      {/* Stage body */}
      <AnimatePresence>
        {open && stageStatus !== "locked" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 flex flex-col gap-3 border-t border-border/50 pt-4">
              {/* Stage description */}
              <p className="text-[0.8125rem] text-muted/55 leading-relaxed">{stage.description}</p>

              {/* Skills gained */}
              <div className="flex flex-wrap gap-1.5">
                {stage.skillsGained.map((skill) => (
                  <span key={skill} className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-0.5 text-[0.65rem] font-medium text-muted/50">
                    {skill}
                  </span>
                ))}
              </div>

              {/* Task list */}
              <div className="flex flex-col gap-2 mt-1">
                {stage.tasks.map((task, taskIdx) => {
                  let taskStatus: "done" | "current" | "upcoming"
                  if (stageStatus === "completed") {
                    taskStatus = "done"
                  } else if (taskIdx < completedTasksInStage) {
                    taskStatus = "done"
                  } else if (taskIdx === completedTasksInStage) {
                    taskStatus = "current"
                  } else {
                    taskStatus = "upcoming"
                  }

                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      status={taskStatus}
                      accentColor={accentColor}
                      onComplete={() => onCompleteTask(stageIndex)}
                      saving={savingTask && taskStatus === "current"}
                    />
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function PathSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-4 w-24 rounded-full bg-surface-2" />
      <div className="h-40 rounded-2xl bg-surface border border-border" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-surface border border-border" />
        ))}
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function PathPage() {
  const params  = useParams()
  const router  = useRouter()
  const { user } = useAuth()

  const id   = typeof params.id === "string" ? params.id : ""
  const path = GROWTH_PATH_MAP[id] as GrowthPath | undefined

  const [progressRow,  setProgressRow]  = useState<ProgressRow | null>(null)
  const [hasStarted,   setHasStarted]   = useState(false)
  const [isActivePath, setIsActivePath] = useState(false)
  const [savingTask,   setSavingTask]   = useState(false)
  const [starting,     setStarting]     = useState(false)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!id || !path) router.replace("/dashboard")
  }, [id, path, router])

  const loadProgress = useCallback(async () => {
    if (!user || !path) return
    try {
      const token = await user.getIdToken()

      const [progressRes, profileRes] = await Promise.all([
        fetch("/api/dashboard/progress", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/dashboard/profile",  { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (progressRes.ok) {
        const data = await progressRes.json() as ProgressResponse
        const row  = (data.progress ?? []).find(
          (p) => p.item_id === id && p.item_type === "growth_path"
        ) ?? null
        setProgressRow(row)
        setHasStarted(row !== null)
      }

      if (profileRes.ok) {
        const { profile } = await profileRes.json() as { profile: { active_path_id?: string | null } }
        setIsActivePath(profile?.active_path_id === id)
      }
    } catch (err) {
      console.error("[path page]", err)
    } finally {
      setLoading(false)
    }
  }, [user, path, id])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void loadProgress()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleStart() {
    if (!user || !path) return
    setStarting(true)
    try {
      const token = await user.getIdToken()
      await fetch("/api/dashboard/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ action: "start_item", itemType: "growth_path", itemId: id }),
      })
      setHasStarted(true)
      setIsActivePath(true)
      await loadProgress()
    } catch (err) {
      console.error("[path start]", err)
    } finally {
      setStarting(false)
    }
  }

  async function handleSetActive() {
    if (!user || !path) return
    try {
      const token = await user.getIdToken()
      await fetch("/api/dashboard/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ active_path_id: id }),
      })
      setIsActivePath(true)
    } catch (err) {
      console.error("[path set-active]", err)
    }
  }

  async function handleCompleteTask(stageIndex: number) {
    if (!user || !path) return
    setSavingTask(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/dashboard/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          action:     "complete_task",
          itemType:   "growth_path",
          itemId:     id,
          stageIndex,
        }),
      })
      if (res.ok) {
        await loadProgress()
      }
    } catch (err) {
      console.error("[path complete-task]", err)
    } finally {
      setSavingTask(false)
    }
  }

  if (!path) return null

  const currentStageIndex   = progressRow?.stage_index     ?? 0
  const completedTasksNow   = progressRow?.completed_tasks ?? 0
  const overallPct          = progressRow?.progress_pct    ?? 0
  const isComplete          = progressRow?.completed       ?? false
  const accentColor         = path.color

  // Total tasks across all stages
  const totalTasks = path.stages.reduce((s, st) => s + st.tasks.length, 0)
  const doneTasks  = path.stages.slice(0, currentStageIndex).reduce((s, st) => s + st.tasks.length, 0) + completedTasksNow

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">

      {/* Back link */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted/40 hover:text-foreground transition-colors mb-8">
        ← Dashboard
      </Link>

      {loading ? (
        <PathSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-8"
        >

          {/* ── Path header ── */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="h-1 w-full" style={{ background: accentColor }} />

            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                {/* Progress ring */}
                <div className="shrink-0">
                  <ProgressRing progress={overallPct} size={60} stroke={4} color={accentColor}>
                    <span className="text-2xl leading-none">{path.icon}</span>
                  </ProgressRing>
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${difficultyColor(path.difficulty)}`}>
                      {path.difficulty}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[0.65rem] font-medium text-muted/50">
                      {path.estimatedWeeks}w · {totalTasks} tasks
                    </span>
                    {isActivePath && (
                      <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/5 px-2.5 py-0.5 text-[0.65rem] font-bold text-gold/80">
                        Active Path
                      </span>
                    )}
                  </div>
                  <h1 className="font-display font-black text-[1.25rem] sm:text-[1.5rem] text-foreground leading-tight">
                    {path.title}
                  </h1>
                  <p className="text-[0.8125rem] text-muted/55 mt-1">{path.tagline}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-[0.875rem] text-muted/65 leading-relaxed">{path.description}</p>

              {/* Progress strip */}
              {hasStarted && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${overallPct}%`, background: accentColor }}
                    />
                  </div>
                  <span className="shrink-0 text-[0.75rem] font-bold tabular-nums" style={{ color: accentColor }}>
                    {doneTasks} / {totalTasks}
                  </span>
                </div>
              )}

              {/* Badge */}
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 flex items-center gap-2.5">
                <span className="text-gold">🏅</span>
                <p className="text-[0.8125rem] text-muted/65">
                  <span className="font-semibold text-foreground/80">Badge: </span>
                  {path.badge} — earned on full completion
                </p>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3">
                {!hasStarted && (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={starting}
                    className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-[0.875rem] font-bold text-background hover:bg-gold/90 transition-all active:scale-[0.97] disabled:opacity-60"
                  >
                    {starting ? (
                      <>
                        <span className="size-3.5 rounded-full border-2 border-background/40 border-t-background animate-spin" />
                        Starting…
                      </>
                    ) : (
                      "Start This Path"
                    )}
                  </button>
                )}

                {hasStarted && !isActivePath && (
                  <button
                    type="button"
                    onClick={handleSetActive}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-2.5 text-[0.875rem] font-semibold text-muted/70 hover:border-gold/30 hover:text-foreground transition-all"
                  >
                    Set as Active Path
                  </button>
                )}

                {isComplete && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-2 text-[0.875rem] font-semibold text-gold/80">
                    🎉 Path Complete!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Stages ── */}
          <section className="flex flex-col gap-4">
            <h2 className="font-display font-black text-[0.9375rem] text-foreground/70 uppercase tracking-wider">
              Your Journey — {path.totalStages} Stages
            </h2>

            <div className="flex flex-col gap-3">
              {path.stages.map((stage) => {
                let stageStatus: StageStatus
                let completedInStage: number

                if (stage.index < currentStageIndex) {
                  stageStatus      = "completed"
                  completedInStage = stage.tasks.length
                } else if (stage.index === currentStageIndex) {
                  stageStatus      = hasStarted ? "active" : "locked"
                  completedInStage = completedTasksNow
                } else {
                  stageStatus      = "locked"
                  completedInStage = 0
                }

                // If path not yet started, show first stage as locked but peek-able
                if (!hasStarted && stage.index === 0) stageStatus = "locked"

                return (
                  <StageCard
                    key={stage.index}
                    stage={stage}
                    stageStatus={stageStatus}
                    completedTasksInStage={completedInStage}
                    accentColor={accentColor}
                    onCompleteTask={handleCompleteTask}
                    savingTask={savingTask}
                    stageIndex={stage.index}
                  />
                )
              })}
            </div>
          </section>

          {/* ── Not-started CTA ── */}
          {!hasStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border bg-surface p-6 text-center flex flex-col items-center gap-4"
            >
              <p className="text-[0.9375rem] text-muted/60 max-w-sm leading-relaxed">
                Start this path to unlock your first stage and begin tracking progress.
              </p>
              <button
                type="button"
                onClick={handleStart}
                disabled={starting}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-[0.9375rem] font-bold text-background hover:bg-gold/90 transition-all active:scale-[0.97] disabled:opacity-60"
              >
                {starting ? (
                  <>
                    <span className="size-4 rounded-full border-2 border-background/40 border-t-background animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>Start {path.title}</>
                )}
              </button>
            </motion.div>
          )}

        </motion.div>
      )}
    </div>
  )
}

/**
 * /api/dashboard/progress
 *
 * GET  — Return all progress records for the authenticated user, including
 *        a map of challenge_id → completed day_number[] for detail pages.
 * POST — Upsert progress for a specific item (path stage, challenge day,
 *        course lesson). Also fires update_consistency_streak() via RPC
 *        before overwriting last_activity_at.
 *
 * NOTE: Tables created in migration 015 are not yet in generated Supabase
 *       types. All new-table queries use (supabase as any) until types are
 *       regenerated.
 */

import { NextRequest, NextResponse }    from "next/server"
import { createAdminClient }            from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }    from "@/lib/account/auth"
import { CHALLENGE_MAP }                from "@/lib/dashboard/challenges"
import { GROWTH_PATH_MAP }              from "@/lib/dashboard/growth-paths"
import { COURSE_MAP }                   from "@/lib/dashboard/courses"

export const runtime = "nodejs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/* ── Helpers ─────────────────────────────────────────────────────── */

/**
 * Call the update_consistency_streak Postgres function (migration 016)
 * BEFORE updating last_activity_at so the function reads the old timestamp.
 */
async function fireStreakRpc(db: AnyClient, uid: string): Promise<void> {
  try {
    await db.rpc("update_consistency_streak", { p_uid: uid })
  } catch (err) {
    // Non-fatal — streak update failure must not block progress save
    console.warn("[progress] streak RPC failed:", err)
  }
}

/* ── GET — load all user progress ─────────────────────────────────── */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const db: AnyClient = createAdminClient()

  try {
    const [progressRes, challengeRes, courseRes] = await Promise.all([
      db.from("creator_progress")
        .select("*")
        .eq("firebase_uid", uid),

      db.from("challenge_completions")
        .select("challenge_id, day_number, completed_at, upload_url, note")
        .eq("firebase_uid", uid)
        .order("day_number", { ascending: true }),

      db.from("course_progress")
        .select("course_id, lesson_id, completed_at")
        .eq("firebase_uid", uid),
    ])

    // ── challengeStats: summary per challenge (existing consumers) ──
    const challengeStats: Record<string, {
      completed: number
      lastDay: number
      lastCompletedAt: string | null
    }> = {}

    // ── challengeCompletions: full day list per challenge (detail pages) ──
    const challengeCompletions: Record<string, number[]> = {}

    for (const row of (challengeRes.data ?? [])) {
      // summary
      if (!challengeStats[row.challenge_id]) {
        challengeStats[row.challenge_id] = { completed: 0, lastDay: 0, lastCompletedAt: null }
      }
      challengeStats[row.challenge_id].completed += 1
      if (row.day_number > challengeStats[row.challenge_id].lastDay) {
        challengeStats[row.challenge_id].lastDay        = row.day_number
        challengeStats[row.challenge_id].lastCompletedAt = row.completed_at
      }

      // full list
      if (!challengeCompletions[row.challenge_id]) {
        challengeCompletions[row.challenge_id] = []
      }
      challengeCompletions[row.challenge_id].push(row.day_number)
    }

    // ── courseStats ──────────────────────────────────────────────────
    const courseStats: Record<string, {
      lessonsCompleted: string[]
      lastLessonId: string | null
      lastCompletedAt: string | null
    }> = {}

    for (const row of (courseRes.data ?? [])) {
      if (!courseStats[row.course_id]) {
        courseStats[row.course_id] = {
          lessonsCompleted: [],
          lastLessonId:     null,
          lastCompletedAt:  null,
        }
      }
      courseStats[row.course_id].lessonsCompleted.push(row.lesson_id)
      courseStats[row.course_id].lastLessonId    = row.lesson_id
      courseStats[row.course_id].lastCompletedAt = row.completed_at
    }

    return NextResponse.json({
      progress:             progressRes.data ?? [],
      challengeStats,
      challengeCompletions,
      courseStats,
    })
  } catch (err) {
    console.error("[dashboard/progress GET]", err)
    return NextResponse.json({ error: "Failed to load progress." }, { status: 500 })
  }
}

/* ── POST — update progress ────────────────────────────────────────── */
interface ProgressUpdateBody {
  action:      "complete_task" | "complete_day" | "complete_lesson" | "start_item"
  itemType:    "growth_path" | "challenge" | "course"
  itemId:      string
  stageIndex?: number
  taskId?:     string
  dayNumber?:  number
  uploadUrl?:  string
  note?:       string
  lessonId?:   string
  /** Kept for API compatibility but no longer surfaced in UI */
  watchTimeS?: number
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: ProgressUpdateBody
  try {
    body = await req.json() as ProgressUpdateBody
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const db: AnyClient = createAdminClient()
  const now = new Date().toISOString()

  try {

    /* ── Challenge day completion ───────────────────────────────────── */
    if (body.action === "complete_day" && body.itemType === "challenge") {
      if (!body.dayNumber) {
        return NextResponse.json({ error: "dayNumber required." }, { status: 400 })
      }
      const challenge = CHALLENGE_MAP[body.itemId]
      if (!challenge) {
        return NextResponse.json({ error: "Challenge not found." }, { status: 404 })
      }

      // Upsert the individual day completion
      await db.from("challenge_completions").upsert(
        {
          firebase_uid: uid,
          challenge_id: body.itemId,
          day_number:   body.dayNumber,
          completed_at: now,
          upload_url:   body.uploadUrl ?? null,
          note:         body.note      ?? null,
        },
        { onConflict: "firebase_uid,challenge_id,day_number" }
      )

      // Recount completed days after upsert
      const { count } = await db
        .from("challenge_completions")
        .select("*", { count: "exact", head: true })
        .eq("firebase_uid", uid)
        .eq("challenge_id", body.itemId)

      const completedDays = count ?? 0
      const progressPct   = Math.round((completedDays / challenge.totalDays) * 100)
      const isComplete    = completedDays >= challenge.totalDays

      await db.from("creator_progress").upsert(
        {
          firebase_uid:   uid,
          item_type:      "challenge",
          item_id:        body.itemId,
          stage_index:    0,
          completed_tasks: completedDays,
          total_tasks:    challenge.totalDays,
          progress_pct:   progressPct,
          completed:      isComplete,
          completed_at:   isComplete ? now : null,
          updated_at:     now,
        },
        { onConflict: "firebase_uid,item_type,item_id" }
      )

      // Fire streak update BEFORE writing last_activity_at
      await fireStreakRpc(db, uid)

      await db
        .from("creator_profiles")
        .update({ last_activity_at: now })
        .eq("firebase_uid", uid)

      return NextResponse.json({ success: true, progressPct, completedDays, isComplete })
    }

    /* ── Course lesson completion ────────────────────────────────────── */
    if (body.action === "complete_lesson" && body.itemType === "course") {
      if (!body.lessonId) {
        return NextResponse.json({ error: "lessonId required." }, { status: 400 })
      }
      const course = COURSE_MAP[body.itemId]
      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 })
      }

      await db.from("course_progress").upsert(
        {
          firebase_uid: uid,
          course_id:    body.itemId,
          lesson_id:    body.lessonId,
          completed_at: now,
          watch_time_s: 0,   // kept for schema compat; not surfaced in UI
        },
        { onConflict: "firebase_uid,course_id,lesson_id" }
      )

      const { count } = await db
        .from("course_progress")
        .select("*", { count: "exact", head: true })
        .eq("firebase_uid", uid)
        .eq("course_id", body.itemId)

      const completedLessons = count ?? 0
      const progressPct      = Math.round((completedLessons / course.totalLessons) * 100)
      const isComplete       = completedLessons >= course.totalLessons

      await db.from("creator_progress").upsert(
        {
          firebase_uid:    uid,
          item_type:       "course",
          item_id:         body.itemId,
          stage_index:     0,
          completed_tasks: completedLessons,
          total_tasks:     course.totalLessons,
          progress_pct:    progressPct,
          completed:       isComplete,
          completed_at:    isComplete ? now : null,
          updated_at:      now,
        },
        { onConflict: "firebase_uid,item_type,item_id" }
      )

      await fireStreakRpc(db, uid)

      await db
        .from("creator_profiles")
        .update({ last_activity_at: now })
        .eq("firebase_uid", uid)

      return NextResponse.json({ success: true, progressPct, completedLessons, isComplete })
    }

    /* ── Growth path task completion ────────────────────────────────── */
    if (body.action === "complete_task" && body.itemType === "growth_path") {
      const path = GROWTH_PATH_MAP[body.itemId]
      if (!path) {
        return NextResponse.json({ error: "Growth path not found." }, { status: 404 })
      }

      const stageIndex = body.stageIndex ?? 0
      const stage      = path.stages[stageIndex]
      const totalTasks = stage?.tasks.length ?? 0

      const { data: existing } = await db
        .from("creator_progress")
        .select("*")
        .eq("firebase_uid", uid)
        .eq("item_type", "growth_path")
        .eq("item_id", body.itemId)
        .maybeSingle()

      const prevCompleted   = (existing?.completed_tasks as number) ?? 0
      const completedTasks  = Math.min(prevCompleted + 1, totalTasks)
      const isStageComplete = completedTasks >= totalTasks
      const newStageIndex   = isStageComplete
        ? Math.min(stageIndex + 1, path.totalStages - 1)
        : stageIndex

      // Total tasks across all stages for overall progress
      const totalPathTasks = path.stages.reduce((s, st) => s + st.tasks.length, 0)
      // Sum of tasks in fully-completed earlier stages
      const prevStageTasks = path.stages
        .slice(0, stageIndex)
        .reduce((s, st) => s + st.tasks.length, 0)
      const totalCompleted = prevStageTasks + (isStageComplete ? stage.tasks.length : completedTasks)
      const progressPct    = Math.round((totalCompleted / totalPathTasks) * 100)
      const isPathComplete = newStageIndex >= path.totalStages - 1 && isStageComplete

      await db.from("creator_progress").upsert(
        {
          firebase_uid:    uid,
          item_type:       "growth_path",
          item_id:         body.itemId,
          stage_index:     isStageComplete ? newStageIndex : stageIndex,
          completed_tasks: isStageComplete ? 0 : completedTasks,
          total_tasks:     isStageComplete
            ? (path.stages[newStageIndex]?.tasks.length ?? 0)
            : totalTasks,
          progress_pct:    progressPct,
          completed:       isPathComplete,
          completed_at:    isPathComplete ? now : null,
          updated_at:      now,
        },
        { onConflict: "firebase_uid,item_type,item_id" }
      )

      await fireStreakRpc(db, uid)

      await db
        .from("creator_profiles")
        .update({ last_activity_at: now })
        .eq("firebase_uid", uid)

      return NextResponse.json({
        success:         true,
        progressPct,
        stageIndex:      isStageComplete ? newStageIndex : stageIndex,
        isStageComplete,
        isPathComplete,
      })
    }

    /* ── Start an item ──────────────────────────────────────────────── */
    if (body.action === "start_item") {
      let totalTasks    = 0
      const profilePatch: Record<string, string | null> = {
        last_activity_at: now,
      }

      if (body.itemType === "challenge" && CHALLENGE_MAP[body.itemId]) {
        totalTasks = CHALLENGE_MAP[body.itemId].totalDays
        profilePatch["active_challenge_id"] = body.itemId
      }

      if (body.itemType === "course" && COURSE_MAP[body.itemId]) {
        totalTasks = COURSE_MAP[body.itemId].totalLessons
        profilePatch["active_course_id"] = body.itemId
      }

      if (body.itemType === "growth_path" && GROWTH_PATH_MAP[body.itemId]) {
        totalTasks = GROWTH_PATH_MAP[body.itemId].stages[0]?.tasks.length ?? 0
        profilePatch["active_path_id"] = body.itemId
      }

      await db
        .from("creator_profiles")
        .update(profilePatch)
        .eq("firebase_uid", uid)

      await db.from("creator_progress").upsert(
        {
          firebase_uid:    uid,
          item_type:       body.itemType,
          item_id:         body.itemId,
          stage_index:     0,
          completed_tasks: 0,
          total_tasks:     totalTasks,
          progress_pct:    0,
          completed:       false,
        },
        { onConflict: "firebase_uid,item_type,item_id" }
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })

  } catch (err) {
    console.error("[dashboard/progress POST]", err)
    return NextResponse.json({ error: "Failed to update progress." }, { status: 500 })
  }
}

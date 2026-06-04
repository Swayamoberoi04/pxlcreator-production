/**
 * GET  /api/dashboard/profile  — full profile + auto-matched content
 * PATCH /api/dashboard/profile — update active path/challenge/course selection
 *
 * NOTE: New columns added in migration 015 are not yet in generated Supabase types.
 *       Profile rows are cast to `any` to access new fields until types are regenerated.
 */

import { NextRequest, NextResponse }    from "next/server"
import { createAdminClient }            from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }    from "@/lib/account/auth"
import { rankGrowthPaths }              from "@/lib/dashboard/growth-paths"
import { rankChallenges }               from "@/lib/dashboard/challenges"
import { rankCourses }                  from "@/lib/dashboard/courses"
import type { CategoryAffinities }      from "@/types/onboarding"

export const runtime = "nodejs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const db: AnyClient = createAdminClient()

  try {
    const { data: rawProfile, error: profileErr } = await db
      .from("creator_profiles")
      .select("*")
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (profileErr) throw profileErr
    if (!rawProfile) return NextResponse.json({ error: "Profile not found. Complete onboarding first." }, { status: 404 })

    // Cast to any to access new columns (migration 015)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile: any = rawProfile

    const affinities = (profile.affinities ?? {}) as Partial<CategoryAffinities>

    const rankedPaths      = rankGrowthPaths(affinities)
    const rankedChallenges = rankChallenges(affinities)
    const rankedCourses    = rankCourses(affinities)

    const activePath      = profile.active_path_id
      ? (rankedPaths.find((p) => p.id === profile.active_path_id) ?? rankedPaths[0])
      : rankedPaths[0]

    const activeChallenge = profile.active_challenge_id
      ? (rankedChallenges.find((c) => c.id === profile.active_challenge_id) ?? rankedChallenges[0])
      : rankedChallenges[0]

    const activeCourse = profile.active_course_id
      ? (rankedCourses.find((c) => c.id === profile.active_course_id) ?? rankedCourses[0])
      : rankedCourses[0]

    // Load progress records for active items
    const activeIds = [activePath?.id, activeChallenge?.id, activeCourse?.id].filter(Boolean) as string[]
    const { data: progressRows } = activeIds.length > 0
      ? await db.from("creator_progress").select("*").eq("firebase_uid", uid).in("item_id", activeIds)
      : { data: [] }

    const progressMap: Record<string, unknown> = Object.fromEntries((progressRows ?? []).map((p: { item_id: string }) => [p.item_id, p]))

    // Load challenge day completions
    let challengeCompletedDays: number[] = []
    if (activeChallenge) {
      const { data: dayRows } = await db.from("challenge_completions").select("day_number").eq("firebase_uid", uid).eq("challenge_id", activeChallenge.id).order("day_number")
      challengeCompletedDays = (dayRows ?? []).map((r: { day_number: number }) => r.day_number)
    }

    // Load course lesson completions
    let completedLessonIds: string[] = []
    if (activeCourse) {
      const { data: lessonRows } = await db.from("course_progress").select("lesson_id").eq("firebase_uid", uid).eq("course_id", activeCourse.id)
      completedLessonIds = (lessonRows ?? []).map((r: { lesson_id: string }) => r.lesson_id)
    }

    const topPathSummaries = rankedPaths.slice(0, 3).map(({ id, title, tagline, icon, color, difficulty, estimatedWeeks, score }) =>
      ({ id, title, tagline, icon, color, difficulty, estimatedWeeks, score })
    )
    const topChallengeSummaries = rankedChallenges.slice(0, 3).map(({ id, title, tagline, icon, color, totalDays, difficulty, score }) =>
      ({ id, title, tagline, icon, color, totalDays, difficulty, score })
    )
    const topCourseSummaries = rankedCourses.slice(0, 3).map(({ id, title, tagline, icon, color, difficulty, estimatedHours, totalLessons, score }) =>
      ({ id, title, tagline, icon, color, difficulty, estimatedHours, totalLessons, score })
    )

    return NextResponse.json({
      profile: {
        id:                      profile.id,
        firebase_uid:            profile.firebase_uid,
        professions:             profile.professions,
        goals:                   profile.goals,
        aesthetics:              profile.aesthetics,
        skill_level:             profile.skill_level,
        platforms:               profile.platforms,
        affinities:              profile.affinities,
        style_dna_title:         profile.style_dna_title,
        style_dna_tagline:       profile.style_dna_tagline,
        style_dna_badge:         profile.style_dna_badge,
        style_dna_color:         profile.style_dna_color,
        style_dna_archetypes:    profile.style_dna_archetypes,
        onboarding_completed_at: profile.onboarding_completed_at,
        active_path_id:          profile.active_path_id ?? null,
        active_challenge_id:     profile.active_challenge_id ?? null,
        active_course_id:        profile.active_course_id ?? null,
        consistency_streak:      profile.consistency_streak ?? 0,
        last_activity_at:        profile.last_activity_at ?? null,
      },
      activePath: activePath ? {
        ...activePath,
        progress: progressMap[activePath.id] ?? null,
      } : null,
      activeChallenge: activeChallenge ? {
        ...activeChallenge,
        progress:      progressMap[activeChallenge.id] ?? null,
        completedDays: challengeCompletedDays,
        nextDay:       challengeCompletedDays.length + 1,
        todaysDay:     challengeCompletedDays.length + 1,
      } : null,
      activeCourse: activeCourse ? {
        ...activeCourse,
        progress:           progressMap[activeCourse.id] ?? null,
        completedLessonIds,
        nextLesson:         findNextLesson(activeCourse, completedLessonIds),
      } : null,
      topPaths:      topPathSummaries,
      topChallenges: topChallengeSummaries,
      topCourses:    topCourseSummaries,
    })
  } catch (err) {
    console.error("[dashboard/profile GET]", err)
    return NextResponse.json({ error: "Failed to load dashboard profile." }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: { active_path_id?: string; active_challenge_id?: string; active_course_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }) }

  const updates: Record<string, string | null> = {}
  if ("active_path_id"      in body) updates["active_path_id"]      = body.active_path_id      ?? null
  if ("active_challenge_id" in body) updates["active_challenge_id"] = body.active_challenge_id ?? null
  if ("active_course_id"    in body) updates["active_course_id"]    = body.active_course_id    ?? null

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 })

  const db: AnyClient = createAdminClient()
  const { error } = await db.from("creator_profiles").update(updates).eq("firebase_uid", uid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

function findNextLesson(
  course: { modules: { title: string; lessons: { id: string; title: string; duration: string; type: string; free: boolean }[] }[] },
  completedIds: string[]
): { lessonId: string; lessonTitle: string; moduleTitle: string; duration: string } | null {
  const completed = new Set(completedIds)
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      if (!completed.has(lesson.id)) {
        return { lessonId: lesson.id, lessonTitle: lesson.title, moduleTitle: mod.title, duration: lesson.duration }
      }
    }
  }
  return null
}

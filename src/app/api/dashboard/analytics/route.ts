/**
 * GET /api/dashboard/analytics
 *
 * Returns a personal analytics summary for the authenticated user.
 * NOTE: New tables from migration 015 use (supabase as any) until types are regenerated.
 */

import { NextRequest, NextResponse }    from "next/server"
import { createAdminClient }            from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }    from "@/lib/account/auth"

export const runtime = "nodejs"

export interface CreatorAnalytics {
  coursesCompleted:       number
  coursesInProgress:      number
  challengeDaysCompleted: number
  challengesCompleted:    number
  presetsDownloaded:      number
  presetsViewed:          number
  communityReputation:    number
  showcaseItems:          number
  collaborations:         number
  projectsJoined:         number
  consistencyStreak:      number
  totalActiveDays:        number
  joinedAt:               string | null
  lastActivityAt:         string | null
}

const ZERO_ANALYTICS: CreatorAnalytics = {
  coursesCompleted: 0, coursesInProgress: 0,
  challengeDaysCompleted: 0, challengesCompleted: 0,
  presetsDownloaded: 0, presetsViewed: 0,
  communityReputation: 0, showcaseItems: 0,
  collaborations: 0, projectsJoined: 0,
  consistencyStreak: 0, totalActiveDays: 0,
  joinedAt: null, lastActivityAt: null,
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = createAdminClient()

  try {
    const [progressRes, challengeRes, presetRes, communityRes, profileRes, teamsRes] = await Promise.all([
      db.from("creator_progress").select("item_id, completed, progress_pct, item_type").eq("firebase_uid", uid),
      db.from("challenge_completions").select("challenge_id, day_number").eq("firebase_uid", uid),
      db.from("preset_interactions").select("action").eq("firebase_uid", uid),
      db.from("community_profiles").select("reputation_score, showcase_count, hired_count").eq("firebase_uid", uid).maybeSingle(),
      db.from("creator_profiles").select("created_at, last_activity_at, consistency_streak").eq("firebase_uid", uid).maybeSingle(),
      db.from("community_team_members").select("*", { count: "exact", head: true }).eq("firebase_uid", uid),
    ])

    const progressRows     = (progressRes.data ?? []) as { item_type: string; completed: boolean; progress_pct: number }[]
    const challengeRows    = (challengeRes.data ?? []) as { challenge_id: string; day_number: number }[]
    const presetRows       = (presetRes.data ?? []) as { action: string }[]
    const communityProfile = communityRes.data as { reputation_score: number; showcase_count: number; hired_count: number } | null
    const profile          = profileRes.data as { created_at: string; last_activity_at: string | null; consistency_streak: number | null } | null

    const analytics: CreatorAnalytics = {
      coursesCompleted:       progressRows.filter((r) => r.item_type === "course" && r.completed).length,
      coursesInProgress:      progressRows.filter((r) => r.item_type === "course" && !r.completed && r.progress_pct > 0).length,
      challengesCompleted:    progressRows.filter((r) => r.item_type === "challenge" && r.completed).length,
      challengeDaysCompleted: challengeRows.length,
      presetsDownloaded:      presetRows.filter((r) => r.action === "download" || r.action === "purchase").length,
      presetsViewed:          presetRows.filter((r) => r.action === "view").length,
      communityReputation:    communityProfile?.reputation_score ?? 0,
      showcaseItems:          communityProfile?.showcase_count ?? 0,
      collaborations:         communityProfile?.hired_count ?? 0,
      projectsJoined:         (teamsRes.count as number) ?? 0,
      consistencyStreak:      profile?.consistency_streak ?? 0,
      totalActiveDays:        0,
      joinedAt:               profile?.created_at ?? null,
      lastActivityAt:         profile?.last_activity_at ?? null,
    }

    return NextResponse.json({ analytics })
  } catch (err) {
    console.error("[dashboard/analytics]", err)
    return NextResponse.json({ analytics: ZERO_ANALYTICS })
  }
}

/**
 * GET /api/community/reputation
 *
 * Get reputation breakdown for the current authenticated user.
 * Auth required.
 *
 * Scoring formula:
 *   - Profile complete (all key fields filled): +20
 *   - Per post: +2 (max 50 points = 25 posts)
 *   - Per showcase: +3 (max 60 points = 20 showcases)
 *   - Per follower: +1 (max 100 points)
 *   - Per 5-star review received: +10
 *   - Per completed project: +15
 *
 * Returns: { score, breakdown: { profile_complete, posts, showcases, reviews, projects_completed, followers }, badges_earned }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const supabase = createAdminClient()

    // Fetch profile
    const { data: profile } = await supabase
      .from("community_profiles")
      .select(
        "display_name, bio, avatar_url, location_city, website, skills, languages, equipment, software, available_for, looking_for, post_count, showcase_count, follower_count, reputation_score, review_avg, review_count"
      )
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ score: 0, breakdown: {}, badges_earned: [] })
    }

    // Profile completeness check
    const profileFields = [
      profile.display_name,
      profile.bio,
      profile.avatar_url,
      profile.location_city,
      profile.website,
      profile.skills,
      profile.languages,
      profile.equipment,
      profile.software,
    ]
    const filledFields = profileFields.filter((f) => {
      if (Array.isArray(f)) return f.length > 0
      return f !== null && f !== undefined && f !== ""
    })
    const profileComplete = filledFields.length >= 6 // at least 6 of 9 fields filled
    const profileScore = profileComplete ? 20 : 0

    // Posts
    const postCount = profile.post_count ?? 0
    const postScore = Math.min(50, postCount * 2)

    // Showcases
    const showcaseCount = profile.showcase_count ?? 0
    const showcaseScore = Math.min(60, showcaseCount * 3)

    // Followers
    const followerCount = profile.follower_count ?? 0
    const followerScore = Math.min(100, followerCount)

    // 5-star reviews received
    const { count: fiveStarCount2 } = await supabase
      .from("project_reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewee_uid", uid)
      .eq("rating", 5)
    const reviewScore = (fiveStarCount2 ?? 0) * 10

    // Completed projects
    const { count: completedCount } = await supabase
      .from("project_listings")
      .select("id", { count: "exact", head: true })
      .eq("poster_uid", uid)
      .eq("status", "completed")
    const projectScore = (completedCount ?? 0) * 15

    const totalScore =
      profileScore +
      postScore +
      showcaseScore +
      followerScore +
      reviewScore +
      projectScore

    const breakdown = {
      profile_complete: { score: profileScore, value: profileComplete, max: 20 },
      posts: { score: postScore, value: postCount, max: 50 },
      showcases: { score: showcaseScore, value: showcaseCount, max: 60 },
      followers: { score: followerScore, value: followerCount, max: 100 },
      reviews: { score: reviewScore, value: (fiveStarCount2 ?? 0), max: null },
      projects_completed: { score: projectScore, value: completedCount ?? 0, max: null },
    }

    return NextResponse.json({
      score: totalScore,
      breakdown,
      badges_earned: [],
    })
  } catch (err) {
    console.error("[reputation GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

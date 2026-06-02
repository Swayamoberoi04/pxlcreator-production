/**
 * POST /api/community/projects/[id]/review  — submit a review for a completed project
 * GET  /api/community/projects/[id]/review  — list reviews for a project
 *
 * POST body: { reviewee_uid, rating(1-5), body, communication(1-5), quality(1-5),
 *              professionalism(1-5), on_time(bool), would_work_again(bool) }
 *   Auth required.
 *   Project must have status "completed".
 *   Cannot review the same project twice (unique on project_id, reviewer_uid).
 *   Updates reviewee's community_profiles.review_avg and review_count.
 *   Increments reputation_score by 5 for 4-5 star reviews.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params

  try {
    const supabase = createAdminClient()

    const { data: reviews, error } = await supabase
      .from("project_reviews")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[project review GET]", error)
      return NextResponse.json({ error: "Failed to fetch reviews." }, { status: 500 })
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ reviews: [] })
    }

    // Enrich with reviewer profiles
    const reviewerUids = [...new Set(reviews.map((r: { reviewer_uid: string }) => r.reviewer_uid))]
    const { data: profiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .in("firebase_uid", reviewerUids)

    const profileMap = new Map(
      (profiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p])
    )

    const enriched = reviews.map((r: Record<string, unknown>) => ({
      ...r,
      reviewer: profileMap.get(r.reviewer_uid as string) ?? null,
    }))

    return NextResponse.json({ reviews: enriched })
  } catch (err) {
    console.error("[project review GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const {
    reviewee_uid,
    rating,
    body: reviewBody,
    communication,
    quality,
    professionalism,
    on_time,
    would_work_again,
  } = body as {
    reviewee_uid?: string
    rating?: number
    body?: string
    communication?: number
    quality?: number
    professionalism?: number
    on_time?: boolean
    would_work_again?: boolean
  }

  if (!reviewee_uid || typeof reviewee_uid !== "string") {
    return NextResponse.json({ error: "reviewee_uid is required." }, { status: 400 })
  }
  if (reviewee_uid === uid) {
    return NextResponse.json({ error: "You cannot review yourself." }, { status: 400 })
  }

  function validRating(v: unknown): v is number {
    return typeof v === "number" && v >= 1 && v <= 5 && Number.isInteger(v)
  }

  if (!validRating(rating)) {
    return NextResponse.json({ error: "rating must be an integer 1-5." }, { status: 400 })
  }
  if (!validRating(communication)) {
    return NextResponse.json({ error: "communication must be an integer 1-5." }, { status: 400 })
  }
  if (!validRating(quality)) {
    return NextResponse.json({ error: "quality must be an integer 1-5." }, { status: 400 })
  }
  if (!validRating(professionalism)) {
    return NextResponse.json({ error: "professionalism must be an integer 1-5." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Verify project exists and is completed
    const { data: project } = await supabase
      .from("project_listings")
      .select("id, status")
      .eq("id", projectId)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (project.status !== "completed") {
      return NextResponse.json({ error: "Reviews can only be submitted for completed projects." }, { status: 400 })
    }

    // Insert review
    const { data: review, error: insertError } = await supabase
      .from("project_reviews")
      .insert({
        project_id: projectId,
        reviewer_uid: uid,
        reviewee_uid,
        rating,
        body: reviewBody ?? null,
        communication,
        quality,
        professionalism,
        on_time: typeof on_time === "boolean" ? on_time : true,
        would_work_again: typeof would_work_again === "boolean" ? would_work_again : true,
      })
      .select("*")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "You have already reviewed this project." }, { status: 409 })
      }
      console.error("[project review POST] insert", insertError)
      return NextResponse.json({ error: "Failed to submit review." }, { status: 500 })
    }

    // Recalculate reviewee's review_avg and review_count
    const { data: allReviews } = await supabase
      .from("project_reviews")
      .select("rating")
      .eq("reviewee_uid", reviewee_uid)

    if (allReviews && allReviews.length > 0) {
      const totalRating = allReviews.reduce(
        (sum: number, r: { rating: number }) => sum + r.rating,
        0
      )
      const newAvg = totalRating / allReviews.length
      const newCount = allReviews.length

      await supabase
        .from("community_profiles")
        .update({
          review_avg: Math.round(newAvg * 100) / 100,
          review_count: newCount,
        } as never)
        .eq("firebase_uid", reviewee_uid)
    }

    // Increment reputation_score by 5 for 4-5 star reviews
    if (rating >= 4) {
      const { data: revieweeProfile } = await supabase
        .from("community_profiles")
        .select("reputation_score")
        .eq("firebase_uid", reviewee_uid)
        .maybeSingle()

      if (revieweeProfile) {
        await supabase
          .from("community_profiles")
          .update({ reputation_score: ((revieweeProfile.reputation_score ?? 0) + 5) } as never)
          .eq("firebase_uid", reviewee_uid)
      }
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (err) {
    console.error("[project review POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

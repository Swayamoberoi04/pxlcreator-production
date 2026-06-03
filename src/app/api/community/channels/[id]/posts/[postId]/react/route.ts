/**
 * POST  /api/community/channels/[id]/posts/[postId]/react
 *
 * Body: { reaction: "like" | "love" | "fire" | "insightful" | "clap" }
 *
 * Toggle logic:
 *   - Same reaction exists → delete (un-react)
 *   - Different reaction exists → update to new one
 *   - No reaction → insert
 *
 * Updates post_reactions table and channel_posts.like_count.
 * Returns: { user_reaction: string | null, like_count: number }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })

const VALID_REACTIONS = ["like", "love", "fire", "insightful", "clap"] as const
type Reaction = typeof VALID_REACTIONS[number]

type Params = { params: Promise<{ id: string; postId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: channelId, postId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { reaction?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { reaction } = body
  if (!reaction || !VALID_REACTIONS.includes(reaction as Reaction)) {
    return NextResponse.json(
      { error: `reaction must be one of: ${VALID_REACTIONS.join(", ")}.` },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    // Verify post exists and belongs to this channel
    const { data: post, error: postError } = await supabase
      .from("channel_posts")
      .select("id, like_count, channel_id")
      .eq("id", postId)
      .eq("channel_id", channelId)
      .maybeSingle()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    // Check existing reaction
    const { data: existing } = await supabase
      .from("post_reactions")
      .select("reaction")
      .eq("post_id", postId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    let userReaction: string | null = null
    let likeDelta = 0

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction — remove it (toggle off)
        await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("firebase_uid", uid)

        userReaction = null
        likeDelta = -1
      } else {
        // Different reaction — update
        await supabase
          .from("post_reactions")
          .update({ reaction })
          .eq("post_id", postId)
          .eq("firebase_uid", uid)

        userReaction = reaction
        likeDelta = 0 // count doesn't change; only reaction type changes
      }
    } else {
      // No existing reaction — insert
      await supabase.from("post_reactions").insert({
        post_id: postId,
        firebase_uid: uid,
        reaction,
      })

      userReaction = reaction
      likeDelta = 1
    }

    // Update like_count on post
    const newLikeCount = Math.max(0, (post.like_count ?? 0) + likeDelta)
    if (likeDelta !== 0) {
      await supabase
        .from("channel_posts")
        .update({ like_count: newLikeCount })
        .eq("id", postId)
    }

    // Fetch fresh count
    const { data: refreshed } = await supabase
      .from("channel_posts")
      .select("like_count")
      .eq("id", postId)
      .maybeSingle()

    return NextResponse.json({
      user_reaction: userReaction,
      like_count: refreshed?.like_count ?? newLikeCount,
    })
  } catch (err) {
    console.error("[posts/react POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

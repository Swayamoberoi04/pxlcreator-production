/**
 * POST /api/community/feed/[id]/like
 *
 * Body: { reaction?: "like" | "love" | "fire" | "insightful" | "clap" } (default "like")
 *
 * Same toggle logic as the existing channel-post reaction route (same
 * post_reactions table, same like_count column) — this is the feed-post
 * equivalent with no channel to scope through.
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 120, windowMs: 60 * 60 * 1000 })
const VALID_REACTIONS = ["like", "love", "fire", "insightful", "clap"] as const
type Reaction = typeof VALID_REACTIONS[number]

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { reaction?: string }
  try {
    body = await req.json().catch(() => ({}))
  } catch {
    body = {}
  }
  const reaction = (body.reaction ?? "like") as Reaction
  if (!VALID_REACTIONS.includes(reaction)) {
    return NextResponse.json({ error: `reaction must be one of: ${VALID_REACTIONS.join(", ")}.` }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: post, error: postError } = await supabase
      .from("channel_posts")
      .select("id, like_count, is_removed")
      .eq("id", postId)
      .maybeSingle()

    if (postError || !post || post.is_removed) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    await ensureProfile(uid)

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
        await supabase.from("post_reactions").delete().eq("post_id", postId).eq("firebase_uid", uid)
        userReaction = null
        likeDelta = -1
      } else {
        await supabase.from("post_reactions").update({ reaction }).eq("post_id", postId).eq("firebase_uid", uid)
        userReaction = reaction
      }
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, firebase_uid: uid, reaction })
      userReaction = reaction
      likeDelta = 1
    }

    let likeCount = post.like_count ?? 0
    if (likeDelta !== 0) {
      likeCount = Math.max(0, likeCount + likeDelta)
      await supabase.from("channel_posts").update({ like_count: likeCount }).eq("id", postId)
    }

    return NextResponse.json({ user_reaction: userReaction, like_count: likeCount })
  } catch (err) {
    console.error("[feed/[id]/like POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

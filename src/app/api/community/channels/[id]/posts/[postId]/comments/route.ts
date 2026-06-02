/**
 * GET   /api/community/channels/[id]/posts/[postId]/comments  — list comments (nested)
 * POST  /api/community/channels/[id]/posts/[postId]/comments  — create comment
 *
 * GET query params: ?page=1, ?limit=50
 * POST body: { body (max 2000 chars), parent_id? }
 *
 * Increments channel_posts.comment_count on create.
 * Sends notification to post author (type: "post_reply").
 *
 * Auth: GET is public; POST requires auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const commentLimiter = makeRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string; postId: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: channelId, postId } = await params

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from("channel_posts")
      .select("id, channel_id")
      .eq("id", postId)
      .eq("channel_id", channelId)
      .maybeSingle()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    // Fetch all comments for this post (top-level + replies)
    const { data: comments, error: commentsError, count } = await supabase
      .from("post_comments")
      .select("*", { count: "exact" })
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    if (commentsError) {
      console.error("[comments GET]", commentsError)
      return NextResponse.json({ error: "Failed to fetch comments." }, { status: 500 })
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [], total: 0, page, limit })
    }

    // Fetch author profiles
    const authorUids = [...new Set(comments.map((c: { author_uid: string }) => c.author_uid))]
    const { data: authorProfiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .in("firebase_uid", authorUids)

    const profileMap = new Map(
      (authorProfiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p])
    )

    // Nest: top-level comments with replies array
    const topLevel: Array<Record<string, unknown>> = []
    const replyMap = new Map<string, Array<Record<string, unknown>>>()

    for (const comment of comments as Array<Record<string, unknown>>) {
      const enriched = {
        ...comment,
        author: profileMap.get(comment.author_uid as string) ?? null,
        replies: [] as Array<Record<string, unknown>>,
      }
      if (comment.parent_id) {
        const list = replyMap.get(comment.parent_id as string) ?? []
        list.push(enriched)
        replyMap.set(comment.parent_id as string, list)
      } else {
        topLevel.push(enriched)
      }
    }

    // Attach replies to parent comments
    for (const comment of topLevel) {
      comment.replies = replyMap.get(comment.id as string) ?? []
    }

    return NextResponse.json({ comments: topLevel, total: count ?? 0, page, limit })
  } catch (err) {
    console.error("[comments GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: channelId, postId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (commentLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("body").maxLen("body", 2000)
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const { body: commentBody, parent_id } = body as {
    body: string
    parent_id?: string
  }

  try {
    const supabase = createAdminClient()

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from("channel_posts")
      .select("id, channel_id, author_uid, comment_count, title")
      .eq("id", postId)
      .eq("channel_id", channelId)
      .maybeSingle()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    // Validate parent_id if provided
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from("post_comments")
        .select("id")
        .eq("id", parent_id)
        .eq("post_id", postId)
        .maybeSingle()
      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found." }, { status: 404 })
      }
    }

    await ensureProfile(uid)

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        author_uid: uid,
        parent_id: parent_id ?? null,
        body: commentBody,
        like_count: 0,
      })
      .select("*")
      .single()

    if (insertError) {
      console.error("[comments POST] insert", insertError)
      return NextResponse.json({ error: "Failed to create comment." }, { status: 500 })
    }

    // Increment post comment_count
    await supabase
      .from("channel_posts")
      .update({ comment_count: (post.comment_count ?? 0) + 1 })
      .eq("id", postId)

    // Notify post author (don't notify self)
    if (post.author_uid !== uid) {
      const { data: actorProfile } = await supabase
        .from("community_profiles")
        .select("display_name, username")
        .eq("firebase_uid", uid)
        .maybeSingle()

      const actorName = actorProfile?.display_name ?? actorProfile?.username ?? "Someone"
      const postTitle = (post as Record<string, unknown>).title
        ? `"${(post as Record<string, unknown>).title}"`
        : "your post"

      await supabase.from("community_notifications").insert({
        recipient_uid: post.author_uid,
        actor_uid: uid,
        type: "post_reply",
        title: `${actorName} commented on ${postTitle}`,
        body: commentBody.slice(0, 150),
        resource_type: "post",
        resource_id: postId,
        is_read: false,
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    console.error("[comments POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

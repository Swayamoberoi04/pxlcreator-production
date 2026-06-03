/**
 * GET   /api/community/channels/[id]/posts  — list posts for a channel
 * POST  /api/community/channels/[id]/posts  — create a post
 *
 * GET query params: ?page=1, ?limit=20, ?pinned=true
 * POST body: { title?, body, post_type, hashtags[] }
 *
 * Private channels: members only.
 * Auth: GET optional for public channels; POST requires auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const postLimiter = makeRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: channelId } = await params
  const uid = await getFirebaseUidFromRequest(req) // optional

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const pinnedOnly = searchParams.get("pinned") === "true"
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    // Fetch channel for visibility check
    const { data: channel, error: channelError } = await supabase
      .from("community_channels")
      .select("id, visibility")
      .eq("id", channelId)
      .maybeSingle()

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }

    // Private channel: require membership
    if (channel.visibility === "private") {
      if (!uid) {
        return NextResponse.json({ error: "Authentication required to view this channel." }, { status: 401 })
      }
      const { data: memberRow } = await supabase
        .from("channel_members")
        .select("role")
        .eq("channel_id", channelId)
        .eq("firebase_uid", uid)
        .maybeSingle()
      if (!memberRow) {
        return NextResponse.json({ error: "You must be a member to view posts in this channel." }, { status: 403 })
      }
    }

    let query = supabase
      .from("channel_posts")
      .select("*", { count: "exact" })
      .eq("channel_id", channelId)

    if (pinnedOnly) {
      query = query.eq("is_pinned", true)
    }

    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: posts, error: postsError, count } = await query

    if (postsError) {
      console.error("[channels/posts GET]", postsError)
      return NextResponse.json({ error: "Failed to fetch posts." }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [], total: 0, page, limit })
    }

    // Fetch author profiles
    const authorUids = [...new Set(posts.map((p: { author_uid: string }) => p.author_uid))]
    const { data: authorProfiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .in("firebase_uid", authorUids)

    const profileMap = new Map(
      (authorProfiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p])
    )

    // Fetch user reactions if authenticated
    let reactionMap = new Map<string, string>()
    if (uid) {
      const postIds = posts.map((p: { id: string }) => p.id)
      const { data: reactions } = await supabase
        .from("post_reactions")
        .select("post_id, reaction")
        .eq("firebase_uid", uid)
        .in("post_id", postIds)
      reactionMap = new Map(
        (reactions ?? [])
          .filter((r): r is { post_id: string; reaction: string } => r.post_id !== null)
          .map((r) => [r.post_id, r.reaction])
      )
    }

    const enriched = posts.map((post: Record<string, unknown>) => ({
      ...post,
      author: profileMap.get(post.author_uid as string) ?? null,
      user_reaction: reactionMap.get(post.id as string) ?? null,
    }))

    return NextResponse.json({ posts: enriched, total: count ?? 0, page, limit })
  } catch (err) {
    console.error("[channels/posts GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: channelId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (postLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("body")
    .maxLen("body", 5000)
    .maxLen("title", 200)

  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const { body: postBody, title, post_type, hashtags } = body as {
    body: string
    title?: string
    post_type?: string
    hashtags?: string[]
  }

  try {
    const supabase = createAdminClient()

    // Fetch channel
    const { data: channel, error: channelError } = await supabase
      .from("community_channels")
      .select("id, visibility, post_count")
      .eq("id", channelId)
      .maybeSingle()

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }

    // For any channel (public or private): verify membership
    const { data: memberRow } = await supabase
      .from("channel_members")
      .select("role")
      .eq("channel_id", channelId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (!memberRow) {
      return NextResponse.json({ error: "You must join the channel before posting." }, { status: 403 })
    }

    await ensureProfile(uid)

    // Insert post
    const { data: post, error: insertError } = await supabase
      .from("channel_posts")
      .insert({
        channel_id: channelId,
        author_uid: uid,
        title: title ?? null,
        body: postBody,
        post_type: post_type ?? "text",
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        is_pinned: false,
        like_count: 0,
        comment_count: 0,
      })
      .select("*")
      .single()

    if (insertError) {
      console.error("[channels/posts POST] insert", insertError)
      return NextResponse.json({ error: "Failed to create post." }, { status: 500 })
    }

    // Increment channel post_count
    await supabase
      .from("community_channels")
      .update({ post_count: (channel.post_count ?? 0) + 1 })
      .eq("id", channelId)

    // Increment author's post_count
    const { data: authorProfile } = await supabase
      .from("community_profiles")
      .select("post_count")
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (authorProfile) {
      await supabase
        .from("community_profiles")
        .update({ post_count: (authorProfile.post_count ?? 0) + 1 })
        .eq("firebase_uid", uid)
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    console.error("[channels/posts POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

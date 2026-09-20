/**
 * GET  /api/community/feed — the ranked creator feed
 * POST /api/community/feed — create a feed post (channel_id = null)
 *
 * GET is a real-signal ranking, not a fabricated one — see scorePost() in
 * src/lib/community/feed.ts for the exact, documented formula. It ranks a
 * bounded recent window (last 30 days, capped at 300 candidates) in memory,
 * then paginates the ranked list — cheap and honest at the project's current
 * scale, and never invents a signal it doesn't have.
 *
 * Query params:
 *   ?page=1 ?limit=12
 *   ?author=<firebase_uid> — a single creator's posts for their profile page,
 *     chronological (not ranked — ranking is a cross-creator relevance
 *     concept, meaningless for "this one person's timeline")
 * Auth: optional for GET (public posts only when signed out; a signed-in
 * viewer additionally sees 'followers'-visibility posts from people they follow,
 * or from themself).
 *
 * POST body: { body, title?, content_kind?, ai_assisted?, hashtags?, visibility?, media?: [{media_url, media_type, role?}] }
 * Auth: required for POST.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"
import { enrichPosts, scorePost } from "@/lib/community/feed"
import { getHiddenUids, filterHidden } from "@/lib/community/visibility"
import { CONTENT_KINDS } from "@/types/community"

export const runtime = "nodejs"

const postLimiter = makeRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 })
const VALID_KINDS = CONTENT_KINDS.map((k) => k.id)
const CANDIDATE_WINDOW_DAYS = 30
const CANDIDATE_CAP = 300

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req) // optional

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12))
  const authorFilter = searchParams.get("author")

  try {
    const supabase = createAdminClient()

    // Candidate pool: public feed posts, plus (if signed in) followers-only
    // posts from creators the viewer actually follows.
    let following = new Set<string>()
    if (uid) {
      const { data: followRows } = await supabase
        .from("creator_follows")
        .select("following_uid")
        .eq("follower_uid", uid)
      following = new Set((followRows ?? []).map((f) => f.following_uid))
    }

    if (authorFilter) {
      // Single-author timeline for a profile page: chronological, paginated
      // directly by the DB — no in-memory ranking (ranking compares across
      // creators; on one person's own timeline it has nothing to compare).
      const canSeeFollowersOnly = uid === authorFilter || following.has(authorFilter)
      let authorQuery = supabase
        .from("channel_posts")
        .select("*", { count: "exact" })
        .is("channel_id", null)
        .eq("is_removed", false)
        .eq("author_uid", authorFilter)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      authorQuery = canSeeFollowersOnly
        ? authorQuery.in("visibility", ["public", "followers"])
        : authorQuery.eq("visibility", "public")

      const { data: authorPosts, count, error: authorError } = await authorQuery
      if (authorError) {
        console.error("[feed GET] author timeline", authorError)
        return NextResponse.json({ error: "Failed to load posts." }, { status: 500 })
      }
      const enrichedAuthorPosts = await enrichPosts(supabase, (authorPosts ?? []) as never, uid)
      return NextResponse.json({
        posts: enrichedAuthorPosts,
        total: count ?? 0,
        page, limit,
        hasMore: page * limit < (count ?? 0),
      })
    }

    const since = new Date(Date.now() - CANDIDATE_WINDOW_DAYS * 86_400_000).toISOString()

    let query = supabase
      .from("channel_posts")
      .select("*")
      .is("channel_id", null)
      .eq("is_removed", false)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(CANDIDATE_CAP)

    // Visibility: always include public; include followers-only only for
    // posts by creators the viewer follows (never guessed, never bypassed).
    if (following.size > 0) {
      query = query.or(`visibility.eq.public,and(visibility.eq.followers,author_uid.in.(${[...following].join(",")}))`)
    } else {
      query = query.eq("visibility", "public")
    }

    const { data: candidates, error } = await query
    if (error) {
      console.error("[feed GET] candidates", error)
      return NextResponse.json({ error: "Failed to load feed." }, { status: 500 })
    }

    // Tag-match signal: viewer's own roles/style_tags vs each author's.
    let viewerTags = new Set<string>()
    const authorTags = new Map<string, string[]>()
    if ((candidates ?? []).length > 0) {
      const authorUids = [...new Set((candidates ?? []).map((c) => c.author_uid as string))]
      const { data: authorProfiles } = await supabase
        .from("community_profiles")
        .select("firebase_uid, roles, style_tags")
        .in("firebase_uid", authorUids)
      for (const p of authorProfiles ?? []) {
        authorTags.set(p.firebase_uid, [...(p.roles ?? []), ...(p.style_tags ?? [])])
      }
      if (uid) {
        const { data: viewerProfile } = await supabase
          .from("community_profiles")
          .select("roles, style_tags")
          .eq("firebase_uid", uid)
          .maybeSingle()
        viewerTags = new Set([...(viewerProfile?.roles ?? []), ...(viewerProfile?.style_tags ?? [])])
      }
    }

    // Posts by banned creators, and by anyone the viewer blocked/muted (or
    // who blocked them), never reach the feed.
    const hidden = await getHiddenUids(supabase, uid)
    const visibleCandidates = filterHidden(
      (candidates ?? []) as Record<string, unknown>[],
      hidden.uids,
      "author_uid"
    )

    const ranked = visibleCandidates
      .map((post) => ({
        post,
        score: scorePost(
          post as never,
          { viewerUid: uid, following, viewerTags, authorTags }
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.post)

    const total = ranked.length
    const offset = (page - 1) * limit
    const pagePosts = ranked.slice(offset, offset + limit)

    const enriched = await enrichPosts(supabase, pagePosts as never, uid)

    return NextResponse.json({ posts: enriched, total, page, limit, hasMore: offset + limit < total })
  } catch (err) {
    console.error("[feed GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
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
  v.required("body").maxLen("body", 5000).maxLen("title", 200)
  if (body.content_kind !== undefined) v.oneOf("content_kind", VALID_KINDS)
  if (body.visibility !== undefined) v.oneOf("visibility", ["public", "followers"])
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const {
    body: postBody, title, content_kind, ai_assisted, hashtags, visibility, media,
  } = body as {
    body: string
    title?: string
    content_kind?: string
    ai_assisted?: boolean
    hashtags?: string[]
    visibility?: string
    media?: { media_url: string; media_type?: string; role?: string }[]
  }

  // before_after posts need at least a before AND an after image — otherwise
  // the label promises something the post doesn't contain.
  if (content_kind === "before_after") {
    const roles = new Set((media ?? []).map((m) => m.role))
    if (!roles.has("before") || !roles.has("after")) {
      return NextResponse.json(
        { error: "A Before/After post needs at least one 'before' and one 'after' media item." },
        { status: 400 }
      )
    }
  }

  try {
    const supabase = createAdminClient()
    await ensureProfile(uid)

    const { data: post, error: insertError } = await supabase
      .from("channel_posts")
      .insert({
        channel_id: null,
        author_uid: uid,
        title: title ?? null,
        body: postBody,
        content_kind: content_kind ?? "text",
        ai_assisted: ai_assisted === true,
        visibility: visibility ?? "public",
        hashtags: Array.isArray(hashtags) ? hashtags.slice(0, 15) : [],
        is_pinned: false,
        like_count: 0,
        comment_count: 0,
      })
      .select("*")
      .single()

    if (insertError || !post) {
      console.error("[feed POST] insert", insertError)
      return NextResponse.json({ error: "Failed to create post." }, { status: 500 })
    }

    if (Array.isArray(media) && media.length > 0) {
      const rows = media.slice(0, 10).map((m, i) => ({
        post_id: post.id,
        media_url: m.media_url,
        media_type: m.media_type === "video" ? "video" : "image",
        role: m.role === "before" || m.role === "after" ? m.role : null,
        position: i,
      }))
      const { error: mediaError } = await supabase.from("post_media").insert(rows)
      if (mediaError) console.error("[feed POST] media insert", mediaError)
    }

    // Real post_count, same increment pattern used everywhere else in the app.
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

    const [enriched] = await enrichPosts(supabase, [post as never], uid)
    return NextResponse.json({ post: enriched }, { status: 201 })
  } catch (err) {
    console.error("[feed POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

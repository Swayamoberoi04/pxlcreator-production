/**
 * GET  /api/community/showcase — list showcase items
 * POST /api/community/showcase — create showcase item
 *
 * Query params (GET):
 *   ?uid=         filter by author firebase_uid
 *   ?category=    filter by category
 *   ?featured=true
 *   ?page=1 &limit=20
 */

import { NextRequest, NextResponse }    from "next/server"
import { createAdminClient }            from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }    from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import type { ShowcaseItem }            from "@/types/community"

export const runtime = "nodejs"

const createLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────────── */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const uid      = searchParams.get("uid")
  const category = searchParams.get("category")
  const featured = searchParams.get("featured") === "true"
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20"))
  const offset   = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("showcase_items")
      .select("*, author:community_profiles!showcase_items_author_uid_fkey(username,display_name,avatar_url,is_verified)", { count: "exact" })
      .eq("is_removed", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (uid)      query = query.eq("author_uid", uid)
    if (category) query = query.eq("category", category)
    if (featured) query = query.eq("is_featured", true)

    const { data, count, error } = await query
    if (error) throw error

    // If current user is logged in, check their reactions
    let userReactions: Record<string, string[]> = {}
    const authUid = await getFirebaseUidFromRequest(req).catch(() => null)
    if (authUid && data?.length) {
      const ids = data.map((i) => i.id)
      const { data: reactions } = await supabase
        .from("showcase_reactions")
        .select("showcase_id, reaction")
        .eq("firebase_uid", authUid)
        .in("showcase_id", ids)

      for (const r of reactions ?? []) {
        if (!userReactions[r.showcase_id]) userReactions[r.showcase_id] = []
        userReactions[r.showcase_id].push(r.reaction)
      }
    }

    const items = (data ?? []).map((item) => ({
      ...item,
      is_liked:      userReactions[item.id]?.includes("like") ?? false,
      is_bookmarked: userReactions[item.id]?.includes("bookmark") ?? false,
    }))

    return NextResponse.json({
      items,
      total:    count ?? 0,
      page,
      has_more: offset + limit < (count ?? 0),
    })
  } catch (err) {
    console.error("[showcase GET]", err)
    return NextResponse.json({ error: "Failed to load showcase." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────────── */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req)
  if (createLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: Partial<ShowcaseItem>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { title, description, item_type, media_urls, before_url, after_url,
          thumbnail_url, category, software_used, hashtags } = body

  if (!title?.trim() || title.length > 150) {
    return NextResponse.json({ error: "Title is required (max 150 chars)." }, { status: 400 })
  }
  if (!item_type || !["photo","video","before_after","reel","short_film"].includes(item_type)) {
    return NextResponse.json({ error: "Invalid item type." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("showcase_items")
      .insert({
        author_uid:    uid,
        title:         title.trim(),
        description:   description?.slice(0, 1000) ?? null,
        item_type,
        media_urls:    media_urls ?? [],
        before_url:    before_url ?? null,
        after_url:     after_url ?? null,
        thumbnail_url: thumbnail_url ?? null,
        category:      category ?? "other",
        software_used: software_used ?? [],
        hashtags:      (hashtags ?? []).slice(0, 10),
      })
      .select()
      .single()

    if (error) throw error

    // Increment author's showcase_count
    const { data: currentProfile } = await supabase
      .from("community_profiles")
      .select("showcase_count")
      .eq("firebase_uid", uid)
      .single()

    if (currentProfile) {
      await supabase
        .from("community_profiles")
        .update({ showcase_count: (currentProfile.showcase_count ?? 0) + 1 })
        .eq("firebase_uid", uid)
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error("[showcase POST]", err)
    return NextResponse.json({ error: "Failed to create showcase item." }, { status: 500 })
  }
}

/* ── POST /api/community/showcase/[id]/react ─────────────────── */
// Handled in separate route file

/**
 * GET  /api/community/showcase — list showcase items
 * POST /api/community/showcase — create showcase item
 *
 * Query params (GET):
 *   ?uid=         filter by author firebase_uid — when uid is the signed-in
 *                 viewer, their private showcases are included too;
 *                 otherwise only that creator's public ones
 *   ?category=    filter by category
 *   ?featured=true
 *   ?page=1 &limit=20
 *
 * POST body adds (Phase 5.4): project_id?, client_name?, visibility?
 * Showcases are permanent: nothing here ever auto-removes one. Only the
 * owner's own DELETE (/api/community/showcase/[id]) or admin moderation
 * (is_removed) takes an item off a profile.
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
    const viewerUid = await getFirebaseUidFromRequest(req).catch(() => null)

    // No FK constraint actually exists between showcase_items.author_uid and
    // community_profiles.firebase_uid (migration 012 never declared one), so
    // PostgREST's embedded-join syntax used here previously ("!fkey(...)")
    // could never resolve and this endpoint 500'd unconditionally. Joining
    // in memory, same pattern as every other route in this codebase.
    let query = supabase
      .from("showcase_items")
      .select("*", { count: "exact" })
      .eq("is_removed", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (uid) {
      query = query.eq("author_uid", uid)
      // A creator viewing their own filtered list sees their private items
      // too; anyone else viewing that creator's showcase sees public only.
      if (uid !== viewerUid) query = query.eq("visibility", "public")
    } else {
      // The general showcase feed never surfaces a private item.
      query = query.eq("visibility", "public")
    }
    if (category) query = query.eq("category", category)
    if (featured) query = query.eq("is_featured", true)

    const { data, count, error } = await query
    if (error) throw error

    // If current user is logged in, check their reactions
    const userReactions: Record<string, string[]> = {}
    if (viewerUid && data?.length) {
      const ids = data.map((i) => i.id)
      const { data: reactions } = await supabase
        .from("showcase_reactions")
        .select("showcase_id, reaction")
        .eq("firebase_uid", viewerUid)
        .in("showcase_id", ids)

      for (const r of reactions ?? []) {
        if (!userReactions[r.showcase_id]) userReactions[r.showcase_id] = []
        userReactions[r.showcase_id].push(r.reaction)
      }
    }

    // Author profiles — the batched join the broken embedded-select above
    // was trying (and failing) to do.
    const authorUids = [...new Set((data ?? []).map((i) => i.author_uid))]
    let authorMap = new Map<string, Record<string, unknown>>()
    if (authorUids.length > 0) {
      const { data: authors } = await supabase
        .from("community_profiles")
        .select("firebase_uid, username, display_name, avatar_url, is_verified")
        .in("firebase_uid", authorUids)
      authorMap = new Map((authors ?? []).map((a) => [a.firebase_uid, a]))
    }

    // Real client-work linkage — batch-fetch the small set of distinct
    // projects referenced by this page rather than one query per item.
    const projectIds = [...new Set((data ?? []).map((i) => i.project_id).filter(Boolean))] as string[]
    let projectMap = new Map<string, { id: string; title: string }>()
    if (projectIds.length > 0) {
      const { data: projects } = await supabase.from("project_listings").select("id, title").in("id", projectIds)
      projectMap = new Map((projects ?? []).map((p) => [p.id, p]))
    }

    const items = (data ?? []).map((item) => ({
      ...item,
      author:        authorMap.get(item.author_uid) ?? null,
      is_liked:      userReactions[item.id]?.includes("like") ?? false,
      is_bookmarked: userReactions[item.id]?.includes("bookmark") ?? false,
      is_owner:      viewerUid === item.author_uid,
      project:       item.project_id ? (projectMap.get(item.project_id) ?? null) : null,
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
          thumbnail_url, category, software_used, hashtags,
          project_id, client_name, visibility } = body

  if (!title?.trim() || title.length > 150) {
    return NextResponse.json({ error: "Title is required (max 150 chars)." }, { status: 400 })
  }
  if (!item_type || !["photo","video","before_after","reel","short_film"].includes(item_type)) {
    return NextResponse.json({ error: "Invalid item type." }, { status: 400 })
  }
  if (visibility !== undefined && !["public", "private"].includes(visibility)) {
    return NextResponse.json({ error: "visibility must be 'public' or 'private'." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // A project_id must be real and must belong to this creator — a showcase
    // can only credit a project you actually posted or (in a later phase)
    // were accepted onto, never an arbitrary id.
    if (project_id) {
      const { data: proj } = await supabase
        .from("project_listings")
        .select("id, poster_uid")
        .eq("id", project_id)
        .maybeSingle()
      const { data: wasAccepted } = await supabase
        .from("project_applications")
        .select("id")
        .eq("project_id", project_id)
        .eq("applicant_uid", uid)
        .eq("status", "accepted")
        .maybeSingle()
      if (!proj || (proj.poster_uid !== uid && !wasAccepted)) {
        return NextResponse.json({ error: "You can only link a project you posted or were accepted onto." }, { status: 400 })
      }
    }

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
        project_id:    project_id ?? null,
        client_name:   client_name?.trim().slice(0, 120) || null,
        visibility:    visibility === "private" ? "private" : "public",
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

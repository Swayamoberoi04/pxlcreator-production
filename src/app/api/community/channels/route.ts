/**
 * GET   /api/community/channels  — list channels with filters
 * POST  /api/community/channels  — create a channel
 *
 * GET query params: ?category=, ?search=, ?joined=true, ?featured=true, ?page=1, ?limit=20
 * POST body: { name, description, category, visibility, tags[], icon? }
 *
 * Auth: GET is public (is_member requires auth); POST requires auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

// 5 channel creations per hour
const createLimiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
}

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req) // optional

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const search = searchParams.get("search")
  const joined = searchParams.get("joined") === "true"
  const featured = searchParams.get("featured") === "true"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("community_channels")
      .select("*", { count: "exact" })

    if (category) query = query.eq("category", category)
    if (featured) query = query.eq("is_featured", true)
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Filter to channels the user has joined
    if (joined && uid) {
      const { data: memberRows } = await supabase
        .from("channel_members")
        .select("channel_id")
        .eq("firebase_uid", uid)
      const channelIds = (memberRows ?? []).map((r: { channel_id: string }) => r.channel_id)
      if (channelIds.length === 0) {
        return NextResponse.json({ channels: [], total: 0, page, limit })
      }
      query = query.in("id", channelIds)
    }

    // Sort: featured first, then member_count desc
    query = query
      .order("is_featured", { ascending: false })
      .order("member_count", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: channels, error, count } = await query

    if (error) {
      console.error("[channels GET]", error)
      return NextResponse.json({ error: "Failed to fetch channels." }, { status: 500 })
    }

    // Attach is_member for authenticated users
    let memberSet = new Set<string>()
    if (uid && channels && channels.length > 0) {
      const channelIds = channels.map((c: { id: string }) => c.id)
      const { data: memberRows } = await supabase
        .from("channel_members")
        .select("channel_id")
        .eq("firebase_uid", uid)
        .in("channel_id", channelIds)
      memberSet = new Set((memberRows ?? []).map((r: { channel_id: string }) => r.channel_id))
    }

    const enriched = (channels ?? []).map((channel: Record<string, unknown>) => ({
      ...channel,
      is_member: memberSet.has(channel.id as string),
    }))

    return NextResponse.json({
      channels: enriched,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error("[channels GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (createLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests. You can create at most 5 channels per hour." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("name")
    .required("description")
    .required("category")
    .required("visibility")
    .maxLen("name", 80)
    .maxLen("description", 500)
    .oneOf("visibility", ["public", "private"])

  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const { name, description, category, visibility, tags, icon } = body as {
    name: string
    description: string
    category: string
    visibility: "public" | "private"
    tags?: string[]
    icon?: string
  }

  try {
    const supabase = createAdminClient()

    // Ensure owner profile exists
    await ensureProfile(uid)

    // Generate unique slug
    let slug = generateSlug(name)
    const { data: slugConflict } = await supabase
      .from("community_channels")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (slugConflict) {
      slug = slug.slice(0, 50) + "-" + Date.now().toString(36)
    }

    // Create channel
    const { data: channel, error: channelError } = await supabase
      .from("community_channels")
      .insert({
        slug,
        name,
        description,
        category,
        visibility,
        owner_uid: uid,
        moderator_uids: [uid],
        tags: Array.isArray(tags) ? tags : [],
        icon: icon ?? null,
        member_count: 1,
        post_count: 0,
        is_featured: false,
      })
      .select("*")
      .single()

    if (channelError) {
      console.error("[channels POST] channel insert", channelError)
      return NextResponse.json({ error: "Failed to create channel." }, { status: 500 })
    }

    // Add creator as owner member
    const { error: memberError } = await supabase.from("channel_members").insert({
      channel_id: channel.id,
      firebase_uid: uid,
      role: "owner",
    })

    if (memberError) {
      console.error("[channels POST] member insert", memberError)
      // Channel was created — don't fail the whole request, just log
    }

    return NextResponse.json({ channel }, { status: 201 })
  } catch (err) {
    console.error("[channels POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

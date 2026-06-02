/**
 * GET  /api/community/teams  — list teams
 * POST /api/community/teams  — create a team
 *
 * GET query params: ?category=, ?is_hiring=true, ?search=, ?page=1
 *   Public. Includes is_member for authenticated users.
 *
 * POST body: { name (max 60), description, category, visibility, tags[], is_hiring, roles_needed[], avatar_url? }
 *   Auth required. Auto-adds creator as owner.
 *   Rate limit: 3 teams per day.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

const createLimiter = makeRateLimiter({ max: 3, windowMs: 24 * 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req) // optional

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const isHiring = searchParams.get("is_hiring")
  const search = searchParams.get("search")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("community_teams")
      .select("*", { count: "exact" })
      .order("member_count", { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) query = query.eq("category", category)
    if (isHiring === "true") query = query.eq("is_hiring", true)
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: teams, error, count } = await query

    if (error) {
      console.error("[teams GET]", error)
      return NextResponse.json({ error: "Failed to fetch teams." }, { status: 500 })
    }

    if (!teams || teams.length === 0) {
      return NextResponse.json({ teams: [], total: 0, page, limit })
    }

    // Check membership for auth'd user
    let memberSet = new Set<string>()
    if (uid) {
      const teamIds = teams.map((t: { id: string }) => t.id)
      const { data: memberships } = await supabase
        .from("community_team_members")
        .select("team_id")
        .eq("firebase_uid", uid)
        .in("team_id", teamIds)
      memberSet = new Set((memberships ?? []).map((m: { team_id: string }) => m.team_id))
    }

    const enriched = teams.map((team: Record<string, unknown>) => ({
      ...team,
      is_member: memberSet.has(team.id as string),
    }))

    return NextResponse.json({ teams: enriched, total: count ?? 0, page, limit })
  } catch (err) {
    console.error("[teams GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (createLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many teams created today. Limit is 3 per day." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const {
    name,
    description,
    category,
    visibility,
    tags,
    is_hiring,
    roles_needed,
    avatar_url,
  } = body as {
    name?: string
    description?: string
    category?: string
    visibility?: string
    tags?: string[]
    is_hiring?: boolean
    roles_needed?: string[]
    avatar_url?: string
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 })
  }
  if (name.trim().length > 60) {
    return NextResponse.json({ error: "Team name must be 60 characters or fewer." }, { status: 400 })
  }
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 })
  }
  if (!category || typeof category !== "string") {
    return NextResponse.json({ error: "Category is required." }, { status: 400 })
  }

  const validVisibility = ["public", "invite_only"]
  const resolvedVisibility = validVisibility.includes(visibility ?? "") ? visibility : "public"

  try {
    const supabase = createAdminClient()
    await ensureProfile(uid)

    // Create team
    const { data: team, error: insertError } = await supabase
      .from("community_teams")
      .insert({
        name: name.trim(),
        description: description.trim(),
        owner_uid: uid,
        category,
        visibility: resolvedVisibility,
        tags: Array.isArray(tags) ? tags : [],
        is_hiring: typeof is_hiring === "boolean" ? is_hiring : false,
        roles_needed: Array.isArray(roles_needed) ? roles_needed : [],
        avatar_url: avatar_url ?? null,
        member_count: 1,
      })
      .select("*")
      .single()

    if (insertError) {
      console.error("[teams POST] insert team", insertError)
      return NextResponse.json({ error: "Failed to create team." }, { status: 500 })
    }

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from("community_team_members")
      .insert({
        team_id: team.id,
        firebase_uid: uid,
        role: "owner",
      })

    if (memberError) {
      console.error("[teams POST] insert member", memberError)
      // Team was created — still return it but log error
    }

    return NextResponse.json({ team }, { status: 201 })
  } catch (err) {
    console.error("[teams POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

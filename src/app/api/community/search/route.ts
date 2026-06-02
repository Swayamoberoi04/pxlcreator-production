/**
 * GET  /api/community/search
 *
 * Unified search across profiles, channels, and projects.
 *
 * Query params:
 *   ?q=           (required) — search term
 *   ?type=        profiles | channels | projects | all (default: all)
 *   ?role=        filter profiles by role (text array contains)
 *   ?availability= filter profiles by availability
 *   ?location=    filter profiles by location_city or location_country
 *   ?skill_level= filter profiles by skill_level
 *   ?category=    filter channels/projects by category
 *   ?work_type=   filter projects by work_type
 *   ?status=      filter projects by status (default: open for projects)
 *   ?page=1
 *   ?limit=10
 *
 * Returns: { profiles, channels, projects, total }
 *
 * Auth: optional.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const uid = await getFirebaseUidFromRequest(req) // optional
  const { searchParams } = new URL(req.url)

  const q = searchParams.get("q")?.trim()
  if (!q) {
    return NextResponse.json({ error: "q (search term) is required." }, { status: 400 })
  }

  const type = searchParams.get("type") ?? "all"
  const role = searchParams.get("role")
  const availability = searchParams.get("availability")
  const location = searchParams.get("location")
  const skill_level = searchParams.get("skill_level")
  const category = searchParams.get("category")
  const work_type = searchParams.get("work_type")
  const projectStatus = searchParams.get("status") ?? "open"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)))
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  const results: {
    profiles: unknown[]
    channels: unknown[]
    projects: unknown[]
    total: number
  } = { profiles: [], channels: [], projects: [], total: 0 }

  try {
    // ── Profiles ───────────────────────────────────────────
    if (type === "all" || type === "profiles") {
      let profileQuery = supabase
        .from("community_profiles")
        .select(
          "id, firebase_uid, username, display_name, bio, avatar_url, roles, skill_level, availability, location_city, location_country, is_verified, follower_count, reputation_score",
          { count: "exact" }
        )
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`)

      if (availability) profileQuery = profileQuery.eq("availability", availability)
      if (skill_level) profileQuery = profileQuery.eq("skill_level", skill_level)
      if (location) {
        profileQuery = profileQuery.or(
          `location_city.ilike.%${location}%,location_country.ilike.%${location}%`
        )
      }
      if (role) {
        // Filter profiles where roles array contains the given role
        profileQuery = profileQuery.contains("roles", [role])
      }

      profileQuery = profileQuery
        .order("follower_count", { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: profiles, count: profileCount } = await profileQuery
      results.profiles = profiles ?? []
      results.total += profileCount ?? 0
    }

    // ── Channels ───────────────────────────────────────────
    if (type === "all" || type === "channels") {
      let channelQuery = supabase
        .from("community_channels")
        .select("id, slug, name, description, category, visibility, member_count, post_count, is_featured, tags", {
          count: "exact",
        })
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .eq("visibility", "public") // only surface public channels in search

      if (category) channelQuery = channelQuery.eq("category", category)

      channelQuery = channelQuery
        .order("is_featured", { ascending: false })
        .order("member_count", { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: channels, count: channelCount } = await channelQuery

      // Attach is_member if authenticated
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

      results.channels = (channels ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        is_member: memberSet.has(c.id as string),
      }))
      results.total += channelCount ?? 0
    }

    // ── Projects ───────────────────────────────────────────
    if (type === "all" || type === "projects") {
      let projectQuery = supabase
        .from("project_listings")
        .select(
          "id, poster_uid, title, description, category, work_type, location_city, location_country, budget_min_usd, budget_max_usd, budget_type, deadline, skills_needed, status, applicant_count, created_at",
          { count: "exact" }
        )
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .eq("status", projectStatus)

      if (category) projectQuery = projectQuery.eq("category", category)
      if (work_type) projectQuery = projectQuery.eq("work_type", work_type)

      projectQuery = projectQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: projects, count: projectCount } = await projectQuery

      // Attach has_applied if authenticated
      let appliedSet = new Set<string>()
      if (uid && projects && projects.length > 0) {
        const projectIds = projects.map((p: { id: string }) => p.id)
        const { data: applications } = await supabase
          .from("project_applications")
          .select("project_id")
          .eq("applicant_uid", uid)
          .in("project_id", projectIds)
        appliedSet = new Set((applications ?? []).map((a: { project_id: string }) => a.project_id))
      }

      results.projects = (projects ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        has_applied: appliedSet.has(p.id as string),
      }))
      results.total += projectCount ?? 0
    }

    return NextResponse.json({
      profiles: results.profiles,
      channels: results.channels,
      projects: results.projects,
      total: results.total,
      page,
      limit,
      query: q,
    })
  } catch (err) {
    console.error("[search GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

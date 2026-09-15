/**
 * GET  /api/community/search
 *
 * Unified search across profiles, channels, and projects.
 *
 * Query params:
 *   ?q=            (optional) — search term. Omit to browse by filters alone.
 *   ?type=         profiles | channels | projects | all (default: all)
 *   ?role=         filter profiles by role — repeatable, matches ANY of them
 *   ?style=        filter profiles by style tag — repeatable, matches ANY
 *   ?skill=        filter profiles by skill — repeatable, matches ANY
 *   ?available_for= repeatable, matches ANY
 *   ?need_role=    alias for a single ?role=
 *   ?availability= filter profiles by availability
 *   ?location=     filter profiles by location_city or location_country
 *   ?skill_level=  filter profiles by skill_level
 *   ?category=     filter channels/projects by category
 *   ?work_type=    filter projects by work_type
 *   ?status=       filter projects by status (default: open for projects)
 *   ?page=1
 *   ?limit=10
 *
 * Returns: { profiles, channels, projects, total, totals: { profiles, … } }
 *
 * Only profiles with visibility = 'public' are ever returned.
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

  // `q` is optional: an empty search with no filters must return the real
  // directory rather than an error, otherwise Discover can never list anyone.
  // `,` `(` `)` are PostgREST filter-string delimiters, so strip them.
  const q = (searchParams.get("q") ?? "").trim().replace(/[,()]/g, "")

  const type = searchParams.get("type") ?? "all"
  const roles = [...searchParams.getAll("role"), ...searchParams.getAll("need_role")].filter(Boolean)
  const styles = searchParams.getAll("style").filter(Boolean)
  const skills = searchParams.getAll("skill").filter(Boolean)
  const availableFor = searchParams.getAll("available_for").filter(Boolean)
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
    totals: { profiles: number; channels: number; projects: number }
  } = {
    profiles: [], channels: [], projects: [], total: 0,
    totals: { profiles: 0, channels: 0, projects: 0 },
  }

  try {
    // ── Profiles ───────────────────────────────────────────
    if (type === "all" || type === "profiles") {
      const LEGACY_COLUMNS =
        "id, firebase_uid, username, display_name, bio, avatar_url, roles, skills, skill_level, availability, available_for, location_city, location_country, is_verified, follower_count, showcase_count, reputation_score"

      /**
       * `withV043` selects the columns migration 043 adds (style_tags,
       * visibility) and filters on them. Until that migration has been run
       * those columns don't exist, so we retry once without them rather than
       * 500 the Discover page — same DB-first / graceful-fallback rule the
       * rest of the project follows for un-run migrations.
       */
      function buildProfileQuery(withV043: boolean) {
        let pq = supabase
          .from("community_profiles")
          .select(withV043 ? `${LEGACY_COLUMNS}, style_tags, visibility` : LEGACY_COLUMNS, {
            count: "exact",
          })

        // Never surface profiles their owner has chosen to unlist.
        if (withV043) pq = pq.eq("visibility", "public")

        if (q) pq = pq.or(`display_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`)
        if (availability) pq = pq.eq("availability", availability)
        if (skill_level) pq = pq.eq("skill_level", skill_level)
        if (location) {
          pq = pq.or(`location_city.ilike.%${location}%,location_country.ilike.%${location}%`)
        }
        // `overlaps` = array && array — matches a profile carrying ANY of the
        // selected tags, which is what a multi-select filter chip UI implies.
        if (roles.length) pq = pq.overlaps("roles", roles)
        if (withV043 && styles.length) pq = pq.overlaps("style_tags", styles)
        if (skills.length) pq = pq.overlaps("skills", skills)
        if (availableFor.length) pq = pq.overlaps("available_for", availableFor)

        return pq
          .order("follower_count", { ascending: false })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)
      }

      let { data: profiles, count: profileCount, error: profileError } =
        await buildProfileQuery(true)

      // 42703 = undefined_column, PGRST204 = column not in schema cache
      if (profileError && (profileError.code === "42703" || profileError.code === "PGRST204")) {
        console.warn("[search GET] migration 043 not applied — falling back to legacy columns")
        ;({ data: profiles, count: profileCount, error: profileError } =
          await buildProfileQuery(false))
      }

      if (profileError) {
        console.error("[search GET] profiles", profileError)
        return NextResponse.json({ error: "Failed to search creators." }, { status: 500 })
      }
      results.profiles = profiles ?? []
      results.totals.profiles = profileCount ?? 0
      results.total += profileCount ?? 0
    }

    // ── Channels ───────────────────────────────────────────
    if (type === "all" || type === "channels") {
      let channelQuery = supabase
        .from("community_channels")
        .select("id, slug, name, description, category, visibility, member_count, post_count, is_featured, tags", {
          count: "exact",
        })
        .eq("visibility", "public") // only surface public channels in search

      if (q) channelQuery = channelQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
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
      results.totals.channels = channelCount ?? 0
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
        .eq("status", projectStatus)

      if (q) projectQuery = projectQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
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
      results.totals.projects = projectCount ?? 0
      results.total += projectCount ?? 0
    }

    return NextResponse.json({
      profiles: results.profiles,
      channels: results.channels,
      projects: results.projects,
      total: results.total,
      totals: results.totals,
      page,
      limit,
      query: q,
    })
  } catch (err) {
    console.error("[search GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

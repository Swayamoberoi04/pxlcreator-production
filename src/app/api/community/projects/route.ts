/**
 * GET   /api/community/projects  — list project listings
 * POST  /api/community/projects  — create a project listing
 *
 * GET query params:
 *   ?category= ?work_type= ?status=open (default) ?search=
 *   ?tags=      repeatable, role/style tag ids — matches ANY (real overlap, no fabricated relevance)
 *   ?skills=    repeatable, free-text skills_needed — matches ANY
 *   ?sort=      newest (default) | relevant — relevant only differs when signed in with
 *               profile tags to compare against; otherwise falls back to newest
 *   ?page=1 ?limit=20
 *
 * Only visibility='public' listings are ever returned here — a private
 * project is reachable only via its direct link (GET /api/community/projects/[id]).
 *
 * POST body: { title, description, category, work_type, location_city?, location_country?,
 *              budget_min_usd?, budget_max_usd?, budget_type, deadline?, skills_needed[],
 *              tags[]?, visibility? }
 *
 * Auth: GET optional (has_applied requires auth); POST requires auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const createLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

/** Attach poster profile + has_applied, shared by both the newest and relevant paths. */
async function enrichAndRespond(
  supabase: SupabaseClient,
  projects: Record<string, unknown>[],
  total: number,
  page: number,
  limit: number,
  uid: string | null
): Promise<NextResponse> {
  if (projects.length === 0) {
    return NextResponse.json({ projects: [], total, page, limit })
  }

  const posterUids = [...new Set(projects.map((p) => p.poster_uid as string))]
  const { data: posterProfiles } = await supabase
    .from("community_profiles")
    .select("firebase_uid, username, display_name, avatar_url, is_verified")
    .in("firebase_uid", posterUids)
  const profileMap = new Map((posterProfiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p]))

  let appliedSet = new Set<string>()
  if (uid) {
    const projectIds = projects.map((p) => p.id as string)
    const { data: applications } = await supabase
      .from("project_applications")
      .select("project_id")
      .eq("applicant_uid", uid)
      .in("project_id", projectIds)
    appliedSet = new Set((applications ?? []).map((a: { project_id: string }) => a.project_id))
  }

  const enriched = projects.map((project) => ({
    ...project,
    poster: profileMap.get(project.poster_uid as string) ?? null,
    has_applied: appliedSet.has(project.id as string),
    is_owner: uid === project.poster_uid,
  }))

  return NextResponse.json({ projects: enriched, total, page, limit })
}

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req) // optional

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const work_type = searchParams.get("work_type")
  const status = searchParams.get("status") ?? "open"
  const search = searchParams.get("search")
  const tags = searchParams.getAll("tags").filter(Boolean)
  const skills = searchParams.getAll("skills").filter(Boolean)
  const sort = searchParams.get("sort") === "relevant" ? "relevant" : "newest"
  const mine = searchParams.get("mine") === "true"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("project_listings")
      .select("*", { count: "exact" })

    if (mine && uid) {
      // ?mine=true: the caller's own projects regardless of visibility —
      // e.g. so they can credit a private/completed project on a showcase.
      // Never returns another user's private listings.
      query = query.eq("poster_uid", uid)
    } else {
      // Discovery only ever surfaces public listings — a private one is
      // reachable solely via its direct link.
      query = query.eq("visibility", "public")
    }

    if (status) query = query.eq("status", status)
    if (category) query = query.eq("category", category)
    if (work_type) query = query.eq("work_type", work_type)
    if (tags.length) query = query.overlaps("tags", tags)
    if (skills.length) query = query.overlaps("skills_needed", skills)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // "Relevant" re-ranks by real tag overlap with the viewer's own profile
    // when one exists; with no comparable tags it is identical to newest —
    // never a fabricated relevance score.
    let viewerTags: string[] = []
    if (sort === "relevant" && uid) {
      const { data: viewerProfile } = await supabase
        .from("community_profiles")
        .select("roles, style_tags")
        .eq("firebase_uid", uid)
        .maybeSingle()
      viewerTags = [...(viewerProfile?.roles ?? []), ...(viewerProfile?.style_tags ?? [])]
    }

    if (sort === "relevant" && viewerTags.length > 0) {
      // Over-fetch a bounded recent window, re-rank in memory by real overlap
      // count, then paginate the ranked list — same honest, bounded approach
      // used by the feed ranking in Phase 5.3.
      query = query.order("created_at", { ascending: false }).limit(200)
      const { data: candidates, error, count } = await query
      if (error) {
        console.error("[projects GET] relevant", error)
        return NextResponse.json({ error: "Failed to fetch projects." }, { status: 500 })
      }
      const tagSet = new Set(viewerTags)
      const ranked = (candidates ?? [])
        .map((p) => ({ p, overlap: (p.tags ?? []).filter((t: string) => tagSet.has(t)).length }))
        .sort((a, b) => b.overlap - a.overlap || new Date(b.p.created_at).getTime() - new Date(a.p.created_at).getTime())
        .map((r) => r.p)
      return await enrichAndRespond(supabase, ranked.slice(offset, offset + limit), count ?? ranked.length, page, limit, uid)
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: projects, error, count } = await query

    if (error) {
      console.error("[projects GET]", error)
      return NextResponse.json({ error: "Failed to fetch projects." }, { status: 500 })
    }

    return await enrichAndRespond(supabase, projects ?? [], count ?? 0, page, limit, uid)
  } catch (err) {
    console.error("[projects GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (createLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("title")
    .required("description")
    .required("category")
    .required("work_type")
    .required("budget_type")
    .maxLen("title", 100)
    .maxLen("description", 2000)

  if (body.deadline) v.futureDate("deadline")
  if (body.visibility !== undefined) v.oneOf("visibility", ["public", "private"])
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const {
    title,
    description,
    category,
    work_type,
    location_city,
    location_country,
    budget_min_usd,
    budget_max_usd,
    budget_type,
    deadline,
    skills_needed,
    tags,
    visibility,
  } = body as {
    title: string
    description: string
    category: string
    work_type: string
    location_city?: string
    location_country?: string
    budget_min_usd?: number
    budget_max_usd?: number
    budget_type: string
    deadline?: string
    skills_needed?: string[]
    tags?: string[]
    visibility?: string
  }

  try {
    const supabase = createAdminClient()
    await ensureProfile(uid)

    const { data: project, error: insertError } = await supabase
      .from("project_listings")
      .insert({
        poster_uid: uid,
        title,
        description,
        category,
        work_type,
        location_city: location_city ?? null,
        location_country: location_country ?? null,
        budget_min_usd: budget_min_usd ?? null,
        budget_max_usd: budget_max_usd ?? null,
        budget_type,
        deadline: deadline ?? null,
        skills_needed: Array.isArray(skills_needed) ? skills_needed : [],
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
        visibility: visibility === "private" ? "private" : "public",
        status: "open",
        applicant_count: 0,
      })
      .select("*")
      .single()

    if (insertError) {
      console.error("[projects POST] insert", insertError)
      return NextResponse.json({ error: "Failed to create project." }, { status: 500 })
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (err) {
    console.error("[projects POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

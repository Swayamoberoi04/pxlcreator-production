/**
 * GET   /api/community/projects  — list project listings
 * POST  /api/community/projects  — create a project listing
 *
 * GET query params: ?category=, ?work_type=, ?status=open (default), ?search=, ?page=1, ?limit=20
 * POST body: { title, description, category, work_type, location_city?, location_country?,
 *              budget_min_usd?, budget_max_usd?, budget_type, deadline?, skills_needed[] }
 *
 * Auth: GET optional (has_applied requires auth); POST requires auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const createLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req) // optional

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const work_type = searchParams.get("work_type")
  const status = searchParams.get("status") ?? "open"
  const search = searchParams.get("search")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("project_listings")
      .select("*", { count: "exact" })

    if (status) query = query.eq("status", status)
    if (category) query = query.eq("category", category)
    if (work_type) query = query.eq("work_type", work_type)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: projects, error, count } = await query

    if (error) {
      console.error("[projects GET]", error)
      return NextResponse.json({ error: "Failed to fetch projects." }, { status: 500 })
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ projects: [], total: 0, page, limit })
    }

    // Fetch poster profiles
    const posterUids = [...new Set(projects.map((p: { poster_uid: string }) => p.poster_uid))]
    const { data: posterProfiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .in("firebase_uid", posterUids)

    const profileMap = new Map(
      (posterProfiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p])
    )

    // Check has_applied for authenticated user
    let appliedSet = new Set<string>()
    if (uid) {
      const projectIds = projects.map((p: { id: string }) => p.id)
      const { data: applications } = await supabase
        .from("project_applications")
        .select("project_id")
        .eq("applicant_uid", uid)
        .in("project_id", projectIds)
      appliedSet = new Set((applications ?? []).map((a: { project_id: string }) => a.project_id))
    }

    const enriched = projects.map((project: Record<string, unknown>) => ({
      ...project,
      poster: profileMap.get(project.poster_uid as string) ?? null,
      has_applied: appliedSet.has(project.id as string),
    }))

    return NextResponse.json({ projects: enriched, total: count ?? 0, page, limit })
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

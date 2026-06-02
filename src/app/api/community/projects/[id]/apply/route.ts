/**
 * POST  /api/community/projects/[id]/apply
 *
 * Apply to a project listing.
 * Body: { cover_letter (max 1000 chars), portfolio_link? }
 *
 * - Cannot apply to own project.
 * - Cannot apply twice (unique constraint project_id + applicant_uid).
 * - Increments project_listings.applicant_count.
 * - Sends notification to poster (type: "project_application").
 *
 * Returns: { application: ProjectApplication }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("cover_letter").maxLen("cover_letter", 1000)
  if (body.portfolio_link) v.url("portfolio_link")
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const { cover_letter, portfolio_link } = body as {
    cover_letter: string
    portfolio_link?: string
  }

  try {
    const supabase = createAdminClient()

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("project_listings")
      .select("id, poster_uid, title, status, applicant_count")
      .eq("id", projectId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }

    // Cannot apply to own project
    if (project.poster_uid === uid) {
      return NextResponse.json({ error: "You cannot apply to your own project." }, { status: 400 })
    }

    // Project must be open
    if (project.status !== "open") {
      return NextResponse.json({ error: "This project is no longer accepting applications." }, { status: 400 })
    }

    // Check duplicate application
    const { data: existing } = await supabase
      .from("project_applications")
      .select("id")
      .eq("project_id", projectId)
      .eq("applicant_uid", uid)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "You have already applied to this project." }, { status: 409 })
    }

    await ensureProfile(uid)

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from("project_applications")
      .insert({
        project_id: projectId,
        applicant_uid: uid,
        cover_letter,
        portfolio_link: portfolio_link ?? null,
        status: "pending",
      })
      .select("*")
      .single()

    if (insertError) {
      console.error("[projects/apply POST] insert", insertError)
      return NextResponse.json({ error: "Failed to submit application." }, { status: 500 })
    }

    // Increment applicant_count
    await supabase
      .from("project_listings")
      .update({ applicant_count: (project.applicant_count ?? 0) + 1 })
      .eq("id", projectId)

    // Notify poster
    const { data: actorProfile } = await supabase
      .from("community_profiles")
      .select("display_name, username")
      .eq("firebase_uid", uid)
      .maybeSingle()

    const actorName = actorProfile?.display_name ?? actorProfile?.username ?? "Someone"

    await supabase.from("community_notifications").insert({
      recipient_uid: project.poster_uid,
      actor_uid: uid,
      type: "project_application",
      title: `${actorName} applied to your project`,
      body: `${actorName} submitted an application for "${project.title}".`,
      resource_type: "project",
      resource_id: projectId,
      is_read: false,
    })

    return NextResponse.json({ application }, { status: 201 })
  } catch (err) {
    console.error("[projects/apply POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

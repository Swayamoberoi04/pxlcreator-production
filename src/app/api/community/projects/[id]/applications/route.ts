/**
 * GET /api/community/projects/[id]/applications
 *
 * Owner-only: lists every application to this project, enriched with the
 * applicant's profile. Not exposed to anyone else — an applicant already
 * knows their own status via has_applied on the project itself, but never
 * sees other applicants' cover letters or the poster's private review note.
 *
 * Requires: Authorization: Bearer <firebase_id_token>, must be the project owner.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const { data: project, error: projectError } = await supabase
      .from("project_listings")
      .select("id, poster_uid")
      .eq("id", projectId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (project.poster_uid !== uid) {
      return NextResponse.json({ error: "Only the project owner can view applications." }, { status: 403 })
    }

    const { data: applications, error } = await supabase
      .from("project_applications")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[projects/[id]/applications GET]", error)
      return NextResponse.json({ error: "Failed to fetch applications." }, { status: 500 })
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({ applications: [] })
    }

    const applicantUids = [...new Set(applications.map((a) => a.applicant_uid))]
    const { data: profiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified, roles, skill_level")
      .in("firebase_uid", applicantUids)
    const profileMap = new Map((profiles ?? []).map((p) => [p.firebase_uid, p]))

    const enriched = applications.map((a) => ({ ...a, applicant: profileMap.get(a.applicant_uid) ?? null }))
    return NextResponse.json({ applications: enriched })
  } catch (err) {
    console.error("[projects/[id]/applications GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

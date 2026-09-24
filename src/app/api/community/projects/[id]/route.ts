/**
 * GET   /api/community/projects/[id] — single project detail
 * PATCH /api/community/projects/[id] — owner edits their project
 *
 * GET: a 'public' project is visible to anyone; a 'private' one only to its
 * owner (404 to everyone else — not 403, so a private project's existence
 * isn't confirmed by the response code).
 *
 * PATCH: ownership enforced against the verified Firebase UID (this project
 * authenticates with Firebase, not Supabase Auth — see migration 046's RLS
 * comment for why that means ownership is checked here, not via RLS auth.uid()).
 * Setting status to 'closed' or 'completed' stamps closed_at for real.
 *
 * Auth: GET optional; PATCH requires auth + ownership.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Validator } from "@/lib/api/validate"
import { guardMutation } from "@/lib/community/guard"

export const runtime = "nodejs"

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)

  try {
    const supabase = createAdminClient()
    const { data: project, error } = await supabase
      .from("project_listings")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (project.visibility === "private" && project.poster_uid !== uid) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }

    const { data: poster } = await supabase
      .from("community_profiles")
      .select("username, display_name, avatar_url, is_verified")
      .eq("firebase_uid", project.poster_uid)
      .maybeSingle()

    let has_applied = false
    if (uid) {
      const { data: application } = await supabase
        .from("project_applications")
        .select("id")
        .eq("project_id", id)
        .eq("applicant_uid", uid)
        .maybeSingle()
      has_applied = !!application
    }

    return NextResponse.json({
      project: { ...project, poster: poster ?? null, has_applied, is_owner: uid === project.poster_uid },
    })
  } catch (err) {
    console.error("[projects/[id] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "project-edit")
  if (limited) return limited

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  if (body.title !== undefined) v.maxLen("title", 100)
  if (body.description !== undefined) v.maxLen("description", 2000)
  if (body.status !== undefined) {
    v.oneOf("status", ["open", "in_progress", "closed", "completed"])
  }
  if (body.visibility !== undefined) v.oneOf("visibility", ["public", "private"])
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: existing, error: fetchError } = await supabase
      .from("project_listings")
      .select("id, poster_uid")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (existing.poster_uid !== uid) {
      return NextResponse.json({ error: "You can only edit your own projects." }, { status: 403 })
    }

    const allowed = [
      "title", "description", "category", "work_type", "location_city", "location_country",
      "budget_min_usd", "budget_max_usd", "budget_type", "deadline", "skills_needed",
      "tags", "visibility", "status",
    ] as const

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field]
    }
    if (body.status === "closed" || body.status === "completed") {
      updates.closed_at = new Date().toISOString()
    } else if (body.status === "open" || body.status === "in_progress") {
      updates.closed_at = null
    }

    const { data: updated, error: updateError } = await supabase
      .from("project_listings")
      .update(updates as never)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[projects/[id] PATCH]", updateError)
      return NextResponse.json({ error: "Failed to update project." }, { status: 500 })
    }

    return NextResponse.json({ project: updated })
  } catch (err) {
    console.error("[projects/[id] PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

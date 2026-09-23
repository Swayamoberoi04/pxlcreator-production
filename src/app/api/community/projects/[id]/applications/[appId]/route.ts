/**
 * PATCH /api/community/projects/[id]/applications/[appId]
 *
 * Owner-only: review an application. Body: { status, reviewer_note? }
 * status must be one of: shortlisted | accepted | rejected | closed
 * ("pending" is the only starting state and "withdrawn" is applicant-only —
 * see the applicant-facing withdraw action, not implemented here to keep
 * this route strictly an owner action).
 *
 * Sends a real notification to the applicant on every status change.
 * reviewer_note is private — never returned to or visible by the applicant.
 *
 * Requires: Authorization: Bearer <firebase_id_token>, must be the project owner.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Validator } from "@/lib/api/validate"
import { guardMutation } from "@/lib/community/guard"

export const runtime = "nodejs"

const OWNER_SETTABLE_STATUSES = ["shortlisted", "accepted", "rejected", "closed"] as const

type Params = { params: Promise<{ id: string; appId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: projectId, appId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "application-review")
  if (limited) return limited

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("status").oneOf("status", [...OWNER_SETTABLE_STATUSES])
  if (body.reviewer_note !== undefined) v.maxLen("reviewer_note", 1000)
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const { status, reviewer_note } = body as { status: typeof OWNER_SETTABLE_STATUSES[number]; reviewer_note?: string }

  try {
    const supabase = createAdminClient()

    const { data: project, error: projectError } = await supabase
      .from("project_listings")
      .select("id, poster_uid, title")
      .eq("id", projectId)
      .maybeSingle()
    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (project.poster_uid !== uid) {
      return NextResponse.json({ error: "Only the project owner can review applications." }, { status: 403 })
    }

    const { data: application, error: appError } = await supabase
      .from("project_applications")
      .select("id, project_id, applicant_uid, status")
      .eq("id", appId)
      .eq("project_id", projectId)
      .maybeSingle()
    if (appError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 })
    }
    if (application.status === "withdrawn") {
      return NextResponse.json({ error: "This application was withdrawn by the applicant." }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from("project_applications")
      .update({
        status,
        reviewer_note: reviewer_note !== undefined ? reviewer_note : undefined,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", appId)
      .select("*")
      .single()

    if (updateError) {
      console.error("[applications/[appId] PATCH]", updateError)
      return NextResponse.json({ error: "Failed to update application." }, { status: 500 })
    }

    // Real notification, same pattern used for follows/comments/applications elsewhere.
    const STATUS_LABEL: Record<string, string> = {
      shortlisted: "shortlisted you for",
      accepted: "accepted your application for",
      rejected: "declined your application for",
      closed: "closed applications for",
    }
    await supabase.from("community_notifications").insert({
      recipient_uid: application.applicant_uid,
      actor_uid: uid,
      type: "application_accepted", // existing NotificationType — reused for all status changes, title carries the specific verb
      title: `Your application was ${STATUS_LABEL[status] ? STATUS_LABEL[status].split(" ")[0] : status}`,
      body: `Your application for "${project.title}" was ${status}.`,
      resource_type: "project",
      resource_id: projectId,
      is_read: false,
    })

    return NextResponse.json({ application: updated })
  } catch (err) {
    console.error("[applications/[appId] PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

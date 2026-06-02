/**
 * PATCH /api/community/teams/[id]/invite/[inviteId]
 *
 * Respond to a team invite.
 * Auth required — invitee only.
 * Body: { action: "accept" | "decline" }
 *   On accept: insert team_member row, increment team.member_count, delete invite.
 *   On decline: update invite status to "declined".
 * Returns: { team_member? }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

type Params = { params: Promise<{ id: string; inviteId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: teamId, inviteId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { action } = body as { action?: string }

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch invite
    const { data: invite, error: inviteError } = await supabase
      .from("community_team_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("team_id", teamId)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 })
    }

    // Only the invitee can respond
    if (invite.invitee_uid !== uid) {
      return NextResponse.json({ error: "You are not the invite recipient." }, { status: 403 })
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite is no longer pending." }, { status: 400 })
    }

    // Check if invite is expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supabase
        .from("community_team_invites")
        .update({ status: "expired" } as never)
        .eq("id", inviteId)
      return NextResponse.json({ error: "This invite has expired." }, { status: 410 })
    }

    if (action === "decline") {
      await supabase
        .from("community_team_invites")
        .update({ status: "declined" } as never)
        .eq("id", inviteId)

      return NextResponse.json({ team_member: null })
    }

    // Accept: add member
    const { data: teamRow } = await supabase
      .from("community_teams")
      .select("member_count")
      .eq("id", teamId)
      .maybeSingle()

    const { data: teamMember, error: memberError } = await supabase
      .from("community_team_members")
      .insert({
        team_id: teamId,
        firebase_uid: uid,
        role: invite.role ?? "member",
        custom_title: invite.custom_title ?? null,
      })
      .select("*")
      .single()

    if (memberError) {
      if (memberError.code === "23505") {
        return NextResponse.json({ error: "You are already a member of this team." }, { status: 409 })
      }
      console.error("[team invite PATCH] insert member", memberError)
      return NextResponse.json({ error: "Failed to join team." }, { status: 500 })
    }

    // Increment member_count
    await supabase
      .from("community_teams")
      .update({ member_count: ((teamRow?.member_count ?? 0) + 1) } as never)
      .eq("id", teamId)

    // Delete invite
    await supabase.from("community_team_invites").delete().eq("id", inviteId)

    return NextResponse.json({ team_member: teamMember })
  } catch (err) {
    console.error("[team invite PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

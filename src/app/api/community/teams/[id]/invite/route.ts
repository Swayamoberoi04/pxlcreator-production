/**
 * POST /api/community/teams/[id]/invite
 *
 * Invite a user to a team.
 * Auth required. Owner/admin only.
 * Body: { invitee_uid, role, custom_title?, message? }
 * Cannot invite an existing member.
 * Creates a community_team_invites row.
 * Sends notification to invitee (type: "channel_invite").
 * Returns: { invite }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

const inviteLimiter = makeRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: teamId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (inviteLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { invitee_uid, role, custom_title, message } = body as {
    invitee_uid?: string
    role?: string
    custom_title?: string
    message?: string
  }

  if (!invitee_uid || typeof invitee_uid !== "string") {
    return NextResponse.json({ error: "invitee_uid is required." }, { status: 400 })
  }

  const validRoles = ["admin", "member"]
  const resolvedRole = validRoles.includes(role ?? "") ? role! : "member"

  try {
    const supabase = createAdminClient()

    // Check team exists
    const { data: team } = await supabase
      .from("community_teams")
      .select("id")
      .eq("id", teamId)
      .maybeSingle()

    if (!team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 })
    }

    // Check inviter is owner/admin
    const { data: inviterMember } = await supabase
      .from("community_team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (!inviterMember || !["owner", "admin"].includes(inviterMember.role)) {
      return NextResponse.json({ error: "Only team owners and admins can send invites." }, { status: 403 })
    }

    // Check invitee is not already a member
    const { data: existingMember } = await supabase
      .from("community_team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("firebase_uid", invitee_uid)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({ error: "User is already a team member." }, { status: 409 })
    }

    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: insertError } = await supabase
      .from("community_team_invites")
      .insert({
        team_id: teamId,
        inviter_uid: uid,
        invitee_uid,
        role: resolvedRole,
        custom_title: custom_title ?? null,
        message: message ?? null,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("*")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "A pending invite already exists for this user." }, { status: 409 })
      }
      console.error("[team invite POST] insert", insertError)
      return NextResponse.json({ error: "Failed to create invite." }, { status: 500 })
    }

    // Notify invitee
    await supabase
      .from("community_notifications")
      .insert({
        recipient_uid: invitee_uid,
        actor_uid:     uid,
        type:          "channel_invite",
        title:         "You have a team invite",
        body:          "You've been invited to join a creator team.",
      })
      .then(() => { /* sent */ }).then(undefined, () => null)

    return NextResponse.json({ invite }, { status: 201 })
  } catch (err) {
    console.error("[team invite POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

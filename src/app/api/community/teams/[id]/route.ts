/**
 * GET    /api/community/teams/[id]  — team detail + members + pending invites for viewer
 * PATCH  /api/community/teams/[id]  — update team (owner/admin only)
 * DELETE /api/community/teams/[id]  — delete team (owner only)
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: teamId } = await params
  const uid = await getFirebaseUidFromRequest(req) // optional

  try {
    const supabase = createAdminClient()

    const { data: team, error: teamError } = await supabase
      .from("community_teams")
      .select("*")
      .eq("id", teamId)
      .maybeSingle()

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 })
    }

    // Fetch members
    const { data: members } = await supabase
      .from("community_team_members")
      .select("*")
      .eq("team_id", teamId)
      .order("role", { ascending: true })

    // Enrich members with profiles
    const memberUids = (members ?? []).map((m: { firebase_uid: string }) => m.firebase_uid)
    let memberProfiles: Record<string, unknown>[] = []
    if (memberUids.length > 0) {
      const { data: profiles } = await supabase
        .from("community_profiles")
        .select("firebase_uid, username, display_name, avatar_url, is_verified")
        .in("firebase_uid", memberUids)
      memberProfiles = profiles ?? []
    }
    const profileMap = new Map(
      memberProfiles.map((p) => [p.firebase_uid as string, p])
    )
    const enrichedMembers = (members ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      profile: profileMap.get(m.firebase_uid as string) ?? null,
    }))

    // Pending invites for current viewer
    let pendingInvites: unknown[] = []
    if (uid) {
      const { data: invites } = await supabase
        .from("community_team_invites")
        .select("*")
        .eq("team_id", teamId)
        .eq("invitee_uid", uid)
        .eq("status", "pending")
      pendingInvites = invites ?? []
    }

    return NextResponse.json({
      team,
      members: enrichedMembers,
      pending_invites: pendingInvites,
    })
  } catch (err) {
    console.error("[teams/[id] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: teamId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Check membership and role
    const { data: memberRow } = await supabase
      .from("community_team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (!memberRow || !["owner", "admin"].includes(memberRow.role)) {
      return NextResponse.json({ error: "Only team owners and admins can update the team." }, { status: 403 })
    }

    const {
      name,
      description,
      category,
      visibility,
      tags,
      is_hiring,
      roles_needed,
      avatar_url,
      banner_url,
    } = body as Record<string, unknown>

    const updates: Record<string, unknown> = {}
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 60) {
        return NextResponse.json({ error: "name must be 1-60 characters." }, { status: 400 })
      }
      updates.name = (name as string).trim()
    }
    if (description !== undefined) updates.description = description
    if (category !== undefined) updates.category = category
    if (visibility !== undefined && ["public", "invite_only"].includes(visibility as string)) {
      updates.visibility = visibility
    }
    if (Array.isArray(tags)) updates.tags = tags
    if (typeof is_hiring === "boolean") updates.is_hiring = is_hiring
    if (Array.isArray(roles_needed)) updates.roles_needed = roles_needed
    if (avatar_url !== undefined) updates.avatar_url = avatar_url
    if (banner_url !== undefined) updates.banner_url = banner_url

    const { data: updated, error: updateError } = await supabase
      .from("community_teams")
      .update(updates as never)
      .eq("id", teamId)
      .select("*")
      .single()

    if (updateError) {
      console.error("[teams/[id] PATCH]", updateError)
      return NextResponse.json({ error: "Failed to update team." }, { status: 500 })
    }

    return NextResponse.json({ team: updated })
  } catch (err) {
    console.error("[teams/[id] PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── DELETE ──────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: teamId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const supabase = createAdminClient()

    // Only owner can delete
    const { data: team } = await supabase
      .from("community_teams")
      .select("owner_uid")
      .eq("id", teamId)
      .maybeSingle()

    if (!team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 })
    }
    if (team.owner_uid !== uid) {
      return NextResponse.json({ error: "Only the team owner can delete the team." }, { status: 403 })
    }

    // Delete related records first
    await supabase.from("community_team_members").delete().eq("team_id", teamId)
    await supabase.from("community_team_invites").delete().eq("team_id", teamId)

    const { error: deleteError } = await supabase
      .from("community_teams")
      .delete()
      .eq("id", teamId)

    if (deleteError) {
      console.error("[teams/[id] DELETE]", deleteError)
      return NextResponse.json({ error: "Failed to delete team." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[teams/[id] DELETE] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

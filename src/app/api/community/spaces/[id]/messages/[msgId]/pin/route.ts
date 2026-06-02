/**
 * POST /api/community/spaces/[id]/messages/[msgId]/pin
 *
 * Pin or unpin a message in a community space.
 * Auth required. Only space moderators (in moderator_uids) can pin/unpin.
 * Body: { pinned: boolean }
 * Returns: { is_pinned: boolean }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

type Params = { params: Promise<{ id: string; msgId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: spaceId, msgId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { pinned } = body as { pinned?: unknown }

  if (typeof pinned !== "boolean") {
    return NextResponse.json({ error: "pinned must be a boolean." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch space to check moderator access
    const { data: space, error: spaceError } = await supabase
      .from("community_spaces")
      .select("id, moderator_uids")
      .eq("id", spaceId)
      .maybeSingle()

    if (spaceError || !space) {
      return NextResponse.json({ error: "Space not found." }, { status: 404 })
    }

    const moderators: string[] = space.moderator_uids ?? []
    if (!moderators.includes(uid)) {
      return NextResponse.json({ error: "Only space moderators can pin messages." }, { status: 403 })
    }

    // Verify message belongs to space
    const { data: message, error: msgError } = await supabase
      .from("community_messages")
      .select("id, is_pinned")
      .eq("id", msgId)
      .eq("space_id", spaceId)
      .maybeSingle()

    if (msgError || !message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 })
    }

    // Update is_pinned
    const { error: updateError } = await supabase
      .from("community_messages")
      .update({ is_pinned: pinned } as never)
      .eq("id", msgId)

    if (updateError) {
      console.error("[pin POST] update", updateError)
      return NextResponse.json({ error: "Failed to update pin status." }, { status: 500 })
    }

    return NextResponse.json({ is_pinned: pinned })
  } catch (err) {
    console.error("[pin POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

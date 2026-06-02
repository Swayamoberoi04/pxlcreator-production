/**
 * PATCH /api/community/collab-requests/[id]
 *
 * Update the status of a collab request.
 * Auth required.
 *   - Recipient can: accept, decline
 *   - Requester can: withdraw
 * Body: { status: "accepted" | "declined" | "withdrawn" }
 * On accept: sends notification to requester.
 * Returns: { request }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { status } = body as { status?: string }

  const validStatuses = ["accepted", "declined", "withdrawn"]
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "status must be one of: accepted, declined, withdrawn." },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    // Fetch the request
    const { data: collab, error: fetchError } = await supabase
      .from("collaboration_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !collab) {
      return NextResponse.json({ error: "Collab request not found." }, { status: 404 })
    }

    if (collab.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending requests can be updated." },
        { status: 400 }
      )
    }

    // Permission check
    const isRecipient = collab.recipient_uid === uid
    const isRequester = collab.requester_uid === uid

    if (status === "withdrawn" && !isRequester) {
      return NextResponse.json({ error: "Only the requester can withdraw." }, { status: 403 })
    }
    if ((status === "accepted" || status === "declined") && !isRecipient) {
      return NextResponse.json({ error: "Only the recipient can accept or decline." }, { status: 403 })
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
      .from("collaboration_requests")
      .update({ status } as never)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[collab-requests PATCH] update", updateError)
      return NextResponse.json({ error: "Failed to update request." }, { status: 500 })
    }

    // On accept: notify requester
    if (status === "accepted") {
      await supabase
        .from("community_notifications")
        .insert({
          recipient_uid: collab.requester_uid,
          actor_uid:     uid,
          type:          "connection_acc",
          title:         "Collaboration request accepted",
          body:          "Your collaboration request was accepted.",
        })
        .then(() => { /* notif sent */ }).then(undefined, () => null)
    }

    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error("[collab-requests PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

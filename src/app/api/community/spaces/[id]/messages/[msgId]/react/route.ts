/**
 * POST /api/community/spaces/[id]/messages/[msgId]/react
 *
 * Toggle an emoji reaction on a message.
 * Auth required. Body: { emoji?: string } (defaults to "👍").
 * If the reaction already exists → delete it (unreact).
 * If it does not exist → insert it (react).
 * Updates message.reaction_count.
 * Returns: { active: boolean, reaction_count: number }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

const reactLimiter = makeRateLimiter({ max: 60, windowMs: 60 * 1000 })

type Params = { params: Promise<{ id: string; msgId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: spaceId, msgId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (reactLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // emoji defaults to 👍 — empty body is fine
  }

  const emoji = (typeof body.emoji === "string" && body.emoji.trim()) ? body.emoji.trim() : "👍"

  try {
    const supabase = createAdminClient()

    // Verify message belongs to space
    const { data: message, error: msgError } = await supabase
      .from("community_messages")
      .select("id, reaction_count, space_id")
      .eq("id", msgId)
      .eq("space_id", spaceId)
      .maybeSingle()

    if (msgError || !message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 })
    }

    // Check existing reaction
    const { data: existing } = await supabase
      .from("community_message_reactions")
      .select("id")
      .eq("message_id", msgId)
      .eq("firebase_uid", uid)
      .eq("emoji", emoji)
      .maybeSingle()

    let active: boolean
    let newCount: number

    if (existing) {
      // Remove reaction
      await supabase
        .from("community_message_reactions")
        .delete()
        .eq("id", existing.id)

      newCount = Math.max(0, (message.reaction_count ?? 0) - 1)
      active = false
    } else {
      // Add reaction
      const { error: insertError } = await supabase
        .from("community_message_reactions")
        .insert({ message_id: msgId, firebase_uid: uid, emoji })

      if (insertError) {
        console.error("[react POST] insert", insertError)
        return NextResponse.json({ error: "Failed to add reaction." }, { status: 500 })
      }

      newCount = (message.reaction_count ?? 0) + 1
      active = true
    }

    // Update reaction_count on message
    await supabase
      .from("community_messages")
      .update({ reaction_count: newCount } as never)
      .eq("id", msgId)

    return NextResponse.json({ active, reaction_count: newCount })
  } catch (err) {
    console.error("[react POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

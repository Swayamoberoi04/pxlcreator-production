/**
 * POST /api/community/showcase/[id]/enquire
 *
 * The clear, legitimate professional-contact CTA for a showcase item: a real,
 * persisted enquiry, not a fake "reach out" counter. enquiry_count is synced
 * by trg_sync_showcase_enquiry_count (migration 046).
 *
 * Body: { message (max 1000 chars), contact_email? }
 * Cannot enquire about your own showcase item.
 * Sends a real notification to the showcase owner.
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

const limiter = makeRateLimiter({ max: 15, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: showcaseId } = await params
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
  v.required("message").maxLen("message", 1000)
  if (body.contact_email) v.email("contact_email")
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }
  const { message, contact_email } = body as { message: string; contact_email?: string }

  try {
    const supabase = createAdminClient()
    const { data: item, error: itemError } = await supabase
      .from("showcase_items")
      .select("id, author_uid, title, is_removed")
      .eq("id", showcaseId)
      .maybeSingle()
    if (itemError || !item || item.is_removed) {
      return NextResponse.json({ error: "Showcase item not found." }, { status: 404 })
    }
    if (item.author_uid === uid) {
      return NextResponse.json({ error: "You cannot enquire about your own work." }, { status: 400 })
    }

    await ensureProfile(uid)

    const { data: enquiry, error: insertError } = await supabase
      .from("showcase_enquiries")
      .insert({ showcase_id: showcaseId, enquirer_uid: uid, message, contact_email: contact_email ?? null })
      .select("*")
      .single()

    if (insertError) {
      console.error("[showcase/[id]/enquire POST] insert", insertError)
      return NextResponse.json({ error: "Failed to send enquiry." }, { status: 500 })
    }

    const { data: actorProfile } = await supabase
      .from("community_profiles")
      .select("display_name, username")
      .eq("firebase_uid", uid)
      .maybeSingle()
    const actorName = actorProfile?.display_name ?? actorProfile?.username ?? "Someone"

    await supabase.from("community_notifications").insert({
      recipient_uid: item.author_uid,
      actor_uid: uid,
      type: "post_reply", // no dedicated enquiry NotificationType yet; reused deliberately rather than inventing an untyped one
      title: `${actorName} sent you an enquiry about "${item.title}"`,
      body: message.slice(0, 150),
      resource_type: "showcase",
      resource_id: showcaseId,
      is_read: false,
    })

    return NextResponse.json({ enquiry }, { status: 201 })
  } catch (err) {
    console.error("[showcase/[id]/enquire POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

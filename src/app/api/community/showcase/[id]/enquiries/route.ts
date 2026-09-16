/**
 * GET /api/community/showcase/[id]/enquiries
 *
 * Owner-only: lists real enquiries received about this showcase item, with
 * the enquirer's profile attached. Never exposed to anyone else — enquiries
 * may carry a contact email the sender chose to share only with the owner.
 *
 * Requires: Authorization: Bearer <firebase_id_token>, must be the item owner.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id: showcaseId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const { data: item, error: itemError } = await supabase
      .from("showcase_items")
      .select("id, author_uid")
      .eq("id", showcaseId)
      .maybeSingle()
    if (itemError || !item) {
      return NextResponse.json({ error: "Showcase item not found." }, { status: 404 })
    }
    if (item.author_uid !== uid) {
      return NextResponse.json({ error: "Only the owner can view enquiries." }, { status: 403 })
    }

    const { data: enquiries, error } = await supabase
      .from("showcase_enquiries")
      .select("*")
      .eq("showcase_id", showcaseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[showcase/[id]/enquiries GET]", error)
      return NextResponse.json({ error: "Failed to fetch enquiries." }, { status: 500 })
    }
    if (!enquiries || enquiries.length === 0) {
      return NextResponse.json({ enquiries: [] })
    }

    const enquirerUids = [...new Set(enquiries.map((e) => e.enquirer_uid))]
    const { data: profiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url")
      .in("firebase_uid", enquirerUids)
    const profileMap = new Map((profiles ?? []).map((p) => [p.firebase_uid, p]))

    const enriched = enquiries.map((e) => ({ ...e, enquirer: profileMap.get(e.enquirer_uid) ?? null }))
    return NextResponse.json({ enquiries: enriched })
  } catch (err) {
    console.error("[showcase/[id]/enquiries GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

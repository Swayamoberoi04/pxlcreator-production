/**
 * POST /api/community/showcase/[id]/react
 *
 * Toggle a reaction (like | bookmark) on a showcase item.
 * Returns updated counts and user's current reaction state.
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"

export const runtime = "nodejs"

export async function POST(
  req:     NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { id: showcaseId } = await params
  let reaction = "like"
  try {
    const body = await req.json() as { reaction?: string }
    if (body.reaction === "bookmark") reaction = "bookmark"
  } catch { /* default to like */ }

  const supabase = createAdminClient()

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("showcase_reactions")
    .select("id")
    .eq("showcase_id", showcaseId)
    .eq("firebase_uid", uid)
    .eq("reaction", reaction)
    .maybeSingle()

  const field = reaction === "bookmark" ? "bookmark_count" : "like_count"
  const { data: item } = await supabase
    .from("showcase_items")
    .select(field)
    .eq("id", showcaseId)
    .single()

  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const currentCount = (item as Record<string, number>)[field] ?? 0

  const newCountDecrement = Math.max(0, currentCount - 1)
  const newCountIncrement = currentCount + 1

  if (existing) {
    await supabase.from("showcase_reactions").delete().eq("id", existing.id)
    if (reaction === "bookmark") {
      await supabase.from("showcase_items").update({ bookmark_count: newCountDecrement }).eq("id", showcaseId)
    } else {
      await supabase.from("showcase_items").update({ like_count: newCountDecrement }).eq("id", showcaseId)
    }
    return NextResponse.json({ active: false, [field]: newCountDecrement })
  } else {
    await supabase.from("showcase_reactions").insert({ showcase_id: showcaseId, firebase_uid: uid, reaction })
    if (reaction === "bookmark") {
      await supabase.from("showcase_items").update({ bookmark_count: newCountIncrement }).eq("id", showcaseId)
    } else {
      await supabase.from("showcase_items").update({ like_count: newCountIncrement }).eq("id", showcaseId)
    }
    return NextResponse.json({ active: true, [field]: newCountIncrement })
  }
}

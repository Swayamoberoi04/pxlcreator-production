/**
 * GET /api/presets/[slug]/access
 *
 * Returns whether the current user has access to download a preset.
 * Access is granted if the user has a completed payment OR a password unlock.
 *
 * Response: { access: boolean, method: "payment" | "password" | null }
 *
 * Requires Firebase Bearer token.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }         from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ access: false, method: null })
  }

  const { slug } = await params
  const supabase  = createAdminClient()

  /* ── Fetch preset id ── */
  const { data: preset } = await supabase
    .from("presets")
    .select("id, is_free")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (!preset) {
    return NextResponse.json({ access: false, method: null })
  }

  /* Free presets are always accessible to signed-in users */
  if (preset.is_free) {
    return NextResponse.json({ access: true, method: "free" })
  }

  /* ── Check user_unlocks (password or payment recorded by our API) ── */
  const { data: unlock } = await supabase
    .from("user_unlocks")
    .select("unlock_method")
    .eq("firebase_uid", uid)
    .eq("preset_id", preset.id)
    .maybeSingle()

  if (unlock) {
    return NextResponse.json({ access: true, method: unlock.unlock_method })
  }

  /* ── Check paid orders ── */
  const { data: orderItem } = await supabase
    .from("order_items")
    .select("id, order:orders!inner(firebase_uid, status)")
    .eq("preset_id", preset.id)
    .eq("order.firebase_uid", uid)
    .eq("order.status", "paid")
    .maybeSingle()

  if (orderItem) {
    /* Record it in user_unlocks so future checks are fast */
    await supabase
      .from("user_unlocks")
      .upsert(
        { firebase_uid: uid, preset_id: preset.id, unlock_method: "payment" },
        { onConflict: "firebase_uid,preset_id", ignoreDuplicates: true }
      )
    return NextResponse.json({ access: true, method: "payment" })
  }

  return NextResponse.json({ access: false, method: null })
}

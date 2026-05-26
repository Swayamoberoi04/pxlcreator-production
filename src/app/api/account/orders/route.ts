/**
 * GET /api/account/orders
 *
 * Returns all paid orders for the authenticated Firebase user.
 * Used by the account library page and the checkout success page.
 *
 * Requires:  Authorization: Bearer <firebase_id_token>
 * The token is verified server-side with the Firebase Admin SDK.
 */

import { NextRequest, NextResponse }        from "next/server"
import { createAdminClient }                from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }        from "@/lib/account/auth"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const firebaseUid = await getFirebaseUidFromRequest(req)

    if (!firebaseUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    /* Fetch paid orders with items and download tokens */
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_inr,
        subtotal_usd,
        created_at,
        paid_at,
        order_items (
          id,
          preset_id,
          preset_slug,
          preset_title,
          price_usd,
          price_inr,
          quantity,
          download_tokens (
            token,
            expires_at,
            download_count,
            max_downloads
          )
        )
      `)
      .eq("firebase_uid", firebaseUid)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    return NextResponse.json({ orders: orders ?? [] })
  } catch (e) {
    console.error("[account/orders]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

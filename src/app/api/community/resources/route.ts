/**
 * GET /api/community/resources
 *
 * List creator resources.
 * Public endpoint — no auth required.
 *
 * Query params:
 *   ?category=    filter by category
 *   ?featured=true  return only featured resources
 *
 * Returns all resources ordered by display_order.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const featured = searchParams.get("featured") === "true"

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("creator_resources")
      .select("*")
      .order("display_order", { ascending: true })

    if (category) query = query.eq("category", category)
    if (featured) query = query.eq("is_featured", true)

    const { data: resources, error } = await query

    if (error) {
      console.error("[resources GET]", error)
      return NextResponse.json({ error: "Failed to fetch resources." }, { status: 500 })
    }

    return NextResponse.json({ resources: resources ?? [] })
  } catch (err) {
    console.error("[resources GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

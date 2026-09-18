/**
 * GET /api/community/resources — resource directory
 *
 * Query params:
 *   ?q=             title/description search
 *   ?category=      discipline (photography, editing, color_grading, …)
 *   ?type=          tools | learning | communities | references | templates | services
 *   ?tags=          repeatable, matches ANY (real overlap)
 *   ?source=        pxl | external
 *   ?featured=true
 *   ?page=1 ?limit=50
 *
 * Only status='published' resources are returned. Every row carries `source`
 * so the UI can state plainly whether PXL made it or it's a third-party tool
 * listed for discovery — an external resource is never implied to be ours.
 *
 * Public endpoint — no auth required.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim().replace(/[,()]/g, "")
  const category = searchParams.get("category")
  const type = searchParams.get("type")
  const source = searchParams.get("source")
  const tags = searchParams.getAll("tags").filter(Boolean)
  const featured = searchParams.get("featured") === "true"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("creator_resources")
      .select("*", { count: "exact" })
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .range(offset, offset + limit - 1)

    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    if (category && category !== "all") query = query.eq("category", category)
    if (type && type !== "all") query = query.eq("resource_type", type)
    if (source) query = query.eq("source", source)
    if (tags.length) query = query.overlaps("tags", tags)
    if (featured) query = query.eq("is_featured", true)

    const { data: resources, error, count } = await query

    if (error) {
      console.error("[resources GET]", error)
      return NextResponse.json({ error: "Failed to fetch resources." }, { status: 500 })
    }

    return NextResponse.json({
      resources: resources ?? [],
      total: count ?? 0,
      page,
      limit,
      hasMore: offset + limit < (count ?? 0),
    })
  } catch (err) {
    console.error("[resources GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

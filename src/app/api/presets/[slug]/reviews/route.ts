/**
 * GET /api/presets/[slug]/reviews
 *
 * Returns approved reviews for a specific preset.
 * Public endpoint — no auth required.
 *
 * Query params:
 *   page  (default 1)
 *   limit (default 10, max 50)
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function GET(
  req:     NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params

  const searchParams = req.nextUrl.searchParams
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)))
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  const supabase = createAdminClient()

  /* Resolve slug → preset */
  const { data: preset } = await supabase
    .from("presets")
    .select("id, rating, review_count")
    .eq("slug", slug)
    .maybeSingle()

  if (!preset) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 })
  }

  /* Fetch approved reviews */
  const { data: reviews, error, count } = await supabase
    .from("preset_reviews")
    .select("id, rating, review_text, is_verified_purchase, created_at, email", {
      count: "exact",
    })
    .eq("preset_id", preset.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("[preset reviews GET]", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }

  /* Mask email: "john@gmail.com" → "jo**@gmail.com" */
  const masked = (reviews ?? []).map((r) => {
    const [local, domain] = (r.email ?? "").split("@")
    const maskedLocal     = local && local.length > 2 ? local.slice(0, 2) + "**" : "**"
    return {
      ...r,
      email: domain ? `${maskedLocal}@${domain}` : "**",
    }
  })

  return NextResponse.json({
    reviews:             masked,
    total:               count ?? 0,
    page,
    limit,
    total_pages:         Math.ceil((count ?? 0) / limit),
    preset_rating:       preset.rating,
    preset_review_count: preset.review_count,
  })
}

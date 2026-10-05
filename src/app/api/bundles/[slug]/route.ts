import { NextRequest }              from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params
  const supabase  = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("bundles")
    // Explicit columns: anon SELECT on bundles.download_url is revoked (052).
    .select(`
      id, name, slug, tagline, description, seo_title, seo_description, thumbnail_url, banner_url,
      badge, display_order, bundle_price_usd, compare_at_price_usd, is_published, is_featured,
      created_at, updated_at,
      bundle_presets (
        order_index,
        presets ( id, name, slug, thumbnail_url, price_usd, category, tagline )
      )
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (error || !data) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 })
  }

  return Response.json({ success: true, data })
}

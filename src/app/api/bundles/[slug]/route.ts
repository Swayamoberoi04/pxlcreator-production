import { NextRequest }              from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params
  const supabase  = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("bundles")
    .select(`
      *,
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

import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("bundles")
    .select(`
      *,
      bundle_presets ( preset_id, order_index, presets ( id, name, slug, thumbnail_url, price_usd ) )
    `)
    .eq("is_published", true)
    .order("display_order", { ascending: true })

  if (error) return Response.json({ success: false, error: error.message }, { status: 500 })
  return Response.json({ success: true, data })
}

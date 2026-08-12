/**
 * GET /api/editor/quick-presets — public, active Quick Look presets
 *
 * The editor is entirely client-rendered (dynamic import, ssr:false), so
 * unlike server-rendered pages this can't use a repository + generateMetadata-
 * style server fetch — LeftSidebar.tsx fetches this on mount and falls back
 * to the hardcoded QUICK_PRESETS if the request fails or returns empty.
 */
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(): Promise<Response> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("editor_quick_presets")
      .select("preset_key, name, adjustments")
      .eq("is_active", true)
      .order("order_index", { ascending: true })

    if (error || !data || data.length === 0) {
      return Response.json({ success: true, data: [] })
    }

    return Response.json({
      success: true,
      data: data.map((p) => ({ id: p.preset_key, name: p.name, adjustments: p.adjustments })),
    })
  } catch {
    return Response.json({ success: true, data: [] })
  }
}

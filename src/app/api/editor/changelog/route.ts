/**
 * GET /api/editor/changelog — public, published changelog entries
 */
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(): Promise<Response> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("editor_changelog")
      .select("id, version_label, title, description, released_at")
      .eq("is_published", true)
      .order("released_at", { ascending: false })
      .limit(30)

    if (error || !data) {
      return Response.json({ success: true, data: [] })
    }

    return Response.json({ success: true, data })
  } catch {
    return Response.json({ success: true, data: [] })
  }
}

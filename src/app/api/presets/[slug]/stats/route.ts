/**
 * GET /api/presets/[slug]/stats
 *
 * Public download counter (social proof). Returns ONLY the total
 * download count for a preset — no free/paid split, no events, no
 * revenue, no user data. Safe for anonymous/public consumption.
 *
 * Cached briefly at the edge: the count changes slowly and social-proof
 * numbers tolerate a minute of staleness.
 */

import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params
  if (!slug || slug.length > 200) {
    return Response.json({ error: "Invalid slug." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
    const { data, error } = await supabase
      .from("presets")
      .select("download_count")
      .eq("slug", slug)
      .maybeSingle()

    if (error) throw error
    const downloads = Number(data?.download_count ?? 0)

    return Response.json(
      { slug, downloads },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    )
  } catch {
    /* Never fail loudly for a social-proof widget */
    return Response.json({ slug, downloads: 0 }, { headers: { "Cache-Control": "no-store" } })
  }
}

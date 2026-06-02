/**
 * GET /api/community/stats
 *
 * Returns aggregate counts for the community hub hero section.
 * Public endpoint — no auth required.
 * Cached for 5 minutes via Next.js revalidation.
 */

import { NextResponse }        from "next/server"
import { createAdminClient }   from "@/lib/supabase/admin"

export const runtime  = "nodejs"
export const revalidate = 300 // 5 minutes

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createAdminClient()

    const [profilesRes, channelsRes, projectsRes] = await Promise.all([
      supabase.from("community_profiles").select("id", { count: "exact", head: true }),
      supabase.from("community_channels").select("id", { count: "exact", head: true }).eq("visibility", "public"),
      supabase.from("project_listings").select("id", { count: "exact", head: true }).eq("status", "open"),
    ])

    return NextResponse.json({
      creators:  profilesRes.count  ?? 0,
      channels:  channelsRes.count  ?? 0,
      projects:  projectsRes.count  ?? 0,
    })
  } catch {
    // Return zeros on error — community stats are non-critical
    return NextResponse.json({ creators: 0, channels: 0, projects: 0 })
  }
}

/**
 * GET /api/community/featured-creators
 *
 * Public "Featured Creator / Inspiration" entities — real external
 * photographers/creators who are NOT PXL members. See migration 044 and
 * src/types/community.ts's FeaturedCreator doc comment for why this is a
 * distinct entity from community_profiles: no firebase_uid, no follow
 * relationship, never presented as though they joined PXL.
 *
 * Auth: none — public, read-only. Managed by admins at /admin/community/featured-creators.
 */

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const revalidate = 300

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("featured_creators")
      .select("id, name, handle, bio, avatar_url, source_url, platform, role_tags, style_tags, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) {
      // Table absent = migration 044 not applied yet.
      if (error.code === "PGRST205" || error.code === "42P01") {
        return NextResponse.json({ creators: [] })
      }
      console.error("[featured-creators GET]", error)
      return NextResponse.json({ error: "Failed to load featured creators." }, { status: 500 })
    }

    return NextResponse.json({ creators: data ?? [] })
  } catch (err) {
    console.error("[featured-creators GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

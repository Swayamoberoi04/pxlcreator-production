/**
 * GET /api/community/tags
 *
 * The live filter vocabulary for creator discovery, read from the
 * `creator_tags` table. This is what replaced the hardcoded CREATOR_ROLES
 * array as the source of truth for filter UIs — add a row in the database
 * and the filter appears, no deploy required.
 *
 * Query params:
 *   ?kind=role | style   (optional — omit to get both)
 *
 * Returns: { roles: CreatorTag[], styles: CreatorTag[] }
 *
 * Auth: none — this is public reference data.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CreatorTag } from "@/types/community"

export const runtime = "nodejs"
export const revalidate = 300 // reference data changes rarely

export async function GET(req: NextRequest) {
  const kind = new URL(req.url).searchParams.get("kind")
  if (kind && kind !== "role" && kind !== "style") {
    return NextResponse.json({ error: "kind must be 'role' or 'style'." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from("creator_tags")
      .select("id, kind, label, icon, color, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (kind) query = query.eq("kind", kind)

    const { data, error } = await query
    if (error) {
      // Before migration 043 the table doesn't exist yet. Answer with empty
      // lists so the client keeps its offline fallback vocabulary instead of
      // rendering an error where filter chips belong.
      if (error.code === "PGRST205" || error.code === "42P01") {
        console.warn("[community/tags GET] creator_tags missing — migration 043 not applied")
        return NextResponse.json({ roles: [], styles: [] })
      }
      console.error("[community/tags GET]", error)
      return NextResponse.json({ error: "Failed to load tags." }, { status: 500 })
    }

    const tags = (data ?? []) as CreatorTag[]
    return NextResponse.json({
      roles:  tags.filter((t) => t.kind === "role"),
      styles: tags.filter((t) => t.kind === "style"),
    })
  } catch (err) {
    console.error("[community/tags GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

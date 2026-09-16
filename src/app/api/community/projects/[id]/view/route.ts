/**
 * POST /api/community/projects/[id]/view
 *
 * Logs a real page view (project_views row) — view_count on the project is
 * kept in sync by the trg_sync_project_view_count trigger (migration 046),
 * never a client-supplied number. This is a page-view count, not a unique-
 * visitor count — documented here rather than implied otherwise.
 *
 * Auth optional — viewer_uid is recorded when available, null otherwise.
 * The owner viewing their own project does not inflate their own count.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 120, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params
  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const uid = await getFirebaseUidFromRequest(req)

  try {
    const supabase = createAdminClient()
    const { data: project } = await supabase
      .from("project_listings")
      .select("id, poster_uid")
      .eq("id", projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })

    // Don't count the owner viewing their own listing.
    if (uid === project.poster_uid) {
      return NextResponse.json({ counted: false })
    }

    const { error } = await supabase.from("project_views").insert({ project_id: projectId, viewer_uid: uid ?? null })
    if (error) {
      console.error("[projects/[id]/view POST]", error)
      return NextResponse.json({ error: "Failed to log view." }, { status: 500 })
    }

    return NextResponse.json({ counted: true })
  } catch (err) {
    console.error("[projects/[id]/view POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

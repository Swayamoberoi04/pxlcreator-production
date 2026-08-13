import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { createClient }              from "@supabase/supabase-js"
import { requirePermission }         from "@/lib/admin/permissions"
import { parseDateRange }            from "@/lib/bi/date-range"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  try {
    const deny = await requirePermission("analytics:read")
    if (deny) return deny

    const supabase = db()
    const { from, to } = parseDateRange(req.nextUrl.searchParams)

    const [postsRes, commentsRes, showcaseRes, creatorRes, challengeRes] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from)
        .lte("created_at", to),

      supabase
        .from("community_comments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from)
        .lte("created_at", to),

      supabase
        .from("community_showcase")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from)
        .lte("created_at", to),

      supabase
        .from("creator_profiles")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("challenge_completions")
        .select("id", { count: "exact", head: true })
        .gte("completed_at", from)
        .lte("completed_at", to),
    ])

    return NextResponse.json({
      postsInPeriod:      postsRes.count      ?? 0,
      commentsInPeriod:   commentsRes.count   ?? 0,
      showcaseInPeriod:   showcaseRes.count   ?? 0,
      totalCreators:      creatorRes.count     ?? 0,
      challengeCompletes: challengeRes.count   ?? 0,
    })
  } catch (err) {
    console.error("[bi/community]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

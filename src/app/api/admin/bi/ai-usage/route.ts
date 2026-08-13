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

    const [summaryRes, dailyRes] = await Promise.all([
      supabase.rpc("bi_ai_summary", { p_from: from, p_to: to }),
      supabase
        .from("ai_usage_events")
        .select("occurred_at, event_type, processing_ms")
        .gte("occurred_at", from)
        .lte("occurred_at", to)
        .eq("event_type", "analyze"),
    ])

    if (summaryRes.error) throw summaryRes.error

    const summary = (summaryRes.data as unknown[])?.[0] ?? {}

    const byDay: Record<string, number> = {}
    for (const row of dailyRes.data ?? []) {
      const day = row.occurred_at.slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + 1
    }
    const dailyAnalyses = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({ day, count }))

    return NextResponse.json({ summary, dailyAnalyses })
  } catch (err) {
    console.error("[bi/ai-usage]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

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

    const summaryRes = await supabase.rpc("bi_search_summary", { p_from: from, p_to: to })
    if (summaryRes.error) throw summaryRes.error

    const summary = (summaryRes.data as unknown[])?.[0] ?? {}

    const zeroRes = await supabase
      .from("search_events")
      .select("query, occurred_at")
      .eq("has_results", false)
      .gte("occurred_at", from)
      .lte("occurred_at", to)
      .order("occurred_at", { ascending: false })
      .limit(50)

    const zeroGrouped: Record<string, number> = {}
    for (const row of zeroRes.data ?? []) {
      zeroGrouped[row.query] = (zeroGrouped[row.query] ?? 0) + 1
    }
    const topZeroResults = Object.entries(zeroGrouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }))

    return NextResponse.json({ summary, topZeroResults })
  } catch (err) {
    console.error("[bi/search-intel]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

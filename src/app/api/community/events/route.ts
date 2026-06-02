/**
 * GET /api/community/events
 * POST /api/community/events (admin only for now)
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }         from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get("status") ?? "active"
  const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20"))
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const offset   = (page - 1) * limit

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("community_events")
      .select("*")
      .eq("status", status)
      .order("start_date", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return NextResponse.json({ events: data ?? [] })
  } catch {
    return NextResponse.json({ events: [] })
  }
}

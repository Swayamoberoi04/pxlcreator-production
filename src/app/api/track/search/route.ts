import "server-only"
import type { NextRequest } from "next/server"
import { trackSearch }      from "@/lib/bi/track"
import { getClientIp }      from "@/lib/api/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as { query?: string; resultCount?: number; source?: string }
    const query = typeof body.query === "string" ? body.query.trim() : ""
    if (!query) return Response.json({ ok: false }, { status: 400 })

    trackSearch({
      query,
      resultCount: typeof body.resultCount === "number" ? body.resultCount : 0,
      source:      body.source ?? "preset_grid",
      ip:          getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}

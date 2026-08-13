/**
 * GET /api/presets
 *
 * Public endpoint — returns published presets with optional filters.
 * Used by future mobile apps, partner integrations, etc.
 *
 * Query params:
 *   category  — "Cinematic" | "Film Emulation" | ... | "All" | "Free"
 *   search    — text search
 *   featured  — "true"
 *   limit     — number (default 50)
 *   offset    — number (default 0)
 */

import type { NextRequest } from "next/server"
import { getPresets }       from "@/lib/presets/repository"
import { trackSearch }      from "@/lib/bi/track"
import { getClientIp }      from "@/lib/api/rate-limit"
import type { PresetCategory } from "@/types/product"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") ?? undefined

    const presets = await getPresets({
      category:  (searchParams.get("category") ?? undefined) as PresetCategory | "All" | "Free" | undefined,
      search,
      featured:  searchParams.get("featured") === "true" ? true : undefined,
      limit:     searchParams.get("limit")    ? parseInt(searchParams.get("limit")!,  10) : 50,
      offset:    searchParams.get("offset")   ? parseInt(searchParams.get("offset")!, 10) : 0,
    })

    if (search?.trim()) {
      trackSearch({
        query:       search.trim(),
        resultCount: presets.length,
        source:      "preset_grid",
        ip:          getClientIp(request),
      })
    }

    return Response.json({ success: true, data: presets, count: presets.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

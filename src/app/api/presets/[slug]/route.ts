/**
 * GET /api/presets/[slug]
 *
 * Public endpoint — returns a single preset by slug.
 */

import type { NextRequest }  from "next/server"
import { getPresetBySlug }   from "@/lib/presets/repository"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await params
    const preset   = await getPresetBySlug(slug)

    if (!preset) {
      return Response.json({ success: false, error: "Preset not found" }, { status: 404 })
    }

    return Response.json({ success: true, data: preset })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

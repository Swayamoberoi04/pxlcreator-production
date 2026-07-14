/**
 * GET /api/ai/recommendations
 *
 * Returns ranked preset recommendations for a given set of keywords.
 *
 * Query params:
 *   keywords  — comma-separated keyword string (e.g. "warm,cinematic,golden")
 *   limit     — max number of results (default 5, max 20)
 *
 * Response:
 *   { success, recommendations: PresetMatch[], count }
 *
 * Used by the Studio result panel and future "Similar Presets" features.
 */

import type { NextRequest }    from "next/server"
import { getPresets }          from "@/lib/presets/repository"
import { recommendPreset }     from "@/lib/studio/recommend"
import type { PresetMatch }    from "@/types/ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)

  const rawKeywords = searchParams.get("keywords") ?? ""
  const limit       = Math.min(parseInt(searchParams.get("limit") ?? "5", 10) || 5, 20)

  const keywords = rawKeywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 15)

  if (keywords.length === 0) {
    return Response.json({ success: false, error: "At least one keyword is required." }, { status: 400 })
  }

  let presets
  try {
    presets = await getPresets({ orderBy: "order_index" })
  } catch (err) {
    console.error("[api/ai/recommendations] getPresets failed:", err)
    return Response.json({ success: false, error: "Could not load preset library." }, { status: 503 })
  }

  /* Get the top recommendation */
  const topRec = recommendPreset(keywords, presets)

  /* Build ranked PresetMatch array */
  const matches: PresetMatch[] = presets
    .map((preset, i): PresetMatch & { _score: number } => {
      const tags  = (preset.aiTags ?? []).map((t) => t.toLowerCase())
      const hits  = keywords.filter((k) => tags.includes(k))
      const score = tags.length > 0 ? hits.length / Math.min(keywords.length, tags.length) : 0

      return {
        presetId:    preset.id,
        presetSlug:  preset.slug,
        presetName:  preset.name,
        score:       Math.round(score * 100) / 100,
        matchedTags: hits,
        reason:      hits.length > 0
          ? `Matches ${hits.slice(0, 2).map((h) => h.charAt(0).toUpperCase() + h.slice(1)).join(" and ")} in your style`
          : "Versatile preset for any style",
        rank:        i + 1,
        _score:      score,
      }
    })
    .sort((a, b) => b._score - a._score || (b._score > 0 ? 0 : -1))
    .slice(0, limit)
    .map(({ _score: _s, ...rest }, i) => ({ ...rest, rank: i + 1 }))

  /* Ensure top recommendation is ranked first */
  if (topRec.presetId && matches[0]?.presetId !== topRec.presetId) {
    const topIdx = matches.findIndex((m) => m.presetId === topRec.presetId)
    if (topIdx > 0) {
      const [top] = matches.splice(topIdx, 1)
      matches.unshift({ ...top, rank: 1 })
      matches.slice(1).forEach((m, i) => { m.rank = i + 2 })
    }
  }

  return Response.json({
    success:         true,
    recommendations: matches,
    count:           matches.length,
    topMatch:        matches[0] ?? null,
  })
}

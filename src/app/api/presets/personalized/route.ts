/**
 * GET /api/presets/personalized
 *
 * Returns presets ranked by the user's category affinities.
 * Falls back to featured presets if user has no profile.
 *
 * Query params:
 *  limit  — max items to return (default 20)
 *  offset — pagination offset
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"
import { CATALOGUE }                  from "@/lib/recommendations/engine"
import type { CategoryAffinities }    from "@/types/onboarding"

export const runtime = "nodejs"

// Map preset categories to affinity dimensions
const CATEGORY_AFFINITY_MAP: Record<string, Partial<CategoryAffinities>> = {
  "Cinematic":      { cinematic: 0.9, film: 0.6, dark_luxury: 0.4 },
  "Film Emulation": { film: 0.9, vintage: 0.8, cinematic: 0.4 },
  "Portrait":       { portrait: 0.9, fashion: 0.6, editorial: 0.4 },
  "Landscape":      { nature: 0.9, travel: 0.7 },
  "Street":         { street: 0.9, urban: 0.8, film: 0.4 },
  "Lifestyle":      { minimal: 0.7, mobile: 0.6, fashion: 0.4 },
  "Travel":         { travel: 0.9, nature: 0.7, cinematic: 0.3 },
  "Editorial":      { editorial: 0.9, fashion: 0.7, dark_luxury: 0.5 },
  "Minimal":        { minimal: 0.9, commercial: 0.5 },
  "Dark":           { dark_luxury: 0.9, cinematic: 0.6 },
  "Bundle":         { cinematic: 0.5, portrait: 0.5, travel: 0.5 },
}

function dotScore(user: Partial<CategoryAffinities>, cat: Partial<CategoryAffinities>): number {
  let score = 0
  for (const [key, weight] of Object.entries(cat)) {
    score += (user[key as keyof CategoryAffinities] ?? 0) * (weight ?? 0)
  }
  return score
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const limit  = Math.min(40, parseInt(searchParams.get("limit")  ?? "20"))
  const offset = Math.max(0,  parseInt(searchParams.get("offset") ?? "0"))

  // Try to get user affinities
  let affinities: Partial<CategoryAffinities> | null = null

  const uid = await getFirebaseUidFromRequest(req)
  if (uid) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("creator_profiles")
      .select("affinities")
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (data?.affinities) {
      affinities = data.affinities as Partial<CategoryAffinities>
    }
  }

  // Fetch all presets (use admin client for reliability)
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: presets, error } = await (supabase as any)
    .from("presets")
    .select("id, slug, name, tagline, price, original_price, category, rating, review_count, badge, is_featured, is_free, thumbnail_url, price_tier")
    .order("is_featured", { ascending: false })

  if (error || !presets) {
    // Return recommendation catalogue items sorted by affinity as fallback
    const catalogueItems = CATALOGUE
      .filter((i) => i.type === "preset-bundle")
      .map((item) => {
        const score = affinities ? dotScore(affinities, item.categories) : 0.5
        return { ...item, affinityScore: Math.round(score * 100) }
      })
      .sort((a, b) => b.affinityScore - a.affinityScore)
      .slice(offset, offset + limit)

    return NextResponse.json({
      presets:      catalogueItems,
      total:        catalogueItems.length,
      personalized: !!affinities,
      source:       "catalogue_fallback",
    })
  }

  // Score each preset by category affinity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scored = (presets as any[]).map((preset) => {
    const catAffinities = CATEGORY_AFFINITY_MAP[preset.category ?? ""] ?? {}
    const affinityScore = affinities ? dotScore(affinities, catAffinities) : 0.5
    return { ...preset, affinityScore: Math.round(affinityScore * 100) }
  })

  // Sort: personalized score first, then featured, then by rating
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sorted = (scored as any[]).sort((a, b) => {
    if (Math.abs(a.affinityScore - b.affinityScore) > 10) return b.affinityScore - a.affinityScore
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    return (b.rating ?? 0) - (a.rating ?? 0)
  })

  return NextResponse.json({
    presets:      sorted.slice(offset, offset + limit),
    total:        sorted.length,
    personalized: !!affinities,
    topAffinities: affinities
      ? Object.entries(affinities).sort(([,a],[,b]) => (b as number) - (a as number)).slice(0, 3).map(([k]) => k)
      : [],
  })
}

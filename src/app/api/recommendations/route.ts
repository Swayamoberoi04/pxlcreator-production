/**
 * GET /api/recommendations
 *
 * Returns personalised recommendation sections for the authenticated user.
 * Reads from recommendation_cache; re-computes if stale (>7 days).
 *
 * Returns: { sections: PersonalizedSection[], dna: StyleDNA | null, fromCache: boolean }
 */

import { NextRequest, NextResponse }        from "next/server"
import { createAdminClient }                from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }        from "@/lib/account/auth"
import { computeAffinities, generateRecommendations } from "@/lib/recommendations/engine"
import { generateStyleDNA }                 from "@/lib/recommendations/style-dna"
import type { OnboardingAnswers, StyleDNA, PersonalizedSection, CategoryAffinities } from "@/types/onboarding"

export const runtime = "nodejs"

const CACHE_TTL_DAYS = 7

export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const supabase = createAdminClient()

  /* Load creator profile */
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("firebase_uid", uid)
    .maybeSingle()

  if (!profile?.onboarding_completed_at) {
    return NextResponse.json({ sections: [], dna: null, fromCache: false })
  }

  /* Check cache freshness */
  const { data: cached } = await supabase
    .from("recommendation_cache")
    .select("section_id, items, generated_at")
    .eq("firebase_uid", uid)
    .order("generated_at", { ascending: false })
    .limit(10)

  const isStale =
    !cached?.length ||
    new Date(cached[0].generated_at).getTime() < Date.now() - CACHE_TTL_DAYS * 86_400_000

  const dna: StyleDNA = {
    title:         profile.style_dna_title    ?? "Creator",
    tagline:       profile.style_dna_tagline  ?? "",
    badge:         profile.style_dna_badge    ?? "Creator",
    primaryColor:  profile.style_dna_color    ?? "#C9A84C",
    archetypes:    profile.style_dna_archetypes ?? [],
    topCategories: Object.entries((profile.affinities as unknown as CategoryAffinities) ?? {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([k]) => k),
  }

  if (!isStale && cached?.length) {
    /* Serve from cache */
    const sections: PersonalizedSection[] = cached.map((row) => ({
      id:          row.section_id,
      headline:    getSectionHeadline(row.section_id, profile.style_dna_badge ?? ""),
      subheadline: getSectionSubheadline(row.section_id),
      items:       row.items as unknown as PersonalizedSection["items"],
    }))
    return NextResponse.json({ sections, dna, fromCache: true })
  }

  /* Recompute — profile has all the answers */
  const answers: OnboardingAnswers = {
    professions: profile.professions as OnboardingAnswers["professions"],
    goals:       profile.goals       as OnboardingAnswers["goals"],
    aesthetics:  profile.aesthetics  as OnboardingAnswers["aesthetics"],
    skillLevel:  profile.skill_level as OnboardingAnswers["skillLevel"],
    platforms:   profile.platforms   as OnboardingAnswers["platforms"],
  }

  const affinities = computeAffinities(answers)
  const { sections } = generateRecommendations(affinities, answers)

  /* Refresh cache */
  for (const section of sections) {
    await supabase
      .from("recommendation_cache")
      .upsert(
        { firebase_uid: uid, section_id: section.id, items: section.items as unknown as import("@/types/database").Json, generated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() },
        { onConflict: "firebase_uid,section_id" }
      )
  }

  return NextResponse.json({ sections, dna, fromCache: false })
}

function getSectionHeadline(id: string, badge: string): string {
  const map: Record<string, string> = {
    "preset-bundles": `For Your ${badge || "Creative"} Aesthetic`,
    "learning":       "Level Up Your Craft",
    "luts":           "Cinema-Grade Colour",
    "challenges":     "Challenges For You",
    "growth":         "Your Creator Growth Path",
  }
  return map[id] ?? "Recommended For You"
}

function getSectionSubheadline(id: string): string {
  const map: Record<string, string> = {
    "preset-bundles": "Preset bundles matched to your visual style and editing goals",
    "learning":       "Tutorials and courses chosen for your skill level and goals",
    "luts":           "Professional LUTs for your video and film work",
    "challenges":     "Build skills through daily creative prompts",
    "growth":         "Strategic pathways to build your brand and income",
  }
  return map[id] ?? "Personalised picks based on your creator profile"
}



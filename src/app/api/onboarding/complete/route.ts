/**
 * POST /api/onboarding/complete
 *
 * Saves onboarding answers, computes category affinities,
 * generates Style DNA, and caches personalised recommendations.
 *
 * Body: OnboardingAnswers (professions, goals, aesthetics, skillLevel, platforms)
 * Auth: Authorization: Bearer <firebase_id_token>
 *
 * Returns: { profile: CreatorProfileRow, dna: StyleDNA, sections: PersonalizedSection[] }
 */

import { NextRequest, NextResponse }        from "next/server"
import { createAdminClient }                from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }        from "@/lib/account/auth"
import { computeAffinities, generateRecommendations } from "@/lib/recommendations/engine"
import { generateStyleDNA }                 from "@/lib/recommendations/style-dna"
import { makeRateLimiter, getClientIp }     from "@/lib/api/rate-limit"
import { log }                              from "@/lib/api/logger"
import type { OnboardingAnswers }           from "@/types/onboarding"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

export async function POST(req: NextRequest): Promise<NextResponse> {
  /* Rate limit */
  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  /* Auth */
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  /* Parse body */
  let answers: OnboardingAnswers
  try {
    answers = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  /* Validate */
  if (!answers.professions?.length) {
    return NextResponse.json({ error: "At least one profession is required." }, { status: 400 })
  }
  if (!answers.skillLevel) {
    return NextResponse.json({ error: "Skill level is required." }, { status: 400 })
  }

  /* Apply defaults for optional steps */
  const safeAnswers: OnboardingAnswers = {
    professions: answers.professions ?? [],
    goals:       answers.goals       ?? [],
    aesthetics:  answers.aesthetics  ?? [],
    skillLevel:  answers.skillLevel,
    platforms:   answers.platforms   ?? [],
  }

  try {
    /* 1. Compute affinities */
    const affinities = computeAffinities(safeAnswers)

    /* 2. Generate Style DNA */
    const dna = generateStyleDNA(affinities, safeAnswers)

    /* 3. Generate personalised recommendations */
    const { sections } = generateRecommendations(affinities, safeAnswers)

    const supabase = createAdminClient()

    /* 4. Upsert creator_profiles */
    const { data: profile, error: profileErr } = await supabase
      .from("creator_profiles")
      .upsert(
        {
          firebase_uid:            uid,
          professions:             safeAnswers.professions,
          goals:                   safeAnswers.goals,
          aesthetics:              safeAnswers.aesthetics,
          skill_level:             safeAnswers.skillLevel,
          platforms:               safeAnswers.platforms,
          affinities: affinities as unknown as import("@/types/database").Json,
          style_dna_title:         dna.title,
          style_dna_tagline:       dna.tagline,
          style_dna_badge:         dna.badge,
          style_dna_color:         dna.primaryColor,
          style_dna_archetypes:    dna.archetypes,
          onboarding_completed_at: new Date().toISOString(),
        },
        { onConflict: "firebase_uid" }
      )
      .select()
      .single()

    if (profileErr) {
      log.error("onboarding/complete", "Failed to save creator profile", { error: profileErr.message })
      return NextResponse.json({ error: "Failed to save profile." }, { status: 500 })
    }

    /* 5. Cache recommendation sections */
    for (const section of sections) {
      await supabase
        .from("recommendation_cache")
        .upsert(
          {
            firebase_uid: uid,
            section_id:   section.id,
            items:        section.items as unknown as import("@/types/database").Json,
            generated_at: new Date().toISOString(),
            expires_at:   new Date(Date.now() + 7 * 86_400_000).toISOString(),
          },
          { onConflict: "firebase_uid,section_id" }
        )
    }

    log.info("onboarding/complete", "Onboarding completed", {
      uid:   uid.slice(0, 8),
      dna:   dna.title,
      profs: safeAnswers.professions.length,
    })

    return NextResponse.json({ profile, dna, sections })
  } catch (err) {
    log.error("onboarding/complete", "Unexpected error", { error: String(err) })
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

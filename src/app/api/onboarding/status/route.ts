/**
 * GET /api/onboarding/status
 *
 * Returns whether the authenticated user has completed onboarding.
 * Used by OnboardingGate to decide whether to close the modal.
 *
 * Returns: { completed: boolean, profile: CreatorProfileRow | null }
 *
 * IMPORTANT: This route MUST NOT return a non-2xx status for "table not found"
 * or any Supabase error. The OnboardingGate ignores non-OK responses and keeps
 * the modal open (fail-open), so errors here are safe but we should be explicit.
 */

import { NextRequest, NextResponse }   from "next/server"
import { createAdminClient }           from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }   from "@/lib/account/auth"

export const runtime = "nodejs"

export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from("creator_profiles")
      .select("onboarding_completed_at, style_dna_title, style_dna_tagline, style_dna_badge, style_dna_color, style_dna_archetypes, style_dna_top_categories")
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (error) {
      /* Table might not exist yet (migration not run).
         Return completed: false so the gate correctly shows the modal. */
      return NextResponse.json({ completed: false, profile: null })
    }

    const completed = !!(profile?.onboarding_completed_at)
    return NextResponse.json({ completed, profile: profile ?? null })
  } catch {
    /* Any unexpected error → treat as "not completed" for new users */
    return NextResponse.json({ completed: false, profile: null })
  }
}

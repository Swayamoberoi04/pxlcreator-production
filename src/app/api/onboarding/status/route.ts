/**
 * GET /api/onboarding/status
 *
 * Returns whether the authenticated user has completed onboarding.
 * Used by OnboardingGate to decide whether to show the modal.
 *
 * Returns: { completed: boolean, profile: CreatorProfileRow | null }
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

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("firebase_uid", uid)
    .maybeSingle()

  const completed = !!(profile?.onboarding_completed_at)
  return NextResponse.json({ completed, profile: profile ?? null })
}

/**
 * POST /api/community/onboarding
 *
 * Real one-click onboarding for a signed-in creator. Replaces the former
 * /api/community/seed route, which fabricated three Unsplash "showcase"
 * items and attributed them to the user — invented portfolio work that made
 * the network look populated without anyone having posted anything.
 *
 * This route only does things that are true:
 *   - creates the user's community_profiles row if missing
 *   - marks them publicly discoverable
 *   - joins the default public spaces that actually exist
 *
 * Auth required.
 *
 * Returns: { ok: true, profile_created, spaces_joined, already_member }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

const DEFAULT_SPACE_SLUGS = ["photography", "lightroom-editing"]

const limiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  try {
    const supabase = createAdminClient()

    const { data: before } = await supabase
      .from("community_profiles")
      .select("id")
      .eq("firebase_uid", uid)
      .maybeSingle()

    await ensureProfile(uid)
    const profile_created = !before

    // Make the creator discoverable — this is the actual point of onboarding.
    // No-op before migration 043, where every profile is public by default.
    const { error: visibilityError } = await supabase
      .from("community_profiles")
      .update({ visibility: "public" } as never)
      .eq("firebase_uid", uid)
    if (visibilityError && visibilityError.code !== "42703" && visibilityError.code !== "PGRST204") {
      console.error("[community/onboarding POST] visibility", visibilityError)
    }

    let spaces_joined = 0
    let already_member = 0

    for (const slug of DEFAULT_SPACE_SLUGS) {
      const { data: space } = await supabase
        .from("community_spaces")
        .select("id, member_count")
        .eq("slug", slug)
        .maybeSingle()

      if (!space) continue // the space genuinely doesn't exist yet — say nothing false

      const { data: existing } = await supabase
        .from("community_space_members")
        .select("id")
        .eq("space_id", space.id)
        .eq("firebase_uid", uid)
        .maybeSingle()

      if (existing) {
        already_member++
        continue
      }

      const { error: insertError } = await supabase
        .from("community_space_members")
        .insert({ space_id: space.id, firebase_uid: uid, role: "member" })

      if (!insertError) {
        spaces_joined++
        await supabase
          .from("community_spaces")
          .update({ member_count: (space.member_count ?? 0) + 1 } as never)
          .eq("id", space.id)
      }
    }

    return NextResponse.json({ ok: true, profile_created, spaces_joined, already_member })
  } catch (err) {
    console.error("[community/onboarding POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

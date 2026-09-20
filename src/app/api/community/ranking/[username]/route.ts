/**
 * GET /api/community/ranking/[username]
 *
 * A creator's rank score WITH its full itemised explanation — the same
 * breakdown the UI renders, so the number is never presented without the
 * arithmetic behind it.
 *
 * Recomputes from live data when the stored row is older than RANK_TTL_MS,
 * so a score reflects what the creator has actually done recently.
 *
 * Public — a score nobody can inspect isn't transparent. Contains no private
 * data: every input is already-public counts.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recomputeAndStore, RANK_TTL_MS } from "@/lib/community/rank-compute"
import { RANK_EXPLAINER, RANK_WEIGHTS, RANK_CAPS } from "@/lib/community/ranking"

export const runtime = "nodejs"

type Params = { params: Promise<{ username: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params

  try {
    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, is_banned, visibility")
      .eq("username", username.toLowerCase())
      .maybeSingle()

    if (!profile || profile.is_banned || profile.visibility !== "public") {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 })
    }

    const { data: stored } = await supabase
      .from("creator_rank_scores")
      .select("*")
      .eq("firebase_uid", profile.firebase_uid)
      .maybeSingle()

    const isStale = !stored || Date.now() - new Date(stored.computed_at).getTime() > RANK_TTL_MS

    if (isStale) {
      const fresh = await recomputeAndStore(supabase, profile.firebase_uid)
      if (!fresh) {
        return NextResponse.json({ error: "Creator not found." }, { status: 404 })
      }
      return NextResponse.json({
        username: profile.username,
        total_score: fresh.total,
        components: fresh.components,
        computed_at: new Date().toISOString(),
        explainer: RANK_EXPLAINER,
        weights: RANK_WEIGHTS,
        caps: RANK_CAPS,
      })
    }

    const breakdown = (stored.breakdown ?? {}) as { components?: unknown }
    return NextResponse.json({
      username: profile.username,
      total_score: stored.total_score,
      components: breakdown.components ?? [],
      computed_at: stored.computed_at,
      explainer: RANK_EXPLAINER,
      weights: RANK_WEIGHTS,
      caps: RANK_CAPS,
    })
  } catch (err) {
    console.error("[ranking/[username] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

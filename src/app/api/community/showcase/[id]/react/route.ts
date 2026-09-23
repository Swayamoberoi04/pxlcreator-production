/**
 * POST /api/community/showcase/[id]/react
 *
 * Toggle a reaction (like | bookmark) on a showcase item.
 * Returns the item's current reaction state and committed counts.
 *
 * Phase 5.8 rewrite. The previous version had three defects:
 *   • it ignored the result of every insert/delete, so a write refused by the
 *     database still returned `active: true` and an incremented count — the
 *     UI showed a like that was never stored;
 *   • it maintained like_count / bookmark_count by read-modify-write, which
 *     loses concurrent reactions. Those counters are now owned by
 *     trg_sync_showcase_reaction_counts (migration 050);
 *   • it had no rate limit at all, unlike every other reaction endpoint.
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { createLogger }               from "@/lib/observability/logger"
import { increment }                  from "@/lib/observability/metrics"

export const runtime = "nodejs"

const log = createLogger("community/showcase-react")
const limiter = makeRateLimiter({ max: 120, windowMs: 60 * 60 * 1000 })

const VALID_REACTIONS = ["like", "bookmark"] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: showcaseId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  if (limiter.check(getClientIp(req))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const body = await req.json().catch(() => ({})) as { reaction?: string }
  const reaction = body.reaction ?? "like"
  if (!VALID_REACTIONS.includes(reaction as typeof VALID_REACTIONS[number])) {
    return NextResponse.json(
      { error: `reaction must be one of: ${VALID_REACTIONS.join(", ")}.` },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    const { data: item } = await supabase
      .from("showcase_items")
      .select("id, is_removed")
      .eq("id", showcaseId)
      .maybeSingle()

    if (!item || item.is_removed) {
      return NextResponse.json({ error: "Showcase item not found." }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from("showcase_reactions")
      .select("id")
      .eq("showcase_id", showcaseId)
      .eq("firebase_uid", uid)
      .eq("reaction", reaction)
      .maybeSingle()

    const active = !existing
    const { error: writeError } = existing
      ? await supabase.from("showcase_reactions").delete().eq("id", existing.id)
      : await supabase.from("showcase_reactions").insert({ showcase_id: showcaseId, firebase_uid: uid, reaction })

    if (writeError) {
      log.error("showcase_reaction_write_failed", {
        showcaseId, reaction, code: writeError.code, message: writeError.message,
      })
      increment("community.write_failed")
      return NextResponse.json(
        { error: "Could not save your reaction. Please try again." },
        { status: 500 }
      )
    }

    // Read the committed counters back rather than predicting them.
    const { data: counts } = await supabase
      .from("showcase_items")
      .select("like_count, bookmark_count")
      .eq("id", showcaseId)
      .maybeSingle()

    return NextResponse.json({
      active,
      like_count:     counts?.like_count ?? 0,
      bookmark_count: counts?.bookmark_count ?? 0,
    })
  } catch (err) {
    log.error("showcase_reaction_unexpected", {
      showcaseId, error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

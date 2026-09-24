/**
 * src/lib/community/guard.ts
 *
 * One rate-limit budget for authenticated community mutations.
 *
 * Phase 5.8 audit found two gaps in how the community surface was protected:
 *
 *  1. Roughly a third of the mutating endpoints had no limiter at all. Create
 *     paths were covered (post, comment, apply, enquire, report); edit and
 *     delete paths largely were not — so `PATCH /feed/[id]`, `DELETE
 *     /showcase/[id]`, `PATCH /events/[id]`, application review and comment
 *     deletion could be called without any ceiling.
 *
 *  2. Every existing limiter keys on IP alone. For an authenticated endpoint
 *     that is the weaker choice in both directions: everyone behind one
 *     corporate NAT or mobile carrier shares a single budget, while one
 *     account rotating through addresses gets a fresh budget each time.
 *
 * This keys on the verified Firebase uid when there is one, falling back to IP
 * for anonymous callers. It deliberately does NOT replace the per-route
 * limiters already in place — those encode action-specific budgets (120
 * reactions/hour vs 15 reports/hour) and are left alone. This is the floor for
 * routes that had nothing.
 *
 * Storage is the same in-process Map as `@/lib/api/rate-limit`: it resets on
 * restart and is per-instance, which is honest about what it does and does not
 * defend against. On a multi-instance deployment the effective limit is this
 * number times the instance count — fine as a spam ceiling, not a quota.
 */

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { increment } from "@/lib/observability/metrics"

/**
 * Editing and deleting your own content is not something a person does
 * hundreds of times an hour, so this is generous for real use and still a
 * ceiling on a script.
 */
const mutationLimiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })

/**
 * Returns a 429 response when the caller is over budget, or null to continue.
 *
 * Usage:
 *   const limited = guardMutation(req, uid)
 *   if (limited) return limited
 *
 * @param scope  Optional label so unrelated routes don't share one bucket.
 */
export function guardMutation(
  req: NextRequest,
  uid: string | null,
  scope = "mutation"
): NextResponse | null {
  const key = `${scope}:${uid ?? `ip:${getClientIp(req)}`}`
  if (mutationLimiter.check(key)) {
    increment("community.rate_limited")
    increment(`community.rate_limited.${scope}`)
    return NextResponse.json(
      { error: "You're doing that too often. Please wait a moment and try again." },
      { status: 429 }
    )
  }
  return null
}

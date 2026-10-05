/**
 * src/lib/monetization/eligibility.ts — server only (Phase 5.10.2).
 *
 * Decides whether a member may become (or stay) a seller. Every input is read
 * server-side from an authoritative source — Firebase Auth for email/age, the
 * database for profile/ban/reports/showcases — never from the request. It
 * FAILS CLOSED: any lookup error marks that check failed, so an outage can
 * never approve someone.
 *
 * Rules (from the Phase 5.10 audit, section H):
 *   1. verified email                (Firebase Auth user record)
 *   2. account at least 14 days old  (Firebase creation time)
 *   3. public community profile with a real username and display name
 *   4. not banned                    (community_profiles.is_banned, mig 039)
 *   5. no upheld reports in 365 days (content_reports status 'actioned' on the
 *      profile or on anything they authored — same "upheld" meaning the
 *      ranking system uses)
 *   6. at least one public, non-removed showcase item
 * Rank score is deliberately NOT a gate (audit: easy to game at low volume).
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseAccountFacts } from "@/lib/firebase/admin-server"
import type { EligibilityCheck, EligibilityResult } from "@/types/monetization"

export const SELLER_MIN_ACCOUNT_AGE_DAYS = 14
export const SELLER_REPORT_LOOKBACK_DAYS = 365
export const SELLER_REAPPLY_COOLDOWN_DAYS = 14

const DAY = 86_400_000
const USERNAME = /^[a-z0-9_]{3,30}$/
// ensureProfile() auto-generates "creator_<uid prefix>" — a placeholder, not a chosen identity.
const AUTO_USERNAME = /^creator_[a-z0-9]{1,8}$/

export async function evaluateSellerEligibility(uid: string): Promise<EligibilityResult> {
  const checks: EligibilityCheck[] = []
  const add = (c: EligibilityCheck) => checks.push(c)
  const supabase = createAdminClient()

  /* 1 + 2: Firebase Auth */
  const facts = await getFirebaseAccountFacts(uid)
  if (!facts || facts.disabled) {
    add({ id: "email_verified", label: "Verified email address", passed: false, detail: "We couldn't confirm your account. Try signing in again." })
    add({ id: "account_age", label: `Account at least ${SELLER_MIN_ACCOUNT_AGE_DAYS} days old`, passed: false, detail: "We couldn't confirm your account age." })
  } else {
    add({
      id: "email_verified", label: "Verified email address", passed: facts.emailVerified,
      detail: facts.emailVerified ? "Your email is verified." : "Verify your email address from your account settings, then come back.",
    })
    const ageDays = facts.createdAt ? (Date.now() - Date.parse(facts.createdAt)) / DAY : -1
    const okAge = ageDays >= SELLER_MIN_ACCOUNT_AGE_DAYS
    add({
      id: "account_age", label: `Account at least ${SELLER_MIN_ACCOUNT_AGE_DAYS} days old`, passed: okAge,
      detail: okAge
        ? "Your account is old enough."
        : ageDays < 0 ? "We couldn't confirm your account age."
        : `Your account is ${Math.floor(ageDays)} day${Math.floor(ageDays) === 1 ? "" : "s"} old. You can apply in ${Math.ceil(SELLER_MIN_ACCOUNT_AGE_DAYS - ageDays)} more.`,
    })
  }

  /* 3 + 4: community profile */
  const { data: profile, error: profileErr } = await supabase
    .from("community_profiles")
    .select("username, display_name, visibility, is_banned")
    .eq("firebase_uid", uid)
    .maybeSingle()
  const p = profile as { username: string | null; display_name: string | null; visibility: string | null; is_banned: boolean | null } | null

  const profileOk = !profileErr && !!p && p.visibility === "public"
    && !!p.username && USERNAME.test(p.username) && !AUTO_USERNAME.test(p.username)
    && !!p.display_name?.trim()
  add({
    id: "public_profile", label: "Public creator profile with a username", passed: profileOk,
    detail: profileOk ? `Your profile @${p!.username} is public.`
      : profileErr ? "We couldn't load your profile."
      : !p ? "Create your community profile first."
      : p.visibility !== "public" ? "Set your profile visibility to Public."
      : !p.username || AUTO_USERNAME.test(p.username) || !USERNAME.test(p.username) ? "Choose your own username on your profile."
      : "Add a display name to your profile.",
  })

  const notBanned = !profileErr && !!p && p.is_banned === false
  add({
    id: "not_banned", label: "Account in good standing", passed: notBanned,
    detail: notBanned ? "No restrictions on your account."
      : profileErr ? "We couldn't check your account standing."
      : !p ? "Create your community profile first."
      : "Your community account is restricted.",
  })

  /* 5: upheld reports */
  add(await upheldReportsCheck(uid))

  /* 6: showcase */
  const { count: showcases, error: scErr } = await supabase
    .from("showcase_items")
    .select("id", { count: "exact", head: true })
    .eq("author_uid", uid)
    .eq("is_removed", false)
    .eq("visibility", "public")
  const hasShowcase = !scErr && (showcases ?? 0) >= 1
  add({
    id: "has_showcase", label: "At least one public showcase", passed: hasShowcase,
    detail: hasShowcase ? `You have ${showcases} public showcase item${showcases === 1 ? "" : "s"}.`
      : scErr ? "We couldn't check your showcase." : "Publish at least one piece of work to your showcase.",
  })

  return { eligible: checks.every((c) => c.passed), checks, evaluated_at: new Date().toISOString() }
}

async function upheldReportsCheck(uid: string): Promise<EligibilityCheck> {
  const base = { id: "no_upheld_reports" as const, label: "No upheld reports in the last year" }
  try {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - SELLER_REPORT_LOOKBACK_DAYS * DAY).toISOString()

    // Everything this member authored that can be reported. Bounded per type;
    // a member with more than this volume still has their newest content checked.
    const [posts, comments, showcases, projects] = await Promise.all([
      supabase.from("channel_posts").select("id").eq("author_uid", uid).limit(2000),
      supabase.from("post_comments").select("id").eq("author_uid", uid).limit(2000),
      supabase.from("showcase_items").select("id").eq("author_uid", uid).limit(2000),
      supabase.from("project_listings").select("id").eq("poster_uid", uid).limit(2000),
    ])
    if (posts.error || comments.error || showcases.error || projects.error) throw new Error("content lookup failed")

    const contentIds = [
      ...(posts.data ?? []), ...(comments.data ?? []), ...(showcases.data ?? []), ...(projects.data ?? []),
    ].map((r) => String((r as { id: string }).id))

    const profileReports = await supabase
      .from("content_reports").select("id", { count: "exact", head: true })
      .eq("status", "actioned").eq("target_type", "profile").eq("target_id", uid).gte("created_at", since)
    if (profileReports.error) throw new Error("report lookup failed")

    let contentCount = 0
    for (let i = 0; i < contentIds.length; i += 200) {
      const r = await supabase
        .from("content_reports").select("id", { count: "exact", head: true })
        .eq("status", "actioned").in("target_id", contentIds.slice(i, i + 200)).gte("created_at", since)
      if (r.error) throw new Error("report lookup failed")
      contentCount += r.count ?? 0
    }

    const total = (profileReports.count ?? 0) + contentCount
    return { ...base, passed: total === 0, detail: total === 0 ? "No upheld reports." : "A moderator upheld a report against your account or content in the last year." }
  } catch {
    return { ...base, passed: false, detail: "We couldn't check your report history." }
  }
}

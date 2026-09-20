/**
 * GET /api/community/recommended
 *
 * Community creators and channels personalised to the authenticated user,
 * from FIVE real signals — nothing here is invented, and nothing is cached,
 * so it changes the moment the underlying signal does:
 *
 *   1. Onboarding professions (creator_profiles) → community roles/categories
 *   2. The user's own community_profiles roles/style_tags/skills, when they've
 *      filled those in — covers users who set up a community profile but
 *      never did the separate onboarding flow
 *   3. Collaborative signal: creators followed by the people YOU follow
 *      ("people you may know"), weighted by how many of your follows follow
 *      them — this is what makes recommendations move when you follow/unfollow
 *   4. Engagement signal (Phase 5.3): creators whose feed posts you've liked
 *      or saved — a real, persisted interaction, not a guess
 *   5. Search signal (Phase 5.6): role/style terms the user actually searched
 *      for, read from the existing user_behavior log
 *
 * Excluded always: the user themself, creators they already follow, creators
 * they dismissed ("don't show me this again"), banned creators, and anyone
 * blocked or muted in either direction.
 *
 * Cold start: an account with none of these signals gets a clearly labelled
 * fallback (newest public creators) rather than an empty panel or a
 * fabricated "recommended for you" list — see `strategy` in the response.
 *
 * Auth: required.
 * Returns: { creators: (CommunityProfile & { matchPct: number; reason: string })[], channels: ChannelWithMeta[] }
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"
import { getHiddenUids }              from "@/lib/community/visibility"

export const runtime = "nodejs"

/* ── Profession → community role ids ──────────────────────────────── */
const PROFESSION_TO_ROLES: Record<string, string[]> = {
  "photographer":         ["photographer"],
  "videographer":         ["videographer", "cinematographer"],
  "filmmaker":            ["filmmaker", "color-grader", "cinematographer"],
  "cinematic-editor":     ["color-grader", "cinematographer", "lightroom-editor"],
  "street-photographer":  ["photographer"],
  "travel-creator":       ["photographer", "videographer"],
  "fashion-creator":      ["photographer", "retoucher"],
  "youtuber":             ["vlogger", "content-creator"],
  "reels-creator":        ["content-creator", "vlogger"],
  "mobile-photographer":  ["photographer"],
  "product-photographer": ["photographer", "retoucher"],
  "instagram-influencer": ["content-creator", "vlogger"],
  "lifestyle-creator":    ["content-creator", "photographer"],
  "food-creator":         ["photographer"],
  "beginner-editor":      ["lightroom-editor"],
  "content-creator":      ["content-creator"],
  "creative-agency":      ["content-creator", "preset-creator"],
  "social-media-manager": ["content-creator", "thumbnail-designer"],
  "blogger":              ["content-creator"],
  "model":                ["photographer"],
  "ad-maker":             ["cinematographer", "content-creator"],
}

/* ── Profession → channel category keywords ───────────────────────── */
const PROFESSION_TO_CATEGORIES: Record<string, string[]> = {
  "photographer":         ["Photography", "Lightroom", "Portrait"],
  "videographer":         ["Videography", "Editing", "Film"],
  "filmmaker":            ["Film", "Cinematography", "Color Grading"],
  "cinematic-editor":     ["Color Grading", "Editing", "Cinematography"],
  "street-photographer":  ["Photography", "Street", "Urban"],
  "travel-creator":       ["Travel", "Photography", "Videography"],
  "fashion-creator":      ["Fashion", "Photography", "Editorial"],
  "youtuber":             ["YouTube", "Content Creation", "Editing"],
  "reels-creator":        ["Reels", "Content Creation", "Instagram"],
  "mobile-photographer":  ["Photography", "Mobile"],
  "product-photographer": ["Photography", "Commercial"],
  "instagram-influencer": ["Instagram", "Content Creation", "Photography"],
  "lifestyle-creator":    ["Lifestyle", "Photography", "Content Creation"],
  "food-creator":         ["Food", "Photography"],
  "beginner-editor":      ["Lightroom", "Editing", "Photography"],
  "content-creator":      ["Content Creation", "Editing", "Instagram"],
  "creative-agency":      ["Commercial", "Editing", "Photography"],
  "social-media-manager": ["Content Creation", "Instagram", "YouTube"],
  "blogger":              ["Content Creation", "Photography"],
  "model":                ["Fashion", "Photography"],
  "ad-maker":             ["Commercial", "Film", "Editing"],
}

function professionToRoles(professions: string[]): string[] {
  const roles = new Set<string>()
  for (const p of professions) {
    for (const r of (PROFESSION_TO_ROLES[p] ?? [])) roles.add(r)
  }
  return [...roles]
}

function professionToCategories(professions: string[]): string[] {
  const cats = new Set<string>()
  for (const p of professions) {
    for (const c of (PROFESSION_TO_CATEGORIES[p] ?? [])) cats.add(c)
  }
  return [...cats]
}

function matchPct(userRoles: string[], creatorRoles: string[]): number {
  if (!userRoles.length || !creatorRoles.length) return 0
  const shared = creatorRoles.filter((r) => userRoles.includes(r)).length
  return Math.round((shared / Math.max(userRoles.length, creatorRoles.length)) * 100)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "8", 10)))

  const db = createAdminClient()

  /* Who the user already follows — used to exclude dupes and to compute the
     collaborative "people you may know" signal below. */
  const { data: followRows } = await db
    .from("creator_follows")
    .select("following_uid")
    .eq("follower_uid", uid)
  const alreadyFollowing = new Set((followRows ?? []).map((f) => f.following_uid))

  /* Creators the user explicitly dismissed, plus banned/blocked/muted ones.
     Recommending someone you already said no to is the fastest way to make
     recommendations feel fake. */
  const { data: dismissedRows } = await db
    .from("recommendation_dismissals")
    .select("target_id")
    .eq("firebase_uid", uid)
    .eq("target_type", "creator")
  const dismissed = new Set((dismissedRows ?? []).map((d) => d.target_id))

  const hiddenSet = await getHiddenUids(db, uid)
  /** Everyone who must never be recommended, for any reason. */
  const excluded = new Set<string>([...alreadyFollowing, ...dismissed, ...hiddenSet.uids, uid])

  /* 1a. Onboarding professions (creator_profiles) */
  const { data: creatorProfile } = await db
    .from("creator_profiles")
    .select("professions, goals, aesthetics")
    .eq("firebase_uid", uid)
    .maybeSingle()

  const professions: string[] = creatorProfile?.professions ?? []
  let userRoles      = professionToRoles(professions)
  const userCategories = professionToCategories(professions)

  /* 1b. The user's own community profile roles/style_tags/skills — covers
     someone who set up a community profile without doing onboarding. */
  const { data: ownProfile } = await db
    .from("community_profiles")
    .select("roles, style_tags, skills")
    .eq("firebase_uid", uid)
    .maybeSingle()

  const ownTags = [
    ...(ownProfile?.roles ?? []),
    ...(ownProfile?.style_tags ?? []),
  ]
  // Merge without duplicating — both signals feed the same match-% calc.
  userRoles = [...new Set([...userRoles, ...(ownProfile?.roles ?? [])])]

  /* 2a. Tag-matched creators (by overlapping roles/style_tags) */
  const tagMatches = new Map<string, { profile: Record<string, unknown>; matchPct: number }>()

  if (userRoles.length > 0 || ownTags.length > 0) {
    const orParts = [
      userRoles.length ? `roles.ov.{${userRoles.join(",")}}` : null,
      (ownProfile?.style_tags?.length ?? 0) > 0
        ? `style_tags.ov.{${ownProfile!.style_tags.join(",")}}`
        : null,
    ].filter(Boolean).join(",")

    if (orParts) {
      const { data: profileRows } = await db
        .from("community_profiles")
        .select("*")
        .eq("visibility", "public")
        .neq("firebase_uid", uid)
        .or(orParts)
        .order("reputation_score", { ascending: false })
        .limit(limit * 3)

      for (const p of profileRows ?? []) {
        if (excluded.has(p.firebase_uid as string)) continue
        const combined = [...(p.roles as string[] ?? []), ...(p.style_tags as string[] ?? [])]
        const pct = matchPct([...userRoles, ...ownTags], combined)
        tagMatches.set(p.firebase_uid as string, { profile: p, matchPct: pct })
      }
    }
  }

  /* 2b. Collaborative signal: who the people you follow, follow.
     This is the signal that changes the moment you follow/unfollow someone —
     satisfies "recommendations must update when follows change" directly. */
  const followingUids = [...alreadyFollowing]
  const collabCounts = new Map<string, number>()
  if (followingUids.length > 0) {
    const { data: secondDegree } = await db
      .from("creator_follows")
      .select("following_uid")
      .in("follower_uid", followingUids)

    for (const row of (secondDegree ?? []) as { following_uid: string }[]) {
      if (excluded.has(row.following_uid)) continue
      collabCounts.set(row.following_uid, (collabCounts.get(row.following_uid) ?? 0) + 1)
    }
  }

  /* Merge both signals: tag match % is the primary score; a collaborative
     hit boosts it (each mutual connection is worth 15 points, capped) so a
     creator who is both tag-matched AND followed by your network ranks
     highest — but a purely collaborative hit with no tag overlap still
     surfaces, which a tag-only algorithm would miss entirely. */
  const combinedScores = new Map<string, { profile: Record<string, unknown> | null; score: number; reason: string }>()

  for (const [fuid, { profile, matchPct: pct }] of tagMatches) {
    combinedScores.set(fuid, { profile, score: pct, reason: "shared interests" })
  }

  if (collabCounts.size > 0) {
    const missingUids = [...collabCounts.keys()].filter((u) => !tagMatches.has(u))
    let extraProfiles: Record<string, unknown>[] = []
    if (missingUids.length > 0) {
      const { data } = await db
        .from("community_profiles")
        .select("*")
        .eq("visibility", "public")
        .in("firebase_uid", missingUids)
      extraProfiles = data ?? []
    }
    const extraByUid = new Map(extraProfiles.map((p) => [p.firebase_uid as string, p]))

    for (const [fuid, mutuals] of collabCounts) {
      const boost = Math.min(45, mutuals * 15)
      const existing = combinedScores.get(fuid)
      if (existing) {
        existing.score = Math.min(100, existing.score + boost)
        existing.reason = "shared interests + followed by people you follow"
      } else {
        const profile = extraByUid.get(fuid)
        if (profile) {
          combinedScores.set(fuid, { profile, score: boost, reason: "followed by people you follow" })
        }
      }
    }
  }

  /* 4. Engagement signal: authors of feed posts the viewer liked or saved.
     Real, persisted actions — Discover/profile interactions feeding back
     into recommendations, per Phase 5.3. */
  const [likedPostsRes, savedPostsRes] = await Promise.all([
    db.from("post_reactions").select("post_id").eq("firebase_uid", uid),
    db.from("post_saves").select("post_id").eq("firebase_uid", uid),
  ])
  const engagedPostIds = [
    ...new Set([...(likedPostsRes.data ?? []), ...(savedPostsRes.data ?? [])].map((r) => r.post_id as string)),
  ]

  if (engagedPostIds.length > 0) {
    const { data: engagedPosts } = await db
      .from("channel_posts")
      .select("id, author_uid")
      .in("id", engagedPostIds)
      .is("channel_id", null)

    const engagementCounts = new Map<string, number>()
    for (const p of engagedPosts ?? []) {
      if (excluded.has(p.author_uid)) continue
      engagementCounts.set(p.author_uid, (engagementCounts.get(p.author_uid) ?? 0) + 1)
    }

    if (engagementCounts.size > 0) {
      const missingUids = [...engagementCounts.keys()].filter((u) => !combinedScores.has(u))
      let extraProfiles: Record<string, unknown>[] = []
      if (missingUids.length > 0) {
        const { data } = await db
          .from("community_profiles")
          .select("*")
          .eq("visibility", "public")
          .in("firebase_uid", missingUids)
        extraProfiles = data ?? []
      }
      const extraByUid = new Map(extraProfiles.map((p) => [p.firebase_uid as string, p]))

      for (const [fuid, engagements] of engagementCounts) {
        const boost = Math.min(35, engagements * 12)
        const existing = combinedScores.get(fuid)
        if (existing) {
          existing.score = Math.min(100, existing.score + boost)
          existing.reason += " + work you've engaged with"
        } else {
          const profile = extraByUid.get(fuid)
          if (profile) combinedScores.set(fuid, { profile, score: boost, reason: "you liked or saved their work" })
        }
      }
    }
  }

  /* 5. Search signal: role/style terms the user actually typed into Discover,
     read from the user_behavior log that already records them. A search is a
     stated intent — stronger than a guess, weaker than a follow. */
  const { data: searchRows } = await db
    .from("user_behavior")
    .select("metadata, created_at")
    .eq("firebase_uid", uid)
    .eq("event_type", "search")
    .order("created_at", { ascending: false })
    .limit(30)

  const searchedTerms = new Set<string>()
  for (const row of searchRows ?? []) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const term = typeof meta.query === "string" ? meta.query : typeof meta.q === "string" ? meta.q : null
    if (term) {
      for (const word of term.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2)) {
        searchedTerms.add(word)
      }
    }
  }

  if (searchedTerms.size > 0) {
    for (const entry of combinedScores.values()) {
      const profile = entry.profile as Record<string, unknown> | null
      if (!profile) continue
      const profileTerms = [
        ...((profile.roles as string[]) ?? []),
        ...((profile.style_tags as string[]) ?? []),
        ...((profile.skills as string[]) ?? []),
      ].map((t) => String(t).toLowerCase())
      const hits = profileTerms.filter((t) =>
        [...searchedTerms].some((term) => t.includes(term) || term.includes(t))
      ).length
      if (hits > 0) {
        entry.score = Math.min(100, entry.score + Math.min(20, hits * 10))
        entry.reason += " + matches what you searched for"
      }
    }
  }

  let strategy: "personalised" | "cold_start" = "personalised"

  let creators = [...combinedScores.values()]
    .filter((c) => c.profile !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => ({ ...(c.profile as Record<string, unknown>), matchPct: c.score, reason: c.reason }))

  /* Cold start: no profile tags, no follows, no engagement, no searches yet.
     Rather than an empty panel or a fake "recommended for you" list, fall back
     to the newest public creators and SAY that's what this is — the client
     labels the section differently when strategy is cold_start. */
  if (creators.length === 0) {
    strategy = "cold_start"
    const { data: newest } = await db
      .from("community_profiles")
      .select("*")
      .eq("visibility", "public")
      .eq("is_banned", false)
      .order("created_at", { ascending: false })
      .limit(limit + excluded.size)

    creators = (newest ?? [])
      .filter((p) => !excluded.has(p.firebase_uid))
      .slice(0, limit)
      .map((p) => ({
        ...(p as Record<string, unknown>),
        matchPct: 0,
        reason: "recently joined — not yet personalised to you",
      }))
  }

  /* 3. Fetch matching channels (by category) */
  let channels: Record<string, unknown>[] = []

  if (userCategories.length > 0) {
    // Build OR filter for each category (case-insensitive)
    const orFilter = userCategories
      .map((c) => `category.ilike.%${c}%`)
      .join(",")

    const { data: channelRows } = await db
      .from("community_channels")
      .select("*, member_count:community_channel_members(count)")
      .or(orFilter)
      .eq("visibility", "public")
      .order("is_featured", { ascending: false })
      .limit(limit)

    channels = channelRows ?? []
  }

  return NextResponse.json({ creators, channels, strategy })
}

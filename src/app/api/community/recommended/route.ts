/**
 * GET /api/community/recommended
 *
 * Returns community creators and channels personalised to the authenticated
 * user's onboarding profile (professions → community roles / channel categories).
 *
 * Auth: required.
 * Returns: { creators: (CommunityProfile & { matchPct: number })[], channels: ChannelWithMeta[] }
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"

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

  /* 1. Fetch user's creator profile */
  const { data: creatorProfile } = await db
    .from("creator_profiles")
    .select("professions, goals, aesthetics")
    .eq("firebase_uid", uid)
    .maybeSingle()

  if (!creatorProfile?.professions?.length) {
    return NextResponse.json({ creators: [], channels: [] })
  }

  const professions: string[] = creatorProfile.professions ?? []
  const userRoles      = professionToRoles(professions)
  const userCategories = professionToCategories(professions)

  /* 2. Fetch matching community creators (by overlapping roles) */
  let creators: (Record<string, unknown> & { matchPct: number })[] = []

  if (userRoles.length > 0) {
    const { data: profileRows } = await db
      .from("community_profiles")
      .select("*")
      .overlaps("roles", userRoles)
      .neq("firebase_uid", uid)   // exclude self
      .order("reputation_score", { ascending: false })
      .limit(limit * 2)           // over-fetch so we can sort by match %

    if (profileRows?.length) {
      creators = profileRows
        .map((p: Record<string, unknown>) => ({
          ...p,
          matchPct: matchPct(userRoles, (p.roles as string[]) ?? []),
        }))
        .sort((a, b) => b.matchPct - a.matchPct)
        .slice(0, limit)
    }
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

  return NextResponse.json({ creators, channels })
}

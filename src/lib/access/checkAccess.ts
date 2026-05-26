/**
 * src/lib/access/checkAccess.ts
 *
 * Centralised access control for PXL Creator.
 *
 * Plan hierarchy:
 *   free    → browse, blog, purchased presets only
 *   creator → + all premium presets, full courses, early access
 *   pro     → everything in creator + 1:1 sessions, custom requests
 *
 * All functions are server-side only (admin client, no RLS bypass needed).
 * Use in API Route Handlers and Server Components.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { PlanId }        from "@/lib/subscriptions/plans"

/* ── Active subscription row shape ───────────────────────── */
export interface ActiveSubscription {
  id:                   string
  plan_id:              PlanId
  billing_cycle:        "monthly" | "yearly"
  status:               string
  current_period_start: string
  current_period_end:   string
  amount_usd:           number
  amount_inr:           number
}

/* ── getUserPlan ──────────────────────────────────────────── */
/**
 * Returns the user's current plan ID ('creator' | 'pro') or null for free.
 * This is the primary function — everything else calls it.
 */
export async function getUserPlan(firebaseUid: string): Promise<PlanId | null> {
  if (!firebaseUid) return null

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("firebase_uid", firebaseUid)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!data?.plan_id) return null
    return (data.plan_id === "creator" || data.plan_id === "pro")
      ? data.plan_id
      : null
  } catch {
    return null
  }
}

/* ── hasPremiumAccess ─────────────────────────────────────── */
/**
 * True if the user has ANY active paid subscription (creator or pro).
 * Gates: premium presets, full courses, early access.
 */
export async function hasPremiumAccess(firebaseUid: string): Promise<boolean> {
  const plan = await getUserPlan(firebaseUid)
  return plan !== null
}

/* ── hasProAccess ─────────────────────────────────────────── */
/**
 * True only if the user has the Pro plan.
 * Gates: 1:1 sessions, custom preset requests, priority support.
 */
export async function hasProAccess(firebaseUid: string): Promise<boolean> {
  const plan = await getUserPlan(firebaseUid)
  return plan === "pro"
}

/* ── getActiveSubscription ────────────────────────────────── */
/**
 * Full subscription row for the billing dashboard.
 */
export async function getActiveSubscription(
  firebaseUid: string
): Promise<ActiveSubscription | null> {
  if (!firebaseUid) return null

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("subscriptions")
      .select("id, plan_id, billing_cycle, status, current_period_start, current_period_end, amount_usd, amount_inr")
      .eq("firebase_uid", firebaseUid)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    return data as ActiveSubscription | null
  } catch {
    return null
  }
}

/* ── hasPurchasedPreset ───────────────────────────────────── */
/**
 * True if the user paid for a specific preset (one-time purchase).
 */
export async function hasPurchasedPreset(
  firebaseUid: string,
  presetId:    string
): Promise<boolean> {
  if (!firebaseUid || !presetId) return false

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("order_items")
      .select(`
        id,
        orders!inner ( firebase_uid, status )
      `)
      .eq("preset_id", presetId)
      .eq("orders.firebase_uid", firebaseUid)
      .eq("orders.status", "paid")
      .limit(1)
      .single()

    return !!data
  } catch {
    return false
  }
}

/* ── getAccessSummary ─────────────────────────────────────── */
/**
 * Full access profile. Use when you need multiple checks in one place.
 */
export async function getAccessSummary(firebaseUid: string) {
  if (!firebaseUid) {
    return {
      plan:               null as PlanId | null,
      isPremium:          false,
      isPro:              false,
      purchasedPresetIds: [] as string[],
    }
  }

  try {
    const supabase = createAdminClient()

    const [subResult, purchasesResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("firebase_uid", firebaseUid)
        .eq("status", "active")
        .gt("current_period_end", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),

      supabase
        .from("order_items")
        .select(`preset_id, orders!inner ( firebase_uid, status )`)
        .eq("orders.firebase_uid", firebaseUid)
        .eq("orders.status", "paid"),
    ])

    const plan   = (subResult.data?.plan_id ?? null) as PlanId | null
    const isPro  = plan === "pro"

    return {
      plan,
      isPremium:          plan !== null,
      isPro,
      purchasedPresetIds: purchasesResult.data?.map((r) => r.preset_id) ?? [],
    }
  } catch {
    return { plan: null, isPremium: false, isPro: false, purchasedPresetIds: [] }
  }
}

/* ── getDownloadToken ─────────────────────────────────────── */
/**
 * Returns a valid download token for a preset, or null.
 */
export async function getDownloadToken(
  firebaseUid: string,
  presetSlug:  string
): Promise<string | null> {
  if (!firebaseUid || !presetSlug) return null

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("download_tokens")
      .select("token, expires_at, download_count, max_downloads")
      .eq("firebase_uid", firebaseUid)
      .eq("preset_slug", presetSlug)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!data) return null
    if (data.download_count >= data.max_downloads) return null
    return data.token
  } catch {
    return null
  }
}

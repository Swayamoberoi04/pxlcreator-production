/**
 * src/lib/subscriptions/plans.ts
 *
 * Single source of truth for PXL Creator subscription plans.
 *
 * Architecture:
 *   We use a RENEWABLE PAYMENT model rather than Razorpay's native
 *   subscription API. Why? Razorpay native subscriptions require
 *   e-NACH/UPI Autopay mandate — adds friction for users. Instead:
 *
 *   1. User pays a one-time Razorpay order for the plan duration
 *      (monthly = 30 days, yearly = 365 days).
 *   2. On verify, we create/extend a `subscriptions` row in Supabase
 *      with `current_period_end` set to now + duration.
 *   3. `hasPremiumAccess()` checks `status='active'` AND
 *      `current_period_end > now()` — so access auto-expires.
 *   4. Users get reminder emails before expiry (future: cron job).
 *
 * Required Supabase migration:
 *   Run `src/lib/subscriptions/migration.sql` before going live.
 */

import { USD_TO_INR } from "@/lib/currency/config"

/* ── Plan IDs ─────────────────────────────────────────────── */
export type PlanId        = "creator" | "pro"
export type BillingCycle  = "monthly" | "yearly"

/* ── Plan definition ──────────────────────────────────────── */
export interface PlanPrice {
  usd:        number   // price in USD
  inr:        number   // price in INR (pre-computed for display)
  paise:      number   // price in paise (INR × 100 — for Razorpay)
  durationMs: number   // subscription duration in milliseconds
}

export interface Plan {
  id:         PlanId
  name:       string
  tagline:    string
  featured:   boolean
  badge?:     string
  monthly:    PlanPrice
  yearly:     PlanPrice
  features:   PlanFeature[]
  cta:        string
}

export interface PlanFeature {
  label:     string
  included:  boolean
  highlight?: boolean   // draws extra attention (e.g., "1:1 session")
}

/* ── Duration constants ───────────────────────────────────── */
const MONTH_MS = 30  * 24 * 60 * 60 * 1000
const YEAR_MS  = 365 * 24 * 60 * 60 * 1000

/* ── Price builder ────────────────────────────────────────── */
function price(usd: number, durationMs: number): PlanPrice {
  const inr   = Math.round(usd * USD_TO_INR)
  const paise = inr * 100
  return { usd, inr, paise, durationMs }
}

/* ── Plan catalogue ───────────────────────────────────────── */
export const PLANS: Record<PlanId, Plan> = {
  creator: {
    id:       "creator",
    name:     "Creator",
    tagline:  "Everything you need to edit like a professional.",
    featured: true,
    badge:    "Most Popular",
    monthly:  price(19,  MONTH_MS),
    yearly:   price(179, YEAR_MS),
    cta:      "Start Creator Plan",
    features: [
      { label: "All preset packs — unlimited downloads",  included: true,  highlight: true  },
      { label: "Full course library",                     included: true,  highlight: true  },
      { label: "Early access to new drops",               included: true                   },
      { label: "Creator community (Discord)",             included: true                   },
      { label: "Read all blog articles",                  included: true                   },
      { label: "Monthly 1:1 feedback session",            included: false                  },
      { label: "Custom preset requests",                  included: false                  },
      { label: "Priority support",                        included: false                  },
    ],
  },

  pro: {
    id:       "pro",
    name:     "Pro",
    tagline:  "For serious creators who want direct mentorship.",
    featured: false,
    monthly:  price(39,  MONTH_MS),
    yearly:   price(349, YEAR_MS),
    cta:      "Start Pro Plan",
    features: [
      { label: "All preset packs — unlimited downloads",  included: true,  highlight: true  },
      { label: "Full course library",                     included: true,  highlight: true  },
      { label: "Early access to new drops",               included: true                   },
      { label: "Creator community (Discord)",             included: true                   },
      { label: "Read all blog articles",                  included: true                   },
      { label: "Monthly 1:1 feedback session",            included: true,  highlight: true  },
      { label: "Custom preset requests",                  included: true,  highlight: true  },
      { label: "Priority support",                        included: true                   },
    ],
  },
}

export const PLAN_LIST = Object.values(PLANS)

/* ── Savings calculation ──────────────────────────────────── */
export function yearlySavingsUsd(plan: Plan): number {
  return plan.monthly.usd * 12 - plan.yearly.usd
}

export function yearlySavingsPct(plan: Plan): number {
  return Math.round((1 - plan.yearly.usd / (plan.monthly.usd * 12)) * 100)
}

/* ── Plan lookup (validates string from DB/URL) ───────────── */
export function isPlanId(value: string): value is PlanId {
  return value === "creator" || value === "pro"
}

export function getPlan(planId: string): Plan | null {
  if (!isPlanId(planId)) return null
  return PLANS[planId]
}

export function getPlanPrice(planId: PlanId, cycle: BillingCycle): PlanPrice {
  return PLANS[planId][cycle]
}

/**
 * src/types/monetization.ts — creator seller onboarding (Phase 5.10.2).
 *
 * Column types come from migration 054 via src/types/database.ts; these are
 * the API shapes built on top of them.
 */

import type { Database, SellerAccountStatus } from "@/types/database"

export type { SellerAccountStatus, SellerPayoutStatus, PresetReviewStatus, OrderItemType } from "@/types/database"

export type SellerAccountRow = Database["public"]["Tables"]["creator_seller_accounts"]["Row"]

export type EligibilityCheckId =
  | "email_verified"
  | "account_age"
  | "public_profile"
  | "not_banned"
  | "no_upheld_reports"
  | "has_showcase"

export interface EligibilityCheck {
  id: EligibilityCheckId
  label: string
  passed: boolean
  /** Human-readable reason, safe to show to the applicant. */
  detail: string
}

export interface EligibilityResult {
  eligible: boolean
  checks: EligibilityCheck[]
  evaluated_at: string
}

/** What the applicant sees about their own account. Never includes reviewer identity. */
export interface SellerAccountForApplicant {
  status: SellerAccountStatus
  applied_at: string
  reviewed_at: string | null
  /** Shown only for rejected/suspended, so the applicant knows why. */
  review_note: string | null
  payout_status: "not_enabled"
  /** When a rejected applicant may apply again (ISO), or null. */
  can_reapply_at: string | null
  /** Server-computed: may this applicant submit (again) right now? */
  can_apply_now: boolean
}

export interface SellerStatusResponse {
  account: SellerAccountForApplicant | null
  eligibility: EligibilityResult
}

export type SellerAdminAction = "approve" | "reject" | "suspend" | "reinstate"

export interface SellerAdminRow extends SellerAccountRow {
  profile: { username: string; display_name: string | null; avatar_url: string | null; is_banned: boolean } | null
  eligibility: EligibilityResult
}

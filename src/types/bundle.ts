/**
 * src/types/bundle.ts
 *
 * Bundle type system for PXL Creator's premium bundle marketplace.
 *
 * A Bundle extends Preset so it works with the existing cart/checkout
 * system without any changes — cart treats bundles as any other Preset
 * with category "Bundle".
 *
 * The extra fields here are purely for premium display:
 * value comparison, included packs list, marketing copy, etc.
 */

import type { Preset } from "@/types/product"

/* ── Bundle badge chips ──────────────────────────────────── */
export type BundleBadgeLabel =
  | "BESTSELLER"
  | "MOST POPULAR"
  | "CREATOR FAVORITE"
  | "PRO LEVEL"
  | "TRENDING"
  | "BEST VALUE"
  | "LIMITED"
  | "NEW"

/* ── A single item described inside a bundle ─────────────── */
export interface BundleIncludedPack {
  name:         string    // Pack display name
  presetCount:  number    // How many presets in this pack
  category:     string    // Category label
  description:  string    // One-line description of what this pack does
  icon:         string    // Emoji for visual identity
  slug?:        string    // Real preset slug → /presets/:slug (must exist in catalogue)
  priceUsd?:    number    // Individual pack price in USD (0 = included free)
}

/* ── Use case tags ───────────────────────────────────────── */
export type UseCaseTag =
  | "Instagram"
  | "Reels"
  | "YouTube"
  | "Travel"
  | "Portraits"
  | "Street"
  | "Landscapes"
  | "Film Look"
  | "Lifestyle"
  | "Content Creation"
  | "Weddings"
  | "Night Photography"
  | "Fashion"
  | "Drone"

/* ── The Bundle type (extends Preset for cart compatibility) */
export interface Bundle extends Preset {
  /* Always "Bundle" */
  category: "Bundle"

  /* Bundle badge displayed on the card */
  bundleBadge:        BundleBadgeLabel

  /* Value comparison — what it would cost to buy individually */
  individualValueUsd: number   // sum of included packs' individual prices in USD

  /* List of preset packs inside this bundle (display only) */
  includedPacks:      BundleIncludedPack[]

  /* Marketing copy */
  whyCreatorsLoveIt:  string   // 2-3 sentence pitch paragraph
  targetAudience:     string[] // ["Beginners", "YouTubers", "Travel creators", ...]
  useCases:           UseCaseTag[]
}

/* ── Computed bundle savings ─────────────────────────────── */
export interface BundlePricingDisplay {
  priceUsd:             number    // bundle price in USD
  priceInr:             number    // bundle price in INR
  individualValueUsd:   number    // individual price in USD
  individualValueInr:   number    // individual price in INR
  savingsPercent:       number    // how much you save (%)
  savingsInr:           number    // INR amount saved
}

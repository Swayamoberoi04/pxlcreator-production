/**
 * src/types/product.ts
 *
 * Core product types for PXL Creator's preset marketplace.
 *
 * Pricing architecture (USD base, INR displayed via formatPrice):
 *   Free    →  $0   (lead magnets, trust-builders, community gifts)
 *   Entry   →  $5   (simple packs, low-friction first purchase)
 *   Mid     →  $12–15 (established category packs)
 *   Premium →  $18–24 (hero cinematic / film / street packs)
 *   Pro     →  $29–39 (large multi-style packs)
 *
 * Subscription framing: Creator plan at $19/mo gives access to ALL presets —
 * so mid/premium individual purchases naturally funnel toward the subscription.
 */

export interface Preset {
  id:             string
  slug:           string
  name:           string
  tagline:        string
  price:          number
  originalPrice?: number       // set when on sale

  category:       PresetCategory
  rating:         number        // 0–5
  reviewCount:    number

  /* ── Badges ── */
  badge?:          PresetBadge
  conversionTag?:  ConversionTag   // overlay chip for conversion psychology
  priceTier?:      PriceTier       // optional explicit tier label

  isFeatured:  boolean
  isFree?:     boolean          // free download (auth required)

  /* ── Media ── */
  thumbnailUrl?: string         // main card image  (public/presets/…)
  images?:       string[]       // gallery images   (public/presets/…)
  beforeUrl?:    string         // before/after comparison — before
  afterUrl?:     string         // before/after comparison — after

  /* ── Detail page fields ── */
  description?:      string
  features?:         string[]
  compatibility?:    string[]
  includeCount?:     number
  downloadFileName?: string     // stub filename shown after purchase

  /* ── AI Studio matching ── */
  aiTags?: string[]

  /* ── SEO & editorial enrichment ── */
  hook?:                   string   // one-line attention hook (max 15 words)
  seoTitle?:               string   // <title> / og:title for the detail page
  seoDescription?:         string   // meta description (max 80 words)
  bestUseCase?:            string   // short phrase — ideal subject / genre
  idealLighting?:          string   // lighting conditions this preset excels in
  beforeAfterExplanation?: string   // caption for the before/after slider (max 40 words)
}

/* ── Category ───────────────────────────────────────────── */
export type PresetCategory =
  | "Cinematic"
  | "Film Emulation"
  | "Portrait"
  | "Landscape"
  | "Street"
  | "Bundle"

/* ── Badges ─────────────────────────────────────────────── */
export type PresetBadge =
  | "New"
  | "Best Seller"
  | "Sale"
  | "Free"
  | "Popular"
  | "Creator Pick"
  | "Trending"

/* ── Conversion tags ─────────────────────────────────────── */
export type ConversionTag =
  | "MOST POPULAR"
  | "BEST VALUE"
  | "CREATOR FAVORITE"
  | "PRO EDITOR PICK"
  | "BEGINNER FRIENDLY"
  | "COMMUNITY FAVORITE"
  | "FREE STARTER"
  | "TRENDING"

/* ── Price tier ──────────────────────────────────────────── */
export type PriceTier = "free" | "entry" | "mid" | "premium" | "pro"

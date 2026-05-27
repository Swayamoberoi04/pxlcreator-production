/**
 * src/lib/recommendations/engine.ts
 *
 * Intelligent, weighted recommendation engine for PXL Creator.
 *
 * Architecture:
 *   Each user input (profession, goal, aesthetic, skill, platform)
 *   contributes affinity weights to a set of creative categories.
 *   The resulting CategoryAffinities vector drives all recommendations.
 *
 * No hardcoded item → user mappings. Instead:
 *   1. Inputs → category affinities (weighted scoring)
 *   2. Affinities → ranked recommendation catalogue
 *   3. Catalogue items carry their own category weights
 *   4. Score = dot-product(user_affinities, item_affinities)
 *
 * This produces emergent, non-obvious recommendations:
 *   A travel creator who loves film emulation gets different
 *   presets than a travel creator who loves minimal clean.
 */

import type {
  CategoryAffinities,
  OnboardingAnswers,
  ProfessionId,
  GoalId,
  AestheticId,
  SkillLevelId,
  PlatformId,
  RecommendationItem,
  PersonalizedSection,
} from "@/types/onboarding"

/* ── Weight maps — each input adds to category scores ─────── */

type PartialAffinities = Partial<CategoryAffinities>

const PROFESSION_WEIGHTS: Record<ProfessionId, PartialAffinities> = {
  "instagram-influencer":  { portrait: 0.8, minimal: 0.7, fashion: 0.6, mobile: 0.4 },
  "photographer":          { portrait: 0.7, street: 0.5, travel: 0.5, cinematic: 0.5, film: 0.4 },
  "videographer":          { cinematic: 0.9, commercial: 0.7, dark_luxury: 0.4 },
  "travel-creator":        { travel: 0.9, cinematic: 0.7, nature: 0.7, film: 0.4 },
  "fashion-creator":       { fashion: 0.9, editorial: 0.8, minimal: 0.6, portrait: 0.5 },
  "cinematic-editor":      { cinematic: 0.9, film: 0.8, dark_luxury: 0.7 },
  "street-photographer":   { street: 0.9, urban: 0.8, film: 0.6, cinematic: 0.5 },
  "youtuber":              { cinematic: 0.7, commercial: 0.6, minimal: 0.3 },
  "reels-creator":         { mobile: 0.8, fashion: 0.5, minimal: 0.5, portrait: 0.4 },
  "mobile-photographer":   { mobile: 0.9, minimal: 0.5, travel: 0.4 },
  "filmmaker":             { cinematic: 0.9, film: 0.8, dark_luxury: 0.7, commercial: 0.6 },
  "product-photographer":  { commercial: 0.8, minimal: 0.7, editorial: 0.6 },
  "blogger":               { travel: 0.6, minimal: 0.6, vintage: 0.4, nature: 0.3 },
  "model":                 { portrait: 0.9, fashion: 0.8, editorial: 0.7 },
  "ad-maker":              { commercial: 0.9, cinematic: 0.7, editorial: 0.5 },
  "beginner-editor":       { minimal: 0.5, portrait: 0.3 },
  "content-creator":       { minimal: 0.5, fashion: 0.4, mobile: 0.5 },
  "lifestyle-creator":     { minimal: 0.6, portrait: 0.5, travel: 0.4 },
  "food-creator":          { food: 0.9, minimal: 0.5, vintage: 0.3 },
  "creative-agency":       { commercial: 0.8, editorial: 0.7, cinematic: 0.5 },
  "social-media-manager":  { minimal: 0.6, fashion: 0.4, mobile: 0.5 },
}

const GOAL_WEIGHTS: Record<GoalId, PartialAffinities> = {
  "grow-instagram":     { portrait: 0.6, minimal: 0.7, fashion: 0.5, mobile: 0.5 },
  "cinematic-edits":    { cinematic: 0.9, film: 0.7, dark_luxury: 0.5 },
  "portfolio":          { cinematic: 0.5, editorial: 0.6, street: 0.4, portrait: 0.4 },
  "brand-deals":        { commercial: 0.8, editorial: 0.6, fashion: 0.5 },
  "color-grading":      { cinematic: 0.8, film: 0.7, dark_luxury: 0.4 },
  "learn-lightroom":    { minimal: 0.4, portrait: 0.4 },
  "viral-reels":        { mobile: 0.8, minimal: 0.4, fashion: 0.5 },
  "creator-business":   { commercial: 0.7, editorial: 0.5, minimal: 0.4 },
  "storytelling":       { cinematic: 0.8, film: 0.6, travel: 0.5, nature: 0.4 },
  "luxury-visuals":     { dark_luxury: 0.9, editorial: 0.7, fashion: 0.6 },
}

const AESTHETIC_WEIGHTS: Record<AestheticId, PartialAffinities> = {
  "moody-cinematic":   { cinematic: 0.9, dark_luxury: 0.6, film: 0.5, street: 0.3 },
  "film-emulation":    { film: 0.9, vintage: 0.7, cinematic: 0.5 },
  "hdr-dramatic":      { cinematic: 0.7, dark_luxury: 0.5, urban: 0.4 },
  "minimal-clean":     { minimal: 0.9, editorial: 0.5, fashion: 0.3 },
  "vintage-retro":     { vintage: 0.9, film: 0.6, travel: 0.4 },
  "dark-luxury":       { dark_luxury: 0.9, editorial: 0.7, fashion: 0.5 },
  "warm-golden-hour":  { travel: 0.7, nature: 0.8, portrait: 0.5 },
  "street-cyberpunk":  { street: 0.9, urban: 0.8, cinematic: 0.5 },
  "bright-influencer": { portrait: 0.8, minimal: 0.5, fashion: 0.6, mobile: 0.5 },
  "matte-beige":       { minimal: 0.8, fashion: 0.6, portrait: 0.5 },
  "black-white":       { street: 0.6, editorial: 0.7, portrait: 0.5, film: 0.5 },
  "travel-cinematic":  { travel: 0.9, cinematic: 0.7, nature: 0.6 },
  "neon-night":        { urban: 0.9, street: 0.8, cinematic: 0.5 },
  "editorial-fashion": { editorial: 0.9, fashion: 0.8, dark_luxury: 0.5 },
}

const SKILL_MULTIPLIERS: Record<SkillLevelId, number> = {
  beginner:     0.6,
  intermediate: 0.8,
  advanced:     1.0,
  professional: 1.0,
}

const PLATFORM_WEIGHTS: Record<PlatformId, PartialAffinities> = {
  "instagram":      { portrait: 0.5, minimal: 0.4, fashion: 0.3 },
  "youtube":        { cinematic: 0.5, commercial: 0.3 },
  "tiktok":         { mobile: 0.8, minimal: 0.3 },
  "portfolio":      { editorial: 0.6, cinematic: 0.4 },
  "client-work":    { commercial: 0.7, editorial: 0.5 },
  "personal-hobby": { film: 0.3, nature: 0.3, travel: 0.3 },
}

/* ── Scoring engine ─────────────────────────────────────────── */

function zero(): CategoryAffinities {
  return {
    cinematic: 0, portrait: 0, street: 0, travel: 0, editorial: 0,
    minimal: 0, film: 0, dark_luxury: 0, commercial: 0, mobile: 0,
    vintage: 0, nature: 0, urban: 0, fashion: 0, food: 0,
  }
}

function addWeights(
  acc:     CategoryAffinities,
  weights: PartialAffinities,
  factor:  number = 1,
): void {
  for (const key of Object.keys(weights) as (keyof CategoryAffinities)[]) {
    acc[key] += (weights[key] ?? 0) * factor
  }
}

function normalise(aff: CategoryAffinities): CategoryAffinities {
  const max = Math.max(...Object.values(aff))
  if (max <= 0) return aff
  const result = zero()
  for (const key of Object.keys(aff) as (keyof CategoryAffinities)[]) {
    result[key] = aff[key] / max
  }
  return result
}

export function computeAffinities(answers: OnboardingAnswers): CategoryAffinities {
  const aff = zero()
  const skillMultiplier = SKILL_MULTIPLIERS[answers.skillLevel] ?? 0.8

  /* Profession — each selected adds full weight */
  const profWeight = 1 / Math.max(answers.professions.length, 1)
  for (const p of answers.professions) {
    addWeights(aff, PROFESSION_WEIGHTS[p] ?? {}, profWeight)
  }

  /* Goals — additive, normalised by count */
  const goalWeight = 1 / Math.max(answers.goals.length, 1)
  for (const g of answers.goals) {
    addWeights(aff, GOAL_WEIGHTS[g] ?? {}, goalWeight * 0.8)
  }

  /* Aesthetics — strong signal */
  const aesWeight = 1 / Math.max(answers.aesthetics.length, 1)
  for (const a of answers.aesthetics) {
    addWeights(aff, AESTHETIC_WEIGHTS[a] ?? {}, aesWeight * 1.2)
  }

  /* Platforms */
  const platWeight = 1 / Math.max(answers.platforms.length, 1)
  for (const pl of answers.platforms) {
    addWeights(aff, PLATFORM_WEIGHTS[pl] ?? {}, platWeight * 0.5)
  }

  /* Skill scales overall confidence */
  for (const key of Object.keys(aff) as (keyof CategoryAffinities)[]) {
    aff[key] *= skillMultiplier
  }

  return normalise(aff)
}

/* ── Recommendation catalogue ────────────────────────────────
   Items carry their own affinity weights.
   Score = dot-product(user_affinities, item_affinities).
   This means no direct mapping needed — items self-select by match.
──────────────────────────────────────────────────────────── */

const CATALOGUE: RecommendationItem[] = [
  /* ── Preset Bundles ── */
  {
    id: "moody-cinematic-bundle",
    type: "preset-bundle",
    title: "Moody Cinematic Bundle",
    description: "35 presets for cinematic dark narratives. Deep shadows, rich midtones.",
    tags: ["cinematic", "dark", "storytelling"],
    score: 0,
    href: "/store?bundle=moody-cinematic",
    badge: "BESTSELLER",
    isPremium: false,
    categories: { cinematic: 0.9, dark_luxury: 0.7, film: 0.5 },
  },
  {
    id: "golden-travel-pack",
    type: "preset-bundle",
    title: "Golden Travel Pack",
    description: "Warm, airy travel presets for landscapes and adventure photography.",
    tags: ["travel", "golden", "warm"],
    score: 0,
    href: "/store?bundle=golden-travel",
    categories: { travel: 0.9, nature: 0.8, vintage: 0.3 },
  },
  {
    id: "film-grain-authentic",
    type: "preset-bundle",
    title: "Film Grain Authentic",
    description: "Emulates classic film stocks — Portra, Tri-X, Kodachrome.",
    tags: ["film", "grain", "vintage", "analog"],
    score: 0,
    href: "/store?bundle=film-grain",
    categories: { film: 0.9, vintage: 0.8, cinematic: 0.4 },
  },
  {
    id: "portrait-skin-luxury",
    type: "preset-bundle",
    title: "Portrait Skin Luxury",
    description: "Flawless skin tones, editorial softness. For portraits that sell.",
    tags: ["portrait", "skin", "editorial"],
    score: 0,
    href: "/store?bundle=portrait-luxury",
    isPremium: true,
    categories: { portrait: 0.9, fashion: 0.6, editorial: 0.5, minimal: 0.3 },
  },
  {
    id: "dark-editorial-noir",
    type: "preset-bundle",
    title: "Dark Editorial Noir",
    description: "High-contrast, luxury fashion editorial. For the bold and dramatic.",
    tags: ["editorial", "dark", "luxury", "fashion"],
    score: 0,
    href: "/store?bundle=dark-editorial",
    badge: "NEW",
    categories: { dark_luxury: 0.9, editorial: 0.8, fashion: 0.7 },
  },
  {
    id: "minimal-clean-white",
    type: "preset-bundle",
    title: "Minimal Clean White",
    description: "Bright, airy, modern. Perfect for Instagram grids and product shots.",
    tags: ["minimal", "clean", "bright", "product"],
    score: 0,
    href: "/store?bundle=minimal-clean",
    categories: { minimal: 0.9, commercial: 0.4, fashion: 0.3 },
  },
  {
    id: "street-urban-grit",
    type: "preset-bundle",
    title: "Street Urban Grit",
    description: "Raw, textured street photography looks. Desaturated with lifted blacks.",
    tags: ["street", "urban", "gritty"],
    score: 0,
    href: "/store?bundle=street-urban",
    categories: { street: 0.9, urban: 0.8, film: 0.4 },
  },
  {
    id: "mobile-creator-pack",
    type: "preset-bundle",
    title: "Mobile Creator Pack",
    description: "Optimised for iPhone & Android. Consistent, social-ready edits.",
    tags: ["mobile", "social", "quick"],
    score: 0,
    href: "/store?bundle=mobile-creator",
    badge: "TRENDING",
    categories: { mobile: 0.9, minimal: 0.5, portrait: 0.3 },
  },
  {
    id: "food-lifestyle-warm",
    type: "preset-bundle",
    title: "Food & Lifestyle Warm",
    description: "Mouthwatering warm tones for food, cafe, and lifestyle content.",
    tags: ["food", "warm", "lifestyle"],
    score: 0,
    href: "/store?bundle=food-lifestyle",
    categories: { food: 0.9, minimal: 0.4, vintage: 0.3 },
  },
  {
    id: "commercial-pro-suite",
    type: "preset-bundle",
    title: "Commercial Pro Suite",
    description: "Professional, consistent colour for brand and ad photography.",
    tags: ["commercial", "brand", "consistent"],
    score: 0,
    href: "/store?bundle=commercial-pro",
    isPremium: true,
    categories: { commercial: 0.9, editorial: 0.6, minimal: 0.4 },
  },

  /* ── LUT Packs ── */
  {
    id: "cinema-lut-pack",
    type: "lut-pack",
    title: "Cinema Grade LUT Pack",
    description: "35mm cinema-inspired LUTs. Hollywood colour science for your videos.",
    tags: ["cinema", "lut", "video", "color"],
    score: 0,
    href: "/store?lut=cinema-grade",
    categories: { cinematic: 0.9, film: 0.7, dark_luxury: 0.4 },
  },
  {
    id: "travel-documentary-luts",
    type: "lut-pack",
    title: "Travel Documentary LUTs",
    description: "National Geographic-inspired warm documentary grades.",
    tags: ["travel", "documentary", "warm"],
    score: 0,
    href: "/store?lut=travel-documentary",
    categories: { travel: 0.8, nature: 0.7, cinematic: 0.4 },
  },
  {
    id: "fashion-editorial-luts",
    type: "lut-pack",
    title: "Fashion Editorial LUTs",
    description: "Magazine-quality colour grades for fashion film and photography.",
    tags: ["fashion", "editorial", "magazine"],
    score: 0,
    href: "/store?lut=fashion-editorial",
    isPremium: true,
    categories: { fashion: 0.9, editorial: 0.8, dark_luxury: 0.5 },
  },

  /* ── Tutorials ── */
  {
    id: "lightroom-mastery",
    type: "tutorial",
    title: "Lightroom Mastery — Zero to Pro",
    description: "The complete Lightroom workflow course. From import to export.",
    tags: ["lightroom", "tutorial", "beginner"],
    score: 0,
    href: "/courses/lightroom-mastery",
    categories: { minimal: 0.4, portrait: 0.3, cinematic: 0.3 },
  },
  {
    id: "cinematic-color-grading",
    type: "tutorial",
    title: "Cinematic Color Grading Masterclass",
    description: "Advanced colour theory, HSL masking, film looks from scratch.",
    tags: ["color", "cinematic", "advanced"],
    score: 0,
    href: "/courses/color-grading",
    isPremium: true,
    categories: { cinematic: 0.9, film: 0.7, dark_luxury: 0.5 },
  },
  {
    id: "instagram-aesthetic-guide",
    type: "tutorial",
    title: "Build a Viral Instagram Aesthetic",
    description: "Grid planning, consistent colour, presets for Reels and Stories.",
    tags: ["instagram", "aesthetic", "social"],
    score: 0,
    href: "/blog/instagram-aesthetic-guide",
    categories: { minimal: 0.7, portrait: 0.5, mobile: 0.6, fashion: 0.4 },
  },
  {
    id: "street-photography-edit",
    type: "tutorial",
    title: "Street Photography Editing Workflow",
    description: "Black & white conversion, grain, contrast pulls for street work.",
    tags: ["street", "bw", "editing"],
    score: 0,
    href: "/blog/street-photography-editing",
    categories: { street: 0.9, urban: 0.7, film: 0.5 },
  },
  {
    id: "commercial-retouching",
    type: "tutorial",
    title: "Commercial Retouching for Brands",
    description: "Industry workflows for product, fashion, and advertising images.",
    tags: ["commercial", "retouching", "brand"],
    score: 0,
    href: "/courses/commercial-retouching",
    isPremium: true,
    categories: { commercial: 0.9, editorial: 0.6, fashion: 0.5 },
  },
  {
    id: "mobile-editing-pro",
    type: "tutorial",
    title: "Mobile Editing Pro — iPhone Workflow",
    description: "Edit stunning photos entirely on mobile. Lightroom Mobile deep dive.",
    tags: ["mobile", "iphone", "lightroom"],
    score: 0,
    href: "/courses/mobile-editing",
    categories: { mobile: 0.9, minimal: 0.4 },
  },

  /* ── Challenges ── */
  {
    id: "30-day-cinematic",
    type: "challenge",
    title: "30-Day Cinematic Challenge",
    description: "Daily prompts to build your cinematic editing skills from scratch.",
    tags: ["challenge", "cinematic", "daily"],
    score: 0,
    href: "/community/challenges/30-day-cinematic",
    categories: { cinematic: 0.7, film: 0.5 },
  },
  {
    id: "aesthetic-portrait-week",
    type: "challenge",
    title: "Aesthetic Portrait Week",
    description: "7 days. 7 different portrait styles. Build your signature look.",
    tags: ["portrait", "challenge", "aesthetic"],
    score: 0,
    href: "/community/challenges/portrait-week",
    categories: { portrait: 0.8, fashion: 0.5, editorial: 0.4 },
  },
  {
    id: "travel-photo-sprint",
    type: "challenge",
    title: "Travel Photo Sprint",
    description: "Document a journey in 10 images. Master travel storytelling.",
    tags: ["travel", "challenge", "storytelling"],
    score: 0,
    href: "/community/challenges/travel-sprint",
    categories: { travel: 0.9, nature: 0.6, cinematic: 0.4 },
  },

  /* ── Pathways ── */
  {
    id: "brand-deal-pathway",
    type: "pathway",
    title: "Land Your First Brand Deal",
    description: "Strategy + aesthetic + pitch. The full creator business path.",
    tags: ["brand", "monetisation", "influencer"],
    score: 0,
    href: "/premium/pathways/brand-deals",
    isPremium: true,
    categories: { commercial: 0.7, fashion: 0.5, editorial: 0.4, minimal: 0.4 },
  },
  {
    id: "cinematic-filmmaker-path",
    type: "pathway",
    title: "Cinematic Filmmaker Path",
    description: "From preset to production. Build your visual brand as a filmmaker.",
    tags: ["filmmaker", "cinematic", "production"],
    score: 0,
    href: "/premium/pathways/filmmaker",
    isPremium: true,
    categories: { cinematic: 0.9, film: 0.8, dark_luxury: 0.5, commercial: 0.4 },
  },
  {
    id: "instagram-growth-path",
    type: "pathway",
    title: "Instagram Aesthetic Growth Path",
    description: "Build a cohesive grid, grow followers, monetise your aesthetic.",
    tags: ["instagram", "growth", "aesthetic"],
    score: 0,
    href: "/premium/pathways/instagram-growth",
    isPremium: true,
    categories: { minimal: 0.7, portrait: 0.6, mobile: 0.7, fashion: 0.5 },
  },

  /* ── Monetisation ideas ── */
  {
    id: "preset-selling-guide",
    type: "monetization",
    title: "Sell Your Own Presets",
    description: "How to package, price, and sell your editing style as a product.",
    tags: ["monetisation", "presets", "business"],
    score: 0,
    href: "/blog/sell-presets-guide",
    categories: { commercial: 0.5, minimal: 0.4 },
  },
  {
    id: "client-photography-guide",
    type: "monetization",
    title: "Build a Client Photography Business",
    description: "Pricing, workflow, client management for professional photographers.",
    tags: ["clients", "business", "photography"],
    score: 0,
    href: "/blog/photography-business",
    isPremium: true,
    categories: { commercial: 0.8, portrait: 0.5, editorial: 0.4 },
  },
]

/* ── Dot-product scoring ────────────────────────────────────── */

function dotScore(user: CategoryAffinities, item: Partial<CategoryAffinities>): number {
  let score = 0
  for (const key of Object.keys(item) as (keyof CategoryAffinities)[]) {
    score += (user[key] ?? 0) * (item[key] ?? 0)
  }
  return Math.min(100, Math.round(score * 100))
}

/* ── Public API ─────────────────────────────────────────────── */

export interface RankedRecommendations {
  all:        RecommendationItem[]
  byType:     Partial<Record<RecommendationItem["type"], RecommendationItem[]>>
  sections:   PersonalizedSection[]
}

export function generateRecommendations(
  affinities: CategoryAffinities,
  answers:    OnboardingAnswers,
): RankedRecommendations {
  /* Score every catalogue item */
  const scored: RecommendationItem[] = CATALOGUE.map((item) => ({
    ...item,
    score: dotScore(affinities, item.categories),
  }))

  /* Sort by score descending */
  const all = scored
    .filter((i) => i.score > 5)
    .sort((a, b) => b.score - a.score)

  /* Group by type */
  const byType: Partial<Record<RecommendationItem["type"], RecommendationItem[]>> = {}
  for (const item of all) {
    if (!byType[item.type]) byType[item.type] = []
    byType[item.type]!.push(item)
  }

  /* Build personalised sections — dynamic headlines based on top affinity */
  const topAffinities = Object.entries(affinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k)

  const sections = buildSections(all, byType, affinities, answers, topAffinities)

  return { all, byType, sections }
}

function buildSections(
  all:          RecommendationItem[],
  byType:       Partial<Record<RecommendationItem["type"], RecommendationItem[]>>,
  affinities:   CategoryAffinities,
  answers:      OnboardingAnswers,
  topCategories: string[],
): PersonalizedSection[] {
  const sections: PersonalizedSection[] = []

  const top1 = topCategories[0] ?? "cinematic"

  /* Section 1: Top preset bundles */
  const bundles = (byType["preset-bundle"] ?? []).slice(0, 4)
  if (bundles.length > 0) {
    sections.push({
      id: "preset-bundles",
      headline:    `For Your ${label(top1)} Aesthetic`,
      subheadline: "Preset bundles matched to your visual style and editing goals",
      items: bundles,
    })
  }

  /* Section 2: Learning path — tutorials + courses */
  const learning = [
    ...(byType["tutorial"] ?? []),
    ...(byType["course"] ?? []),
  ].sort((a, b) => b.score - a.score).slice(0, 4)
  if (learning.length > 0) {
    sections.push({
      id: "learning",
      headline:    answers.skillLevel === "beginner" ? "Start Your Journey" : "Level Up Your Craft",
      subheadline: "Tutorials and courses chosen for your skill level and goals",
      items: learning,
    })
  }

  /* Section 3: LUT packs for video creators */
  const luts = (byType["lut-pack"] ?? []).slice(0, 3)
  if (luts.length > 0 && (affinities.cinematic > 0.4 || affinities.commercial > 0.4)) {
    sections.push({
      id: "luts",
      headline: "Cinema-Grade Colour",
      subheadline: "Professional LUTs for your video and film work",
      items: luts,
    })
  }

  /* Section 4: Challenges */
  const challenges = (byType["challenge"] ?? []).slice(0, 3)
  if (challenges.length > 0) {
    sections.push({
      id: "challenges",
      headline: "Challenges For You",
      subheadline: "Build skills through daily creative prompts",
      items: challenges,
    })
  }

  /* Section 5: Pathways + monetization */
  const growth = [
    ...(byType["pathway"] ?? []),
    ...(byType["monetization"] ?? []),
  ].sort((a, b) => b.score - a.score).slice(0, 3)
  if (growth.length > 0) {
    sections.push({
      id: "growth",
      headline: "Your Creator Growth Path",
      subheadline: "Strategic pathways to build your brand and income",
      items: growth,
    })
  }

  return sections
}

function label(category: string): string {
  const map: Record<string, string> = {
    cinematic: "Cinematic",   portrait: "Portrait",   street: "Street",
    travel: "Travel",         editorial: "Editorial", minimal: "Minimal",
    film: "Film",             dark_luxury: "Luxury",  commercial: "Commercial",
    mobile: "Mobile",         vintage: "Vintage",     nature: "Nature",
    urban: "Urban",           fashion: "Fashion",     food: "Food",
  }
  return map[category] ?? "Creative"
}

export { CATALOGUE }

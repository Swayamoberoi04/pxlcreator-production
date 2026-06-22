/**
 * src/types/onboarding.ts
 *
 * Complete TypeScript type system for the PXL Creator
 * onboarding + personalization + recommendation engine.
 */

/* â”€â”€ Profession â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const PROFESSIONS = [
  { id: "instagram-influencer",  label: "Instagram Influencer",  icon: "â—ˆ",  color: "#E1306C" },
  { id: "photographer",          label: "Photographer",          icon: "â¬¡",  color: "#FFD60A" },
  { id: "videographer",          label: "Videographer",          icon: "â–¶",  color: "#FF6B35" },
  { id: "travel-creator",        label: "Travel Creator",        icon: "âœ¦",  color: "#06B6D4" },
  { id: "fashion-creator",       label: "Fashion Creator",       icon: "â—†",  color: "#D946EF" },
  { id: "cinematic-editor",      label: "Cinematic Editor",      icon: "â—‰",  color: "#FFD60A" },
  { id: "street-photographer",   label: "Street Photographer",   icon: "â¬Ÿ",  color: "#8B5CF6" },
  { id: "youtuber",              label: "YouTuber",              icon: "â–·",  color: "#FF0000" },
  { id: "reels-creator",         label: "Reels Creator",         icon: "âŸ³",  color: "#E1306C" },
  { id: "mobile-photographer",   label: "Mobile Photographer",   icon: "âŠŸ",  color: "#10B981" },
  { id: "filmmaker",             label: "Filmmaker",             icon: "â—",  color: "#FFD60A" },
  { id: "product-photographer",  label: "Product Photographer",  icon: "â¬›",  color: "#64748B" },
  { id: "blogger",               label: "Blogger",               icon: "âœŽ",  color: "#F59E0B" },
  { id: "model",                 label: "Model",                 icon: "â—‘",  color: "#EC4899" },
  { id: "ad-maker",              label: "Ad Maker",              icon: "â–©",  color: "#3B82F6" },
  { id: "beginner-editor",       label: "Beginner Editor",       icon: "â—Ž",  color: "#6EE7B7" },
  { id: "content-creator",       label: "Content Creator",       icon: "âœ´",  color: "#A78BFA" },
  { id: "lifestyle-creator",     label: "Lifestyle Creator",     icon: "â¬¡",  color: "#FB7185" },
  { id: "food-creator",          label: "Food Creator",          icon: "â—ˆ",  color: "#F97316" },
  { id: "creative-agency",       label: "Creative Agency",       icon: "â§«",  color: "#0EA5E9" },
  { id: "social-media-manager",  label: "Social Media Manager",  icon: "â—¬",  color: "#8B5CF6" },
] as const

export type ProfessionId = (typeof PROFESSIONS)[number]["id"]

/* â”€â”€ Goals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const GOALS = [
  { id: "grow-instagram",      label: "Grow Instagram Aesthetic",   icon: "â—ˆ" },
  { id: "cinematic-edits",     label: "Create Cinematic Edits",     icon: "â—‰" },
  { id: "portfolio",           label: "Build Photography Portfolio", icon: "â¬¡" },
  { id: "brand-deals",         label: "Get Brand Deals",            icon: "â—†" },
  { id: "color-grading",       label: "Improve Color Grading",      icon: "â—‘" },
  { id: "learn-lightroom",     label: "Learn Lightroom",            icon: "â—Ž" },
  { id: "viral-reels",         label: "Create Viral Reels",         icon: "âŸ³" },
  { id: "creator-business",    label: "Build Creator Business",     icon: "â§«" },
  { id: "storytelling",        label: "Improve Storytelling",       icon: "âœŽ" },
  { id: "luxury-visuals",      label: "Create Luxury Visuals",      icon: "âœ¦" },
] as const

export type GoalId = (typeof GOALS)[number]["id"]

/* â”€â”€ Aesthetics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const AESTHETICS = [
  { id: "moody-cinematic",  label: "Moody Cinematic",    gradient: "from-slate-900 via-gray-800 to-slate-700",  accent: "#c2855a" },
  { id: "film-emulation",   label: "Film Emulation",     gradient: "from-amber-950 via-orange-900 to-amber-800", accent: "#d4a574" },
  { id: "hdr-dramatic",     label: "HDR Dramatic",       gradient: "from-gray-900 via-blue-950 to-gray-800",    accent: "#5b8fd4" },
  { id: "minimal-clean",    label: "Minimal Clean",      gradient: "from-gray-100 via-gray-50 to-white",        accent: "#9ca3af" },
  { id: "vintage-retro",    label: "Vintage Retro",      gradient: "from-amber-800 via-yellow-700 to-orange-700", accent: "#c9932a" },
  { id: "dark-luxury",      label: "Dark Luxury",        gradient: "from-black via-gray-950 to-zinc-900",       accent: "#FFD60A" },
  { id: "warm-golden-hour", label: "Warm Golden Hour",   gradient: "from-orange-400 via-amber-300 to-yellow-200", accent: "#f59e0b" },
  { id: "street-cyberpunk", label: "Street Cyberpunk",   gradient: "from-purple-900 via-violet-800 to-indigo-900", accent: "#a855f7" },
  { id: "bright-influencer",label: "Bright Influencer",  gradient: "from-pink-300 via-rose-200 to-pink-100",    accent: "#ec4899" },
  { id: "matte-beige",      label: "Matte Beige",        gradient: "from-stone-300 via-stone-200 to-amber-100", accent: "#a8956a" },
  { id: "black-white",      label: "Black & White",      gradient: "from-gray-900 via-gray-700 to-gray-500",    accent: "#9ca3af" },
  { id: "travel-cinematic", label: "Travel Cinematic",   gradient: "from-sky-900 via-teal-800 to-cyan-700",     accent: "#06b6d4" },
  { id: "neon-night",       label: "Neon Night",         gradient: "from-violet-950 via-purple-900 to-fuchsia-900", accent: "#e879f9" },
  { id: "editorial-fashion",label: "Editorial Fashion",  gradient: "from-neutral-900 via-stone-800 to-neutral-700", accent: "#d4af82" },
] as const

export type AestheticId = (typeof AESTHETICS)[number]["id"]

/* â”€â”€ Skill levels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const SKILL_LEVELS = [
  { id: "beginner",      label: "Beginner",      desc: "Just starting out â€” learning the basics",            stars: 1 },
  { id: "intermediate",  label: "Intermediate",  desc: "Comfortable with editing tools, exploring styles",   stars: 2 },
  { id: "advanced",      label: "Advanced",      desc: "Confident with complex edits and color science",     stars: 3 },
  { id: "professional",  label: "Professional",  desc: "Client work, commercial shoots, expert-level flow",  stars: 4 },
] as const

export type SkillLevelId = (typeof SKILL_LEVELS)[number]["id"]

/* â”€â”€ Platforms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const PLATFORMS = [
  { id: "instagram",     label: "Instagram",      icon: "â—ˆ", desc: "Feed posts, Stories, Reels" },
  { id: "youtube",       label: "YouTube",        icon: "â–·", desc: "Long-form videos, Shorts"   },
  { id: "tiktok",        label: "TikTok",         icon: "âŸ³", desc: "Short-form, viral content"  },
  { id: "portfolio",     label: "Portfolio",      icon: "â¬¡", desc: "Photography / design work"  },
  { id: "client-work",   label: "Client Work",    icon: "â§«", desc: "Commercial, brand shoots"   },
  { id: "personal-hobby",label: "Personal Hobby", icon: "â—Ž", desc: "Just for me â€” no pressure"  },
] as const

export type PlatformId = (typeof PLATFORMS)[number]["id"]

/* â”€â”€ Onboarding answers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export interface OnboardingAnswers {
  professions: ProfessionId[]
  goals:       GoalId[]
  aesthetics:  AestheticId[]
  skillLevel:  SkillLevelId
  platforms:   PlatformId[]
}

/* â”€â”€ Category affinities â€” the scoring dimensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export interface CategoryAffinities {
  cinematic:    number  // 0â€“1
  portrait:     number
  street:       number
  travel:       number
  editorial:    number
  minimal:      number
  film:         number
  dark_luxury:  number
  commercial:   number
  mobile:       number
  vintage:      number
  nature:       number
  urban:        number
  fashion:      number
  food:         number
}

/* â”€â”€ Style DNA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export interface StyleDNA {
  title:        string   // e.g. "Moody Cinematic Storyteller"
  tagline:      string   // e.g. "You turn raw moments into visual narratives"
  archetypes:   string[] // top 3 style keywords
  topCategories: string[] // top 3 affinities
  primaryColor: string   // hex accent colour
  badge:        string   // short badge label e.g. "Cinematic"
}

/* â”€â”€ Recommendation item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type RecommendationType =
  | "preset-bundle"
  | "lut-pack"
  | "tutorial"
  | "course"
  | "blog"
  | "community"
  | "tool"
  | "challenge"
  | "pathway"
  | "monetization"

export interface RecommendationItem {
  id:          string
  type:        RecommendationType
  title:       string
  description: string
  tags:        string[]
  score:       number           // 0â€“100 relevance
  href:        string
  badge?:      string
  isPremium?:  boolean
  categories:  Partial<CategoryAffinities>  // affinities this item satisfies
}

/* â”€â”€ Personalized sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export interface PersonalizedSection {
  id:          string
  headline:    string
  subheadline: string
  items:       RecommendationItem[]
}

/* â”€â”€ Creator profile (DB row) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export interface CreatorProfileRow {
  id:                 string
  firebase_uid:       string
  professions:        ProfessionId[]
  goals:              GoalId[]
  aesthetics:         AestheticId[]
  skill_level:        SkillLevelId | null
  platforms:          PlatformId[]
  affinities:         CategoryAffinities
  style_dna_title:    string | null
  style_dna_tagline:  string | null
  style_dna_badge:    string | null
  style_dna_color:    string | null
  style_dna_archetypes: string[] | null
  onboarding_completed_at: string | null
  created_at:         string
  updated_at:         string
}

/* â”€â”€ Zustand store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6

export interface OnboardingState {
  isOpen:      boolean
  step:        OnboardingStep
  answers:     Partial<OnboardingAnswers>
  dna:         StyleDNA | null
  isSubmitting: boolean
  isComplete:  boolean
}


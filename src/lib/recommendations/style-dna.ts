/**
 * src/lib/recommendations/style-dna.ts
 *
 * Generates a creator's "Style DNA" — a unique identity string
 * that captures their creative persona from their onboarding answers.
 *
 * Designed to feel AI-powered and personal. Results are deterministic
 * given the same inputs (no random seeds) so the DNA is stable
 * and can be shown consistently.
 */

import type {
  CategoryAffinities,
  OnboardingAnswers,
  StyleDNA,
} from "@/types/onboarding"

/* ── DNA archetypes — ranked by dominant category pair ────── */

interface DNATemplate {
  /** Primary category that must score above threshold */
  primary:    keyof CategoryAffinities
  /** Optional secondary category that boosts match */
  secondary?: keyof CategoryAffinities
  title:      string
  tagline:    string
  badge:      string
  color:      string
}

const DNA_TEMPLATES: DNATemplate[] = [
  {
    primary:   "cinematic",
    secondary: "dark_luxury",
    title:   "Moody Cinematic Storyteller",
    tagline: "You don't take photos — you frame narratives. Every edit is a scene.",
    badge:   "Cinematic",
    color:   "#c2855a",
  },
  {
    primary:   "cinematic",
    secondary: "travel",
    title:   "Cinematic Travel Visionary",
    tagline: "The world is your set. You turn destinations into visual poetry.",
    badge:   "Traveller",
    color:   "#06B6D4",
  },
  {
    primary:   "film",
    secondary: "vintage",
    title:   "Film-Grain Analog Purist",
    tagline: "Digital camera, analog soul. You chase the warmth of 35mm in every frame.",
    badge:   "Film",
    color:   "#d4a574",
  },
  {
    primary:   "film",
    secondary: "street",
    title:   "Film-Style Street Photographer",
    tagline: "Gritty, authentic, unapologetic. You find beauty in raw urban moments.",
    badge:   "Street",
    color:   "#8B5CF6",
  },
  {
    primary:   "dark_luxury",
    secondary: "editorial",
    title:   "Dark Editorial Auteur",
    tagline: "Luxury and darkness collide in your work. Every frame is a fashion statement.",
    badge:   "Editorial",
    color:   "#C9A84C",
  },
  {
    primary:   "editorial",
    secondary: "fashion",
    title:   "Editorial Fashion Director",
    tagline: "You see the world through a magazine lens. Style is your visual language.",
    badge:   "Fashion",
    color:   "#D946EF",
  },
  {
    primary:   "portrait",
    secondary: "fashion",
    title:   "Luxury Portrait Creator",
    tagline: "You elevate people. Every portrait is a story of identity and presence.",
    badge:   "Portrait",
    color:   "#EC4899",
  },
  {
    primary:   "portrait",
    secondary: "minimal",
    title:   "Minimalist Portrait Artist",
    tagline: "Less is your superpower. Clean backgrounds, perfect light, genuine emotion.",
    badge:   "Minimal",
    color:   "#9ca3af",
  },
  {
    primary:   "minimal",
    secondary: "fashion",
    title:   "Luxury Minimal Creator",
    tagline: "Your aesthetic is a brand. Consistent, aspirational, effortlessly clean.",
    badge:   "Minimal",
    color:   "#a8956a",
  },
  {
    primary:   "street",
    secondary: "urban",
    title:   "Urban Street Documentarian",
    tagline: "Cities are your canvas. You capture the pulse of human life in motion.",
    badge:   "Urban",
    color:   "#6366f1",
  },
  {
    primary:   "travel",
    secondary: "nature",
    title:   "Adventure Visual Explorer",
    tagline: "Landscapes, light, and freedom. You photograph the world the way it feels.",
    badge:   "Explorer",
    color:   "#10B981",
  },
  {
    primary:   "commercial",
    secondary: "editorial",
    title:   "Commercial Visual Director",
    tagline: "You bridge art and business. Your images don't just look good — they sell.",
    badge:   "Director",
    color:   "#3B82F6",
  },
  {
    primary:   "mobile",
    secondary: "minimal",
    title:   "Viral Mobile Creator",
    tagline: "You create magic from a phone. Fast, sharp, always on-trend.",
    badge:   "Mobile",
    color:   "#E1306C",
  },
  {
    primary:   "food",
    secondary: "minimal",
    title:   "Lifestyle Food Storyteller",
    tagline: "You make food feel like an experience. Warm, rich, utterly irresistible.",
    badge:   "Food",
    color:   "#F97316",
  },
  {
    primary:   "vintage",
    secondary: "film",
    title:   "Retro Analog Dreamer",
    tagline: "Time travel through your lens. You make the past feel beautifully present.",
    badge:   "Retro",
    color:   "#c9932a",
  },
]

/* ── Fallback DNA ───────────────────────────────────────────── */
const FALLBACK_DNA: Omit<DNATemplate, "primary" | "secondary"> = {
  title:   "Creative Visual Storyteller",
  tagline: "You are just getting started — and the best creators start exactly here.",
  badge:   "Creator",
  color:   "#C9A84C",
}

/* ── Generator ──────────────────────────────────────────────── */

export function generateStyleDNA(
  affinities: CategoryAffinities,
  _answers:   OnboardingAnswers,
): StyleDNA {
  /* Sort categories by score */
  const ranked = Object.entries(affinities)
    .sort(([, a], [, b]) => b - a)

  const top3 = ranked.slice(0, 3).map(([k]) => k as keyof CategoryAffinities)

  /* Find best matching template */
  let best: DNATemplate | null = null
  let bestScore = 0

  for (const template of DNA_TEMPLATES) {
    const primaryScore   = affinities[template.primary]   ?? 0
    const secondaryScore = template.secondary
      ? (affinities[template.secondary] ?? 0) * 0.5
      : 0
    const matchScore = primaryScore + secondaryScore

    if (matchScore > bestScore && primaryScore > 0.3) {
      bestScore = matchScore
      best = template
    }
  }

  const chosen = best ?? FALLBACK_DNA

  /* Generate archetypes from top 3 categories */
  const archetypes = top3.map((cat) => categoryLabel(cat))

  return {
    title:         chosen.title,
    tagline:       chosen.tagline,
    badge:         chosen.badge,
    primaryColor:  chosen.color,
    archetypes,
    topCategories: top3,
  }
}

/* ── Explanation copy ────────────────────────────────────────── */

export function generateDNAExplanation(
  dna:      StyleDNA,
  answers:  OnboardingAnswers,
): string {
  const profCount   = answers.professions.length
  const profNames   = answers.professions.slice(0, 2).join(" and ")
  const topAesthetic = answers.aesthetics[0] ?? ""

  const lines = [
    `Based on your identity as a ${profCount > 1 ? profNames + " creator" : profNames}`,
    `combined with your love for ${aestheticLabel(topAesthetic)} aesthetics,`,
    `our engine identified you as a ${dna.title}.`,
  ]

  return lines.join(" ")
}

function categoryLabel(cat: keyof CategoryAffinities): string {
  const map: Record<string, string> = {
    cinematic: "Cinematic",   portrait: "Portrait",   street: "Street",
    travel: "Travel",         editorial: "Editorial", minimal: "Minimal",
    film: "Film Grain",       dark_luxury: "Dark Luxury", commercial: "Commercial",
    mobile: "Mobile-First",   vintage: "Vintage",     nature: "Nature",
    urban: "Urban",           fashion: "Fashion",     food: "Food & Lifestyle",
  }
  return map[cat] ?? cat
}

function aestheticLabel(id: string): string {
  const map: Record<string, string> = {
    "moody-cinematic":   "moody cinematic",
    "film-emulation":    "film emulation",
    "hdr-dramatic":      "HDR dramatic",
    "minimal-clean":     "minimal clean",
    "vintage-retro":     "vintage retro",
    "dark-luxury":       "dark luxury",
    "warm-golden-hour":  "warm golden hour",
    "street-cyberpunk":  "street cyberpunk",
    "bright-influencer": "bright influencer",
    "matte-beige":       "matte beige",
    "black-white":       "black & white",
    "travel-cinematic":  "travel cinematic",
    "neon-night":        "neon night",
    "editorial-fashion": "editorial fashion",
  }
  return map[id] ?? id
}

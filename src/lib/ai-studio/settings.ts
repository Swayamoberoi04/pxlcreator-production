/**
 * src/lib/ai-studio/settings.ts
 *
 * Data access for AI Studio's admin-managed settings — used by BOTH the
 * public /studio page (hero copy, chips, FAQ, tutorials) and the
 * /api/studio/process route (is_enabled kill switch, free_edits_per_hour
 * rate limit). Same DB-first/static-fallback pattern as every other
 * repository: if Supabase isn't configured or the migration hasn't run,
 * every value falls back to the EXACT current hardcoded copy.
 *
 * Cached in-memory for 30s — this is read on every single AI processing
 * request (for the rate limit + kill switch), so an uncached DB round
 * trip on the hot path would add latency to every edit for no benefit;
 * 30s of staleness on "is AI Studio enabled" is an acceptable trade.
 */

export interface PromptChip {
  id: string
  label: string
  icon: string
  keywords: string[]
}

export interface AIStudioSettings {
  isEnabled: boolean
  freeEditsPerHour: number
  heroBadgeLabel: string | null
  heroTitle: string | null
  heroSubtitle: string | null
  finePrint: string | null
  announcement: string | null
  promptChips: PromptChip[]
  faqItems: { title?: string; subtitle?: string }[]
  tutorialItems: { title?: string; subtitle?: string; image_url?: string; link_href?: string }[]
}

const DEFAULT_CHIPS: PromptChip[] = [
  { id: "golden-hour", label: "Golden Hour", icon: "☀", keywords: ["warm", "golden", "amber", "sunset", "sun"] },
  { id: "cinematic", label: "Cinematic", icon: "◈", keywords: ["cinematic", "dramatic", "contrast", "rich", "dark"] },
  { id: "film-grain", label: "Film Vintage", icon: "⬡", keywords: ["grain", "vintage", "faded", "analogue", "film"] },
  { id: "cool-edit", label: "Cool & Clean", icon: "◇", keywords: ["cool", "teal", "minimal", "airy", "blue", "crisp"] },
  { id: "moody", label: "Moody Dark", icon: "●", keywords: ["moody", "dark", "shadows", "noir", "atmospheric"] },
  { id: "portrait", label: "Portrait Glow", icon: "◯", keywords: ["portrait", "skin", "soft", "warm", "glow", "faces"] },
  { id: "vibrant", label: "Vibrant", icon: "✦", keywords: ["vibrant", "saturated", "punchy", "vivid", "bold"] },
]

const DEFAULTS: AIStudioSettings = {
  isEnabled: true,
  freeEditsPerHour: 5,
  heroBadgeLabel: "AI Studio · Beta",
  heroTitle: "Describe the look. AI does the edit.",
  heroSubtitle: "Upload any photo, write what mood you're after — PXL Vision AI reads your image, applies a custom colour grade, and recommends the preset that matches it best.",
  finePrint: "PXL Vision AI · Images are processed in-memory and never stored · 5 edits / hour per session · Results are approximate — real Lightroom presets give the full look.",
  announcement: null,
  promptChips: DEFAULT_CHIPS,
  faqItems: [],
  tutorialItems: [],
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

let cache: { value: AIStudioSettings; expiresAt: number } | null = null
const CACHE_MS = 30_000

export async function getAIStudioSettings(): Promise<AIStudioSettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value
  if (!isSupabaseConfigured()) return DEFAULTS

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("ai_studio_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle()

    if (error || !data) return DEFAULTS

    const settings: AIStudioSettings = {
      isEnabled: data.is_enabled,
      freeEditsPerHour: data.free_edits_per_hour,
      heroBadgeLabel: data.hero_badge_label ?? DEFAULTS.heroBadgeLabel,
      heroTitle: data.hero_title ?? DEFAULTS.heroTitle,
      heroSubtitle: data.hero_subtitle ?? DEFAULTS.heroSubtitle,
      finePrint: data.fine_print ?? DEFAULTS.finePrint,
      announcement: data.announcement,
      promptChips: (Array.isArray(data.prompt_chips) && data.prompt_chips.length > 0)
        ? (data.prompt_chips as unknown as PromptChip[])
        : DEFAULT_CHIPS,
      faqItems: (data.faq_items as unknown as AIStudioSettings["faqItems"]) ?? [],
      tutorialItems: (data.tutorial_items as unknown as AIStudioSettings["tutorialItems"]) ?? [],
    }

    cache = { value: settings, expiresAt: Date.now() + CACHE_MS }
    return settings
  } catch {
    return DEFAULTS
  }
}

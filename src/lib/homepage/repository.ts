/**
 * src/lib/homepage/repository.ts
 *
 * Data access for the public homepage's section list. Mirrors the
 * presets/courses/blog repositories exactly: falls back to a static
 * default (every original section, enabled, in its original order) when
 * Supabase isn't configured or the migration hasn't run yet, so the site
 * never breaks during cutover.
 *
 * A section is "live" when: enabled = true AND (no publish_at, or it's in
 * the past) AND (no unpublish_at, or it's in the future) — same schedule
 * semantics as migration 034's RLS policy, re-checked here defensively
 * even though the DB query already filters via the anon-key RLS.
 */

export interface HomepageSection {
  id: string
  sectionKey: string
  title: string | null
  subtitle: string | null
  ctaLabel: string | null
  ctaHref: string | null
  imageUrl: string | null
  videoUrl: string | null
  items: { title?: string; subtitle?: string; image_url?: string; link_href?: string; link_label?: string }[]
}

/** Original hardcoded section order — the fallback when the DB isn't available. */
const DEFAULT_SECTION_KEYS = [
  "hero", "featured", "manifesto", "before_after", "ai_studio_banner",
  "shot_using_pxl", "social_proof", "philosophy_strip", "giveaway_banner",
  "lead_magnet", "cta_banner",
] as const

function defaultSections(): HomepageSection[] {
  return DEFAULT_SECTION_KEYS.map((key) => ({
    id: key, sectionKey: key, title: null, subtitle: null, ctaLabel: null, ctaHref: null,
    imageUrl: null, videoUrl: null, items: [],
  }))
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

/** Every LIVE homepage section, in display order. */
export async function getHomepageSections(): Promise<HomepageSection[]> {
  if (!isSupabaseConfigured()) return defaultSections()

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from("homepage_sections")
      .select("*")
      .eq("enabled", true)
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .or(`unpublish_at.is.null,unpublish_at.gt.${nowIso}`)
      .order("order_index", { ascending: true })

    if (error || !data || data.length === 0) return defaultSections()

    return data.map((row) => ({
      id: row.id,
      sectionKey: row.section_key,
      title: row.title,
      subtitle: row.subtitle,
      ctaLabel: row.cta_label,
      ctaHref: row.cta_href,
      imageUrl: row.image_url,
      videoUrl: row.video_url,
      items: (row.items as HomepageSection["items"]) ?? [],
    }))
  } catch {
    return defaultSections()
  }
}

/** Convenience: is a given section key enabled/live right now? Defaults to true for the original 11 (fail-open matches current behavior). */
export function isSectionEnabled(sections: HomepageSection[], key: string): boolean {
  const found = sections.find((s) => s.sectionKey === key)
  if (!found) return (DEFAULT_SECTION_KEYS as readonly string[]).includes(key)
  return true // presence in the live list already means enabled+scheduled-live
}

/** Get a section's data by key, or null if it's not live. */
export function getSection(sections: HomepageSection[], key: string): HomepageSection | null {
  return sections.find((s) => s.sectionKey === key) ?? null
}

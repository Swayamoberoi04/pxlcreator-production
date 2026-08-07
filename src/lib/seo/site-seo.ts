/**
 * src/lib/seo/site-seo.ts
 *
 * Data access for admin-managed page-level SEO (Homepage, Store, Bundles,
 * Courses, Blog, Community, AI Studio). Individual content items (a
 * preset, a course, a post) manage their own SEO via their own row's
 * seo_title/seo_description/etc — this covers the index pages that
 * AREN'T a database record.
 *
 * Same DB-first/static-fallback pattern as every other repository: if
 * Supabase isn't configured or the migration hasn't run, each page's
 * getSiteSeo() call returns its EXACT current hardcoded metadata, so
 * wiring this in is a zero-diff change until an admin actually edits it.
 */

export interface SiteSeo {
  title:        string | null
  description:  string | null
  keywords:     string | null
  ogImage:      string | null
  ogType:       string
  twitterCard:  "summary" | "summary_large_image"
  canonicalUrl: string | null
}

/** Fallback values — MUST match each page's current hardcoded `export const metadata` exactly. */
const DEFAULTS: Record<string, SiteSeo> = {
  home: {
    title: "PXL Creator — Premium Cinematic Presets",
    description: "Handcrafted Lightroom presets, cinematic editing tools, and creator resources for photographers and filmmakers.",
    keywords: "lightroom presets, cinematic presets, photo editing presets, lightroom mobile presets, cinematic lightroom presets, film emulation presets, portrait presets, landscape presets, street photography presets, creator tools, photography presets, PXL Creator",
    ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  },
  store: {
    title: "Store — Preset Packs & Free Downloads",
    description: "Browse 24 PXL Creator preset packs — 12 free downloads and tiered paid packs from ₹420. Cinematic, film emulation, portrait, landscape and street. Instant download.",
    keywords: null, ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  },
  bundles: {
    title: "Bundles — PXL Creator",
    description: "Save more with PXL Creator preset bundles. Hand-curated collections at one discounted price — get the complete look instantly.",
    keywords: null, ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  },
  courses: {
    title: "Courses",
    description: "Learn photography editing, colour grading and business from PXL Creator. Practical video courses built for real creators.",
    keywords: null, ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  },
  blog: {
    title: "Blog",
    description: "Photography tutorials, editing tips, gear reviews and behind-the-scenes from the PXL Creator team.",
    keywords: null, ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  },
  community: {
    title: null, description: null, keywords: null,
    ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  },
  ai_studio: {
    title: "AI Studio — Describe the look. AI does the edit.",
    description: "Upload any photo and describe the mood in plain English. PXL Vision AI analyses your image, applies a custom colour grade, and recommends the PXL preset that matches it best.",
    keywords: null, ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  },
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

/** SEO fields for one admin-managed page. Falls back to that page's exact original hardcoded metadata. */
export async function getSiteSeo(pageKey: string): Promise<SiteSeo> {
  const fallback = DEFAULTS[pageKey] ?? {
    title: null, description: null, keywords: null,
    ogImage: null, ogType: "website", twitterCard: "summary_large_image", canonicalUrl: null,
  }

  if (!isSupabaseConfigured()) return fallback

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("site_seo")
      .select("seo_title, seo_description, seo_keywords, og_image_url, og_type, twitter_card, canonical_url")
      .eq("page_key", pageKey)
      .maybeSingle()

    if (error || !data) return fallback

    return {
      title:        data.seo_title ?? fallback.title,
      description:  data.seo_description ?? fallback.description,
      keywords:     data.seo_keywords ?? fallback.keywords,
      ogImage:      data.og_image_url ?? fallback.ogImage,
      ogType:       data.og_type || fallback.ogType,
      twitterCard:  data.twitter_card || fallback.twitterCard,
      canonicalUrl: data.canonical_url ?? fallback.canonicalUrl,
    }
  } catch {
    return fallback
  }
}

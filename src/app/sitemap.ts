/**
 * src/app/sitemap.ts
 *
 * Generates /sitemap.xml via Next.js MetadataRoute.
 *
 * Includes:
 *   - Static pages (home, store, presets, bundles, blog, about, contact)
 *   - All preset detail pages  /presets/:slug
 *   - All bundle detail pages  /bundles/:slug
 *   - All blog post pages      /blog/:slug
 *
 * The priority and changeFrequency hints tell crawlers which
 * pages matter most and how often they change.
 */

import type { MetadataRoute } from "next"
import { siteConfig }         from "@/config/site"
import { ALL_PRESETS }        from "@/data/presets"
import { ALL_BUNDLES }        from "@/data/bundles"
import { ALL_POSTS }          from "@/data/posts"

const BASE = siteConfig.url

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

  /* ── Static pages ───────────────────────────────────────── */
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              `${BASE}/`,
      lastModified:     now,
      changeFrequency:  "weekly",
      priority:         1.0,
    },
    {
      url:              `${BASE}/store`,
      lastModified:     now,
      changeFrequency:  "daily",
      priority:         0.9,
    },
    {
      url:              `${BASE}/presets`,
      lastModified:     now,
      changeFrequency:  "daily",
      priority:         0.9,
    },
    {
      url:              `${BASE}/bundles`,
      lastModified:     now,
      changeFrequency:  "weekly",
      priority:         0.9,
    },
    {
      url:              `${BASE}/blog`,
      lastModified:     now,
      changeFrequency:  "weekly",
      priority:         0.7,
    },
    {
      url:              `${BASE}/about`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.5,
    },
    {
      url:              `${BASE}/contact`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.4,
    },
    {
      url:              `${BASE}/premium`,
      lastModified:     now,
      changeFrequency:  "weekly",
      priority:         0.85,
    },
    {
      url:              `${BASE}/studio`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.75,
    },
    {
      url:              `${BASE}/faq`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.5,
    },
    {
      url:              `${BASE}/privacy`,
      lastModified:     now,
      changeFrequency:  "yearly",
      priority:         0.3,
    },
    {
      url:              `${BASE}/terms`,
      lastModified:     now,
      changeFrequency:  "yearly",
      priority:         0.3,
    },
    {
      url:              `${BASE}/refunds`,
      lastModified:     now,
      changeFrequency:  "yearly",
      priority:         0.3,
    },
  ]

  /* ── Preset detail pages ────────────────────────────────── */
  const presetPages: MetadataRoute.Sitemap = ALL_PRESETS.map((preset) => ({
    url:              `${BASE}/presets/${preset.slug}`,
    lastModified:     now,
    changeFrequency:  "monthly" as const,
    priority:         0.8,
  }))

  /* ── Bundle detail pages ────────────────────────────────── */
  const bundlePages: MetadataRoute.Sitemap = ALL_BUNDLES.map((bundle) => ({
    url:              `${BASE}/bundles/${bundle.slug}`,
    lastModified:     now,
    changeFrequency:  "monthly" as const,
    priority:         0.8,
  }))

  /* ── Blog post pages ────────────────────────────────────── */
  const blogPages: MetadataRoute.Sitemap = ALL_POSTS.map((post) => ({
    url:              `${BASE}/blog/${post.slug}`,
    lastModified:     post.publishedAt,
    changeFrequency:  "yearly" as const,
    priority:         0.6,
  }))

  return [...staticPages, ...presetPages, ...bundlePages, ...blogPages]
}

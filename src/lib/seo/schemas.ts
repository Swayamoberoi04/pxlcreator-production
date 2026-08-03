/**
 * src/lib/seo/schemas.ts
 *
 * JSON-LD structured data helpers for schema.org markup.
 *
 * All functions return plain objects ready to be serialised with
 * JSON.stringify() inside a <script type="application/ld+json"> tag.
 *
 * Why JSON-LD? Google recommends it for rich results (product ratings,
 * breadcrumbs, articles) because it keeps markup separate from HTML and
 * is easier to validate.
 */

import { siteConfig }   from "@/config/site"
import type { Preset }  from "@/types/product"
import type { BlogPost } from "@/types/blog"

/* ── Organisation ─────────────────────────────────────────── */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name:  siteConfig.name,
    url:   siteConfig.url,
    logo:  `${siteConfig.url}/logo.png`,
    sameAs: [siteConfig.socials.youtube],
    contactPoint: {
      "@type":       "ContactPoint",
      email:         siteConfig.socials.email.replace("mailto:", ""),
      contactType:   "customer service",
    },
  }
}

/* ── Website (enables SearchAction in Google) ─────────────── */

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    name:        siteConfig.name,
    url:         siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      "@type":  "SearchAction",
      target: {
        "@type":       "EntryPoint",
        urlTemplate:   `${siteConfig.url}/store?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

/* ── Product (Preset detail page) ─────────────────────────── */

export function productSchema(preset: Preset) {
  const schema: Record<string, unknown> = {
    "@context":   "https://schema.org",
    "@type":      "Product",
    name:          preset.name,
    description:   preset.seoDescription ?? preset.description ?? preset.tagline,
    url:           `${siteConfig.url}/presets/${preset.slug}`,
    image:         preset.thumbnailUrl ?? `${siteConfig.url}${siteConfig.ogImage}`,
    brand: {
      "@type": "Brand",
      name:    siteConfig.name,
    },
    offers: {
      "@type":          "Offer",
      priceCurrency:    "USD",
      price:            preset.price.toFixed(2),
      availability:     "https://schema.org/InStock",
      url:              `${siteConfig.url}/presets/${preset.slug}`,
      seller: {
        "@type": "Organization",
        name:    siteConfig.name,
      },
    },
    category: preset.category,
  }

  if (preset.reviewCount && preset.reviewCount > 0) {
    schema.aggregateRating = {
      "@type":       "AggregateRating",
      ratingValue:   preset.rating?.toFixed(1),
      reviewCount:   preset.reviewCount,
      bestRating:    "5",
      worstRating:   "1",
    }
  }

  return schema
}


/* ── Article (Blog post page) ─────────────────────────────── */

export function articleSchema(post: BlogPost) {
  return {
    "@context":    "https://schema.org",
    "@type":       "Article",
    headline:      post.title,
    description:   post.excerpt,
    url:           `${siteConfig.url}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified:  post.publishedAt,
    author: {
      "@type": "Person",
      name:    post.author.name,
    },
    publisher: {
      "@type": "Organization",
      name:    siteConfig.name,
      url:     siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url:     `${siteConfig.url}/logo.png`,
      },
    },
    image:    `${siteConfig.url}${siteConfig.ogImage}`,
    keywords: post.tags.join(", "),
    articleSection: post.category,
  }
}

/* ── BreadcrumbList ───────────────────────────────────────── */

export function breadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type":    "ListItem",
      position:   index + 1,
      name:       item.name,
      item:       item.url,
    })),
  }
}

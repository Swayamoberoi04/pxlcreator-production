/**
 * src/app/robots.ts
 *
 * Generates /robots.txt via Next.js MetadataRoute.
 * Allows all search engine crawlers on public pages.
 * Disallows admin, API, and auth routes.
 */

import type { MetadataRoute } from "next"
import { siteConfig }         from "@/config/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/account/",
          "/checkout/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host:    siteConfig.url,
  }
}

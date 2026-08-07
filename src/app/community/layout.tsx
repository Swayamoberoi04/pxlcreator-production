import type { Metadata } from "next"
import { CommunityLayoutClient } from "@/components/community/CommunityLayoutClient"
import { getSiteSeo } from "@/lib/seo/site-seo"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo("community")
  return {
    title: seo.title ?? undefined,
    description: seo.description ?? undefined,
    keywords: seo.keywords ?? undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: { images: seo.ogImage ? [{ url: seo.ogImage }] : undefined },
    twitter: { card: seo.twitterCard },
  }
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <CommunityLayoutClient>{children}</CommunityLayoutClient>
}

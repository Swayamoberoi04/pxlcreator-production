/**
 * src/app/api/bundles/[slug]/route.ts
 *
 * GET /api/bundles/:slug
 *
 * Returns a single published bundle by slug.
 * In practice, the bundle detail page fetches server-side via repository.
 * This endpoint is available for client-side use cases (e.g. preview panels).
 */

import { NextResponse }      from "next/server"
import { getBundleBySlug }   from "@/lib/bundles/repository"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const bundle = await getBundleBySlug(slug)
    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }
    return NextResponse.json({ bundle })
  } catch (err) {
    console.error(`[GET /api/bundles/${slug}]`, err)
    return NextResponse.json({ error: "Failed to fetch bundle" }, { status: 500 })
  }
}

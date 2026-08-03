import { getBundles } from "@/lib/bundles/repository"

export const dynamic = "force-dynamic"

export async function GET() {
  const bundles = await getBundles()
  return Response.json({ success: true, data: bundles })
}

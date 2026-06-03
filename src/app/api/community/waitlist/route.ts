import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }         from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { name?: string; email?: string; feature?: string }
    const email   = (body.email ?? "").trim().toLowerCase()
    const name    = (body.name  ?? "").trim()
    const feature = (body.feature ?? "general").trim()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Upsert so duplicate emails per feature are idempotent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("community_waitlist")
      .upsert(
        { email, name: name || null, feature, joined_at: new Date().toISOString() },
        { onConflict: "email,feature" }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[waitlist]", err)
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * POST /api/email/subscribe
 *
 * Subscribes an email to the PXL Creator list and (optionally) triggers
 * the free-preset lead-magnet email.
 *
 * ── TODO: wire to your email provider ────────────────────────────────
 *  1. Choose a provider:
 *     a) Resend (recommended):  npm install resend
 *        Set env: RESEND_API_KEY, RESEND_AUDIENCE_ID
 *     b) Mailchimp:              npm install @mailchimp/mailchimp_marketing
 *        Set env: MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_SERVER_PREFIX
 *
 *  2. For Resend, replace the TODO block below with:
 *       import { Resend } from "resend"
 *       const resend = new Resend(process.env.RESEND_API_KEY)
 *       await resend.contacts.create({
 *         email, firstName: name ?? undefined,
 *         audienceId: process.env.RESEND_AUDIENCE_ID!,
 *       })
 *       // Trigger welcome + free-preset sequence:
 *       await resend.emails.send({
 *         from: "PXL Creator <hello@pxlcreator.com>",
 *         to: email,
 *         subject: "Your free cinematic preset is here",
 *         // html: ... (build with react-email)
 *       })
 *
 *  3. Set NEXT_PUBLIC_FREE_PRESET_URL in .env to the CDN URL of the free preset file.
 * ─────────────────────────────────────────────────────────────────────
 */

interface SubscribeBody {
  email:    string
  name?:    string
  source?:  string   // "homepage_hero" | "footer" | "exit_intent" | "product_page"
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: SubscribeBody
  try {
    body = await req.json() as SubscribeBody
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { email, name, source } = body

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 })
  }

  try {
    // ── TODO: replace this block with real provider integration (see above) ──
    console.info("[email/subscribe] new subscriber:", { email, name, source })
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      ok: true,
      message: "You're on the list! Check your inbox for the free preset.",
      freePresetUrl: process.env.NEXT_PUBLIC_FREE_PRESET_URL ?? null,
    })
  } catch (err) {
    console.error("[email/subscribe]", err)
    return NextResponse.json({ error: "Subscription failed. Please try again." }, { status: 500 })
  }
}

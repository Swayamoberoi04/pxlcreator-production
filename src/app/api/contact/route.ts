/**
 * POST /api/contact
 *
 * Accepts a contact-form submission:
 *   1. Rate-limits by IP (5 submissions / hour)
 *   2. Validates all fields server-side
 *   3. Stores the message in `feedback_messages` (Supabase)
 *   4. Sends an email notification to CONTACT_EMAIL_TO via Resend
 *   5. Returns { success: true } or { error: "..." }
 *
 * Body (JSON):
 *   name          string  required  1–100 chars
 *   email         string  required  valid email
 *   subject       string  required  must be one of ALLOWED_SUBJECTS
 *   message       string  required  20–5000 chars
 *   firebase_uid  string  optional  uid from authenticated user
 */

import { NextRequest, NextResponse }     from "next/server"
import { createAdminClient }             from "@/lib/supabase/admin"
import { sendContactEmail }              from "@/lib/email/resend"
import { makeRateLimiter, getClientIp }  from "@/lib/api/rate-limit"
import { log }                           from "@/lib/api/logger"
import crypto                            from "crypto"

export const runtime = "nodejs"

/* ── Rate limit: 5 submissions per hour per IP ──────────────────────── */
const contactLimiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

/* ── Allowed subjects (mirror the frontend list) ────────────────────── */
const ALLOWED_SUBJECTS = new Set([
  "General Inquiry",
  "Order / Download Issue",
  "Preset Compatibility",
  "Collaboration",
  "Course Support",
  "Other",
])

/* ── POST handler ───────────────────────────────────────────────────── */

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req)

  /* 1. Rate limit */
  if (contactLimiter.check(ip)) {
    log.warn("contact", "Rate limit exceeded", { ip })
    return NextResponse.json(
      { error: "Too many messages. Please wait before sending another." },
      { status: 429 }
    )
  }

  /* 2. Parse body */
  let body: {
    name?:         string
    email?:        string
    subject?:      string
    message?:      string
    firebase_uid?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { name, email, subject, message, firebase_uid } = body

  /* 3. Validate */
  const errors: string[] = []

  const trimName    = name?.trim()    ?? ""
  const trimEmail   = email?.trim()   ?? ""
  const trimSubject = subject?.trim() ?? ""
  const trimMessage = message?.trim() ?? ""

  if (!trimName)                       errors.push("Name is required.")
  else if (trimName.length > 100)      errors.push("Name must be 100 characters or fewer.")

  if (!trimEmail)                      errors.push("Email is required.")
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail))
                                       errors.push("Please enter a valid email address.")
  else if (trimEmail.length > 254)     errors.push("Email address is too long.")

  if (!trimSubject)                    errors.push("Subject is required.")
  else if (!ALLOWED_SUBJECTS.has(trimSubject))
                                       errors.push("Invalid subject selected.")

  if (!trimMessage)                    errors.push("Message is required.")
  else if (trimMessage.length < 20)    errors.push("Message must be at least 20 characters.")
  else if (trimMessage.length > 5000)  errors.push("Message must be 5,000 characters or fewer.")

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 })
  }

  /* 4. Hash IP for storage (privacy — store a hash, not the raw IP) */
  const ipHash = crypto
    .createHmac("sha256", process.env.ADMIN_SECRET_KEY ?? "pxl-ip-salt")
    .update(ip)
    .digest("hex")
    .slice(0, 16)

  /* 5. Save to Supabase */
  const supabase = createAdminClient()
  const submittedAt = new Date()

  const { error: dbError } = await supabase
    .from("feedback_messages")
    .insert({
      firebase_uid: firebase_uid?.trim() || null,
      name:         trimName,
      email:        trimEmail.toLowerCase(),
      subject:      trimSubject,
      message:      trimMessage,
      ip_hash:      ipHash,
      is_read:      false,
      is_archived:  false,
    })

  if (dbError) {
    log.error("contact", "Failed to save message to DB", { error: dbError.message })
    // Don't expose DB internals — still try to send email
  }

  /* 6. Send email notification */
  const emailResult = await sendContactEmail({
    senderName:  trimName,
    senderEmail: trimEmail,
    subject:     trimSubject,
    message:     trimMessage,
    firebaseUid: firebase_uid?.trim() || null,
    submittedAt,
  })

  if (!emailResult.success) {
    log.error("contact", "Failed to send email notification", { error: emailResult.error })
    // Message was saved to DB — still treat as success from user's POV
    // (we don't want users to retry just because email failed)
  } else {
    log.info("contact", "Contact message received and email sent", {
      subject: trimSubject,
      hasUid: !!firebase_uid,
    })
  }

  return NextResponse.json({ success: true })
}

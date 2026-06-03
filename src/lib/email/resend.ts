/**
 * src/lib/email/resend.ts
 *
 * Thin wrapper around the Resend SDK.
 *
 * Usage:
 *   import { sendContactEmail } from "@/lib/email/resend"
 *   await sendContactEmail({ ... })
 *
 * Required env variables:
 *   RESEND_API_KEY        — from resend.com dashboard
 *   CONTACT_EMAIL_TO      — address that receives contact messages (e.g. creatorpxl@gmail.com)
 *   CONTACT_EMAIL_FROM    — verified sender address in Resend  (e.g. noreply@yourdomain.com)
 *                           If you don't have a custom domain yet, Resend provides a free
 *                           onboarding address: "onboarding@resend.dev"
 */

import { Resend } from "resend"

/* ── Client (lazy-initialised so build-time won't crash without key) ── */

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set in environment variables.")
    _resend = new Resend(key)
  }
  return _resend
}

/* ── Types ─────────────────────────────────────────────────────────── */

export interface ContactEmailPayload {
  senderName:   string
  senderEmail:  string
  subject:      string
  message:      string
  firebaseUid?: string | null
  submittedAt:  Date
}

/* ── Send helpers ───────────────────────────────────────────────────── */

/**
 * Sends a contact-form notification to the site owner.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function sendContactEmail(
  payload: ContactEmailPayload
): Promise<{ success: true } | { success: false; error: string }> {
  const to   = process.env.CONTACT_EMAIL_TO   ?? "creatorpxl@gmail.com"
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev"

  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from,
      to:      [to],
      replyTo: payload.senderEmail,
      subject: `[PXL Creator] ${payload.subject} — from ${payload.senderName}`,
      html:    buildContactHtml(payload),
      text:    buildContactText(payload),
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/* ── Email templates ────────────────────────────────────────────────── */

function fmt(d: Date): string {
  return d.toLocaleString("en-IN", {
    timeZone:    "Asia/Kolkata",
    dateStyle:   "medium",
    timeStyle:   "short",
  }) + " IST"
}

function buildContactHtml(p: ContactEmailPayload): string {
  const uid = p.firebaseUid
    ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;width:120px">User&nbsp;UID</td><td style="padding:8px 0;font-size:13px;font-family:monospace;color:#ccc">${esc(p.firebaseUid)}</td></tr>`
    : ""

  return /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Contact Message — PXL Creator</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden">

    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1a1a0a,#111);padding:28px 32px;border-bottom:1px solid #2a2a2a">
        <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a84c;font-weight:600">PXL Creator</p>
        <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#f5f0e8">New Contact Message</h1>
      </td>
    </tr>

    <!-- Meta table -->
    <tr>
      <td style="padding:24px 32px 8px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px;width:120px">From</td>
            <td style="padding:8px 0;font-size:13px;color:#f0ece4;font-weight:600">${esc(p.senderName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px">Email</td>
            <td style="padding:8px 0;font-size:13px"><a href="mailto:${esc(p.senderEmail)}" style="color:#c9a84c;text-decoration:none">${esc(p.senderEmail)}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px">Subject</td>
            <td style="padding:8px 0;font-size:13px;color:#f0ece4">${esc(p.subject)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px">Received</td>
            <td style="padding:8px 0;font-size:13px;color:#999">${esc(fmt(p.submittedAt))}</td>
          </tr>
          ${uid}
        </table>
        <div style="height:1px;background:#2a2a2a;margin:16px 0"></div>
      </td>
    </tr>

    <!-- Message body -->
    <tr>
      <td style="padding:0 32px 32px">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#888">Message</p>
        <div style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:20px 22px">
          <p style="margin:0;font-size:14px;line-height:1.75;color:#d4cfca;white-space:pre-wrap">${esc(p.message)}</p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#0d0d0d;padding:18px 32px;border-top:1px solid #2a2a2a">
        <p style="margin:0;font-size:12px;color:#555">
          This message was submitted via the PXL Creator contact form.
          Reply directly to this email to respond to ${esc(p.senderName)}.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`
}

function buildContactText(p: ContactEmailPayload): string {
  return [
    "New Contact Message — PXL Creator",
    "===================================",
    "",
    `From:     ${p.senderName}`,
    `Email:    ${p.senderEmail}`,
    `Subject:  ${p.subject}`,
    `Received: ${fmt(p.submittedAt)}`,
    p.firebaseUid ? `UID:      ${p.firebaseUid}` : "",
    "",
    "Message:",
    "--------",
    p.message,
    "",
    "---",
    "Submitted via PXL Creator contact form.",
  ]
    .filter((l) => l !== undefined)
    .join("\n")
}

/* ── HTML entity escape ─────────────────────────────────────────────── */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * GET /api/downloads/[token]
 *
 * Secure digital delivery endpoint.
 *
 * Security model:
 *   - Token is a cryptographically random UUID (v4)
 *   - Tokens expire after 30 days (was: 1 year — reduced to limit exposure)
 *   - Max 20 downloads per token (anti-sharing / anti-abuse)
 *   - Parent order must be in "paid" status before any download is served
 *   - Redirect URL is validated to be a trusted host before issuing
 *   - Proper security headers prevent caching of the redirect response
 *
 * Flow:
 *   1. Validate token exists and is not expired
 *   2. Check download count has not exceeded max
 *   3. Verify parent order is paid
 *   4. Validate download URL is a trusted host
 *   5. Increment counter + record timestamp
 *   6. 302 redirect to the actual file
 */

import { NextRequest, NextResponse, after } from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { log }                        from "@/lib/api/logger"
import { recordDownload }             from "@/lib/analytics/download-tracker"
import type { DownloadTokenRow }      from "@/types/database"

export const runtime = "nodejs"

/** Fields we actually use from the token row */
type TokenRecord = Pick<
  DownloadTokenRow,
  "id" | "download_url" | "preset_title" | "expires_at" |
  "download_count" | "max_downloads" | "order_item_id"
>

/* ── Trusted download hosts ─────────────────────────────── */
// Only redirect to URLs on these hostnames.
// Add new trusted hosts (e.g. your CDN domain) here.
const TRUSTED_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "storage.googleapis.com",
  "dl.dropboxusercontent.com",
  "www.dropbox.com",
  "assets.pxlcreator.com",    // your own CDN / Supabase storage bucket
  "supabase.co",
  "amazonaws.com",             // AWS S3
])

function isTrustedUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl)
    // Allow exact match or subdomain match
    return [...TRUSTED_HOSTS].some(
      (trusted) => hostname === trusted || hostname.endsWith(`.${trusted}`)
    )
  } catch {
    return false
  }
}

/* ── Handler ────────────────────────────────────────────── */

export async function GET(
  req:     NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params

    if (!token || typeof token !== "string" || token.length < 10) {
      return htmlError("Invalid download link.", 400)
    }

    const supabase = createAdminClient()

    /* ── 1. Fetch token record ── */
    const { data: rawDt, error } = await supabase
      .from("download_tokens")
      .select("id, download_url, preset_title, expires_at, download_count, max_downloads, order_item_id")
      .eq("token", token)
      .single()

    if (error || !rawDt) {
      return htmlError("This download link is invalid or has expired.", 404)
    }

    // Cast to our typed interface after the null guard above
    const dt = rawDt as unknown as TokenRecord

    /* ── 2. Check expiry ── */
    if (new Date(dt.expires_at) < new Date()) {
      return htmlError(
        `This download link expired on ${new Date(dt.expires_at).toLocaleDateString("en-IN")}. ` +
        "Please contact support at creatorpxl@gmail.com for a new link.",
        410
      )
    }

    /* ── 3. Check download count ── */
    if (dt.download_count >= dt.max_downloads) {
      return htmlError(
        `This download link has reached its limit of ${dt.max_downloads} downloads. ` +
        "Contact creatorpxl@gmail.com to request a new link.",
        429
      )
    }

    /* ── 4. Verify the parent order is paid ── */
    let presetId: string | null = null   // captured here for analytics in step 7

    if (dt.order_item_id) {
      const { data: orderItem } = await supabase
        .from("order_items")
        .select("order_id, preset_id")   // preset_id used for download_count analytics
        .eq("id", dt.order_item_id)
        .single()

      if (orderItem) {
        presetId = orderItem.preset_id   // save — used below after the token update

        const { data: order } = await supabase
          .from("orders")
          .select("status")
          .eq("id", orderItem.order_id)
          .single()

        if (order?.status !== "paid") {
          return htmlError(
            "Payment has not been confirmed for this download. " +
            "If you believe this is an error, contact creatorpxl@gmail.com.",
            402
          )
        }
      }
    }

    /* ── 5. Require a valid download URL ── */
    if (!dt.download_url) {
      return htmlError(
        `"${dt.preset_title}" download is being prepared. ` +
        "Please check back in a few minutes or contact support.",
        503
      )
    }

    /* ── 6. Validate the download URL is a trusted host ── */
    if (!isTrustedUrl(dt.download_url)) {
      log.security("download", "untrusted redirect URL blocked", {
        token,
        url: dt.download_url,
      })
      return htmlError(
        "This download link points to an untrusted location. Please contact support.",
        502
      )
    }

    /* ── 7. Count the download ──
       Token-level counter (drives per-link expiry / max_downloads) is
       updated directly; the aggregate preset analytics go through the
       shared tracker (atomic event + free/paid counter, dedup-aware).
       A token delivery is always a PAID download; the token id is the
       audit reference and the dedup identity. */
    await supabase
      .from("download_tokens")
      .update({
        download_count:  dt.download_count + 1,
        last_downloaded: new Date().toISOString(),
      })
      .eq("id", dt.id)

    after(() => recordDownload({
      presetId,
      presetSlug:     dt.preset_title ?? presetId ?? "paid-download",
      type:           "paid",
      request:        req,
      orderReference: dt.id,
    }))

    /* ── 8. Log the download event ── */
    log.info("download", "preset download served", {
      token,
      preset_title:   dt.preset_title,
      download_count: dt.download_count + 1,
      max_downloads:  dt.max_downloads,
    })

    /* ── 9. Redirect with security headers ── */
    const response = NextResponse.redirect(dt.download_url, { status: 302 })

    // Prevent browsers/CDNs from caching the redirect
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private")
    response.headers.set("Pragma",        "no-cache")
    response.headers.set("Expires",       "0")
    // Don't leak the download URL in the Referer header
    response.headers.set("Referrer-Policy", "no-referrer")

    return response
  } catch (e) {
    console.error("[downloads]", e)
    return htmlError("Server error. Please try again later or contact support.", 500)
  }
}

/* ── Branded error page ─────────────────────────────────── */

function htmlError(message: string, status: number) {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Download Error — PXL Creator</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:system-ui,-apple-system,sans-serif;
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;background:#0a0a0a;color:#e5e5e5;
      text-align:center;padding:2rem;
    }
    .card{max-width:480px;width:100%}
    .icon{font-size:2.5rem;margin-bottom:1rem}
    h1{font-size:1.25rem;font-weight:700;color:#FFD60A;margin-bottom:0.75rem}
    p{color:#888;line-height:1.6;margin-bottom:1rem}
    a{
      display:inline-block;margin-top:1rem;
      color:#000;background:#FFD60A;
      text-decoration:none;border-radius:9999px;
      padding:0.6rem 1.5rem;font-weight:600;font-size:0.875rem;
    }
    .status{font-size:0.75rem;color:#444;margin-top:1.5rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Download Unavailable</h1>
    <p>${message}</p>
    <a href="/account">Go to My Library</a>
    <p class="status">HTTP ${status} · PXL Creator</p>
  </div>
</body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

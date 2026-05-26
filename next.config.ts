import type { NextConfig } from "next"

const nextConfig: NextConfig = {

  /* ── Remove the X-Powered-By: Next.js header ──────────────
     Minor security improvement — no need to advertise the stack.
  ─────────────────────────────────────────────────────────── */
  poweredByHeader: false,

  /* ── Image optimisation ───────────────────────────────────
     AVIF delivers ~50% smaller files vs WebP, ~70% vs JPEG.
     WebP is the fallback for browsers without AVIF support.
     minimumCacheTTL — serve optimised images from CDN cache
     for 30 days (default is 60 s — too aggressive for presets).
  ─────────────────────────────────────────────────────────── */
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days in seconds
    remotePatterns: [
      /* YouTube thumbnails */
      { protocol: "https", hostname: "i.ytimg.com"       },
      { protocol: "https", hostname: "img.youtube.com"   },
      /* Supabase storage (for when DB images are added) */
      { protocol: "https", hostname: "*.supabase.co"     },
      { protocol: "https", hostname: "*.supabase.in"     },
    ],
  },

  /* ── Security headers ─────────────────────────────────────
     Applied to all routes. Prevents clickjacking, MIME sniffing,
     XSS via iframes, and information leakage via Referrer.
  ─────────────────────────────────────────────────────────── */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key:   "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key:   "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key:   "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key:   "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key:   "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // HSTS — tells browsers to always use HTTPS for 1 year.
            // includeSubDomains + preload = eligible for browser preload lists.
            // Only effective over HTTPS (ignored over plain HTTP).
            key:   "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            // Content-Security-Policy — restricts what resources the browser loads.
            // 'unsafe-inline' is required for Next.js inline style/script hydration.
            // Razorpay checkout.js + api.razorpay.com are explicitly allowed.
            key:   "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://i.ytimg.com https://img.youtube.com https://lh3.googleusercontent.com",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.razorpay.com https://lumberjack.razorpay.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://apis.google.com https://oauth2.googleapis.com https://accounts.google.com https://firebaseinstallations.googleapis.com",
              "frame-src https://api.razorpay.com https://*.firebaseapp.com https://accounts.google.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig

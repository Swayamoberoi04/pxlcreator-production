import type { NextConfig } from "next"

const nextConfig: NextConfig = {

  /* ── Remove the X-Powered-By: Next.js header ──────────────
     Minor security improvement — no need to advertise the stack.
  ─────────────────────────────────────────────────────────── */
  poweredByHeader: false,

  /* ── Tree-shake heavy packages ────────────────────────────
     optimizePackageImports rewrites named imports so only the
     specific exports used are bundled, not the full package.
     Critical for lucide-react (900+ icons) and framer-motion.
  ─────────────────────────────────────────────────────────── */
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },

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

  /* ── Redirects ───────────────────────────────────────────
     Spaces section has been removed. Redirect old URLs to Hub.
  ─────────────────────────────────────────────────────────── */
  async redirects() {
    return [
      { source: "/community/spaces",         destination: "/community", permanent: true },
      { source: "/community/spaces/:path*",  destination: "/community", permanent: true },
    ]
  },

  /* ── Security headers ─────────────────────────────────────
     Applied to all routes. Prevents clickjacking, MIME sniffing,
     XSS via iframes, and information leakage via Referrer.
  ─────────────────────────────────────────────────────────── */
  async headers() {
    // ── CSP directive builder ──────────────────────────────
    // Each array entry is one allowlist item inside a directive.
    // Join with space (within a directive) and "; " between directives.
    const csp = [

      // ── default fallback ──────────────────────────────────
      // Only 'self' — specific directives below override this.
      "default-src 'self'",

      // ── scripts ───────────────────────────────────────────
      // 'unsafe-inline' + 'unsafe-eval' are required by Next.js runtime hydration.
      // Google:
      //   apis.google.com      — firebase loads apis.google.com/js/api.js (root cause of the auth failure)
      //   www.gstatic.com      — Firebase SDK bundles are served from here
      //   accounts.google.com  — OAuth2 scripts loaded during Google sign-in popup
      //   googletagmanager.com — analytics (optional but safe to keep)
      // Razorpay:
      //   checkout.razorpay.com — payment modal JS
      [
        "script-src",
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        // ─ Firebase / Google ─
        "https://apis.google.com",
        "https://www.gstatic.com",
        "https://accounts.google.com",
        // ─ Razorpay ─
        "https://checkout.razorpay.com",
        // ─ Analytics (harmless to keep) ─
        "https://www.googletagmanager.com",
      ].join(" "),

      // ── stylesheets ───────────────────────────────────────
      // 'unsafe-inline' required for Next.js CSS-in-JS / Tailwind.
      // Google Fonts loaded from fonts.googleapis.com.
      [
        "style-src",
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://www.gstatic.com",   // Google Sign-In button styles
        "https://accounts.google.com",
      ].join(" "),

      // ── web fonts ─────────────────────────────────────────
      [
        "font-src",
        "'self'",
        "https://fonts.gstatic.com",
      ].join(" "),

      // ── images ────────────────────────────────────────────
      // data: — inline SVG / base64 images used in the UI
      // blob: — canvas exports, Next.js image optimisation
      // *.googleusercontent.com — Google account avatars (covers lh1-lh6, etc.)
      // www.gstatic.com         — Google branding images (sign-in button logo)
      // ytimg / youtube         — YouTube thumbnails for preset cards
      // supabase                — future storage bucket assets
      [
        "img-src",
        "'self'",
        "data:",
        "blob:",
        "https://*.supabase.co",
        "https://*.supabase.in",
        "https://i.ytimg.com",
        "https://img.youtube.com",
        "https://*.googleusercontent.com",  // all Google avatar subdomains
        "https://www.gstatic.com",
        "https://accounts.google.com",
      ].join(" "),

      // ── fetch / XHR / WebSocket ───────────────────────────
      // Firebase Auth REST stack:
      //   identitytoolkit.googleapis.com  — sign-in, sign-up, password reset
      //   securetoken.googleapis.com      — ID token refresh
      //   firebase.googleapis.com         — base Firebase API
      //   firebaseinstallations.googleapis.com — Firebase Installations API
      //   apis.google.com                 — gapi requests
      //   oauth2.googleapis.com           — OAuth2 token exchange
      //   accounts.google.com             — OAuth2 / OIDC token endpoint
      //   www.googleapis.com              — profile info fetch after sign-in
      // Supabase: database + storage
      // Razorpay: payment API + logging
      [
        "connect-src",
        "'self'",
        // ─ Supabase ─
        "https://*.supabase.co",
        "https://*.supabase.in",
        // ─ Razorpay ─
        "https://api.razorpay.com",
        "https://lumberjack.razorpay.com",
        // ─ Firebase Auth ─
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://firebase.googleapis.com",
        "https://firebaseinstallations.googleapis.com",
        // ─ Google OAuth2 / APIs ─
        "https://apis.google.com",
        "https://oauth2.googleapis.com",
        "https://accounts.google.com",
        "https://www.googleapis.com",
      ].join(" "),

      // ── iframes ───────────────────────────────────────────
      // Firebase uses a hidden iframe at <project>.firebaseapp.com/__/auth/iframe
      // to silently refresh ID tokens without a visible redirect.
      // Google OAuth2 may also embed accounts.google.com in an iframe.
      // Razorpay uses an iframe for its payment modal overlay.
      [
        "frame-src",
        "https://api.razorpay.com",
        "https://*.razorpay.com",
        "https://*.firebaseapp.com",
        "https://accounts.google.com",
        "https://apis.google.com",      // gapi popup uses this
      ].join(" "),

      // ── media (audio / video) ─────────────────────────────
      "media-src 'self'",

      // ── plugins (Flash, Java, etc.) — fully blocked ───────
      "object-src 'none'",

      // ── base URL for relative links ───────────────────────
      "base-uri 'self'",

      // ── form submissions ──────────────────────────────────
      // Only allow forms to submit to the same origin.
      "form-action 'self'",

      // ── upgrade plain-HTTP sub-resources to HTTPS ─────────
      "upgrade-insecure-requests",

    ].join("; ")

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
            key:   "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ]
  },
}

export default nextConfig

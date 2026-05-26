/**
 * src/lib/env.ts
 *
 * Server-side environment variable validation.
 * Import this at the top of any API route that needs env vars,
 * or call validateServerEnv() once in a root layout / instrumentation.ts.
 *
 * Throws at startup if any required variable is missing — this surfaces
 * misconfigurations immediately (during deployment) rather than silently
 * failing mid-request for the first paying customer.
 */

interface EnvSpec {
  key:      string
  required: boolean
  secret:   boolean   // if true, value is not logged
}

const SERVER_ENV_SPECS: EnvSpec[] = [
  // ── Supabase ────────────────────────────────────────────────
  { key: "NEXT_PUBLIC_SUPABASE_URL",        required: true,  secret: false },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",   required: true,  secret: true  },
  { key: "SUPABASE_SERVICE_ROLE_KEY",       required: true,  secret: true  },

  // ── Firebase (client SDK — used in AuthContext) ──────────────
  { key: "NEXT_PUBLIC_FIREBASE_API_KEY",         required: true,  secret: true  },
  { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",     required: true,  secret: false },
  { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",      required: true,  secret: false },
  { key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",  required: true,  secret: false },
  { key: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", required: true, secret: false },
  { key: "NEXT_PUBLIC_FIREBASE_APP_ID",          required: true,  secret: true  },

  // ── Firebase Admin SDK ──────────────────────────────────────
  { key: "FIREBASE_ADMIN_PROJECT_ID",       required: true,  secret: false },
  { key: "FIREBASE_ADMIN_CLIENT_EMAIL",     required: true,  secret: false },
  { key: "FIREBASE_ADMIN_PRIVATE_KEY",      required: true,  secret: true  },

  // ── Razorpay ────────────────────────────────────────────────
  { key: "RAZORPAY_KEY_ID",                 required: true,  secret: false },
  { key: "RAZORPAY_KEY_SECRET",             required: true,  secret: true  },
  { key: "RAZORPAY_WEBHOOK_SECRET",         required: true,  secret: true  },

  // ── Admin panel ─────────────────────────────────────────────
  { key: "ADMIN_PASSWORD",                  required: true,  secret: true  },
  { key: "ADMIN_SECRET_KEY",                required: true,  secret: true  },

  // ── Optional integrations ───────────────────────────────────
  { key: "OPENAI_API_KEY",                  required: false, secret: true  },
  { key: "YOUTUBE_API_KEY",                 required: false, secret: true  },
]

let validated = false

/**
 * Call once at server startup. Safe to call multiple times (memoised).
 * In production it throws on any missing required variable.
 * In development it logs warnings instead of throwing.
 */
export function validateServerEnv(): void {
  if (validated) return
  validated = true

  const missing: string[] = []

  for (const spec of SERVER_ENV_SPECS) {
    const value = process.env[spec.key]
    if (!value?.trim()) {
      if (spec.required) {
        missing.push(spec.key)
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[env] Optional variable ${spec.key} is not set`)
        }
      }
    }
  }

  if (missing.length > 0) {
    const list = missing.join(", ")
    const msg  = `[env] Missing required environment variables: ${list}\n` +
                 `      Add them to .env.local (dev) or your hosting platform (prod).`

    if (process.env.NODE_ENV === "production") {
      throw new Error(msg)
    } else {
      console.error(msg)
    }
  }
}

/**
 * Type-safe accessor for a required server env variable.
 * Throws immediately if the variable is not set.
 */
export function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value?.trim()) {
    throw new Error(
      `[env] Required environment variable "${key}" is not set. ` +
      `Add it to .env.local or your hosting platform.`
    )
  }
  return value
}

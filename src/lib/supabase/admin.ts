/**
 * src/lib/supabase/admin.ts
 *
 * Service-role Supabase client for admin API routes.
 * Uses the SERVICE ROLE KEY — bypasses Row Level Security entirely.
 *
 * ⚠️  NEVER import this in Client Components or expose to the browser.
 *     Only use in Route Handlers (/app/api/admin/...) and server scripts.
 *
 * Usage (Route Handler only):
 *   import { createAdminClient } from "@/lib/supabase/admin"
 *   const supabase = createAdminClient()
 */

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "[Supabase Admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Add these to .env.local before using admin operations."
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}

/**
 * src/lib/supabase/client.ts
 *
 * Browser-side Supabase client (for Client Components).
 * Uses @supabase/ssr's createBrowserClient — handles cookie
 * persistence automatically via browser storage.
 *
 * Usage:
 *   "use client"
 *   import { createClient } from "@/lib/supabase/client"
 *   const supabase = createClient()
 */

import { createBrowserClient } from "@supabase/ssr"
import type { Database }       from "@/types/database"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

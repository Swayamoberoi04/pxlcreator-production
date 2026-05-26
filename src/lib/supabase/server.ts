/**
 * src/lib/supabase/server.ts
 *
 * Server-side Supabase client (for Server Components, Route Handlers,
 * and Server Actions). Uses the anon key — respects RLS policies.
 *
 * Must be called inside an async context (awaits cookies()).
 *
 * Usage (Server Component / Route Handler):
 *   import { createServerSupabaseClient } from "@/lib/supabase/server"
 *   const supabase = await createServerSupabaseClient()
 */

import { createServerClient }  from "@supabase/ssr"
import { cookies }              from "next/headers"
import type { Database }        from "@/types/database"

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — cookies cannot be set from RSC.
            // This is expected; the session is managed by the browser.
          }
        },
      },
    }
  )
}

/**
 * src/lib/admin/guard.ts
 *
 * Centralized admin-auth guard for API route handlers.
 *
 * Usage (in every /api/admin/* route handler):
 *
 *   import { requireAdmin } from "@/lib/admin/guard"
 *
 *   export async function GET(req: NextRequest) {
 *     const deny = await requireAdmin()
 *     if (deny) return deny          // 401 if not authenticated
 *     // ... admin-only logic
 *   }
 *
 * The guard reads the HMAC-signed session cookie set at /admin/login.
 * It does NOT rely on middleware — handlers protect themselves so that
 * direct API calls (curl, Postman, etc.) are rejected independently of
 * whether the Next.js middleware ran.
 */

import { cookies }              from "next/headers"
import { NextResponse }         from "next/server"
import { ADMIN_COOKIE_NAME,
         verifySessionToken }   from "@/lib/admin/auth"

/**
 * Verify the admin session cookie.
 *
 * @returns null if the request is authorised (proceed normally)
 * @returns a 401 NextResponse if the session is missing or invalid
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore  = await cookies()
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? ""
  const isValid      = await verifySessionToken(sessionToken)

  if (!isValid) {
    return NextResponse.json(
      { error: "Unauthorized. Valid admin session required." },
      { status: 401 }
    )
  }

  return null
}

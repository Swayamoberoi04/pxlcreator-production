/**
 * src/lib/account/auth.ts
 *
 * Extracts and verifies Firebase ID token from API request headers.
 *
 * Client-side usage pattern:
 *   const token = await user.getIdToken()
 *   fetch("/api/account/orders", {
 *     headers: { Authorization: `Bearer ${token}` }
 *   })
 *
 * Server-side usage pattern:
 *   const uid = await getFirebaseUidFromRequest(req)
 *   if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
 *
 * Falls back gracefully if Firebase Admin is not configured.
 */

import type { NextRequest } from "next/server"

/**
 * Extract and verify the Firebase UID from a Bearer token in the
 * Authorization header. Returns null if missing, invalid, or expired.
 */
export async function getFirebaseUidFromRequest(
  req: NextRequest
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  if (!token) return null

  try {
    const { verifyFirebaseToken } = await import("@/lib/firebase/admin-server")
    const result = await verifyFirebaseToken(token)
    return result?.uid ?? null
  } catch {
    // Firebase Admin not configured yet — fall back to trusted param
    // REMOVE THIS FALLBACK before going to production
    return null
  }
}

/**
 * Convenience: returns uid or sends a 401 response.
 * Usage: const uid = await requireAuth(req); if (!uid) return;
 *
 * Actually returns the uid string or null — caller handles the 401.
 */
export { getFirebaseUidFromRequest as requireFirebaseAuth }

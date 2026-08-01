/**
 * src/lib/firebase/admin-server.ts
 *
 * Firebase Admin SDK — server-side only.
 * Used for verifying ID tokens from authenticated users.
 *
 * Requires:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 *
 * Get these from Firebase Console → Project Settings → Service Accounts
 * → Generate new private key → download JSON
 *
 * ⚠️  NEVER import this in Client Components or expose to the browser.
 */

import { getApps, initializeApp, getApp, cert } from "firebase-admin/app"
import { getAuth }                               from "firebase-admin/auth"

function getAdminApp() {
  if (getApps().length > 0) return getApp()

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[Firebase Admin] Missing env vars. Add to .env.local:\n" +
      "  FIREBASE_ADMIN_PROJECT_ID\n" +
      "  FIREBASE_ADMIN_CLIENT_EMAIL\n" +
      "  FIREBASE_ADMIN_PRIVATE_KEY"
    )
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

/**
 * Verify a Firebase ID token and return the decoded payload.
 * Returns null if the token is invalid or expired.
 *
 * @param idToken - Firebase ID token from `user.getIdToken()` on the client
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string; email: string | undefined; emailVerified: boolean } | null> {
  if (!idToken) return null

  try {
    const admin    = getAdminApp()
    const auth     = getAuth(admin)
    // checkRevoked=true → a disabled account or revoked refresh token fails here.
    const decoded  = await auth.verifyIdToken(idToken, true)
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
    }
  } catch {
    return null
  }
}

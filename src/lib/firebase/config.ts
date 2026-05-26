import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"

/**
 * Firebase client-side configuration.
 * All NEXT_PUBLIC_ vars are safe to expose — they identify the project,
 * not grant admin access. Real security lives in Firebase Security Rules.
 */
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

/* ── Dev diagnostics — logs any missing config keys on startup ── */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missing.length > 0) {
    console.error(
      "[Firebase] Missing config keys:", missing,
      "\nCheck your .env.local file. Auth will not work without these."
    )
  } else {
    console.log(
      "[Firebase] Config OK — project:", firebaseConfig.projectId,
      "| authDomain:", firebaseConfig.authDomain
    )
  }
}

/* Prevent duplicate initialization across Next.js hot-reloads */
const isNew = getApps().length === 0
const app   = isNew ? initializeApp(firebaseConfig) : getApp()

if (typeof window !== "undefined" && process.env.NODE_ENV === "development" && isNew) {
  console.log("[Firebase] App initialized ✓")
}

export const auth = getAuth(app)
export default app

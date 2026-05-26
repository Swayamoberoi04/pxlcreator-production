import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut          as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from "firebase/auth"
import { auth } from "./config"

/* ── Google provider — always prompt account chooser ── */
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: "select_account" })

/* ─────────────────────────────────────────────────────
   Core auth operations
───────────────────────────────────────────────────── */
export async function signUpWithEmail(
  email:       string,
  password:    string,
  displayName?: string,
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() })
  }
  return credential
}

export async function signInWithEmail(
  email:    string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? ""
    /*
     * auth/popup-blocked  — browser blocked the popup (common on mobile)
     * auth/popup-closed-by-user — user closed it before completing sign-in
     *
     * For popup-blocked we transparently fall back to redirect flow.
     * The browser will leave the page; onAuthStateChanged handles the
     * returning user automatically on next load.
     */
    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider)
      return null // resolves after page reloads post-redirect
    }
    throw err
  }
}

/**
 * Call once on app mount to surface any errors from a redirect sign-in.
 * onAuthStateChanged handles the user automatically; this only surfaces errors.
 */
export async function checkRedirectResult(): Promise<UserCredential | null> {
  return getRedirectResult(auth)
}

export async function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}

export async function sendPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email)
}

/* ─────────────────────────────────────────────────────
   Password strength checker
───────────────────────────────────────────────────── */
export interface PasswordChecks {
  length:    boolean
  uppercase: boolean
  lowercase: boolean
  number:    boolean
  special:   boolean
}

export interface PasswordStrength {
  score:  number   // 0–5
  label:  string
  color:  string
  checks: PasswordChecks
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordChecks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length

  const meta: Record<number, { label: string; color: string }> = {
    0: { label: "",            color: "bg-surface-3" },
    1: { label: "Very weak",   color: "bg-red-500"   },
    2: { label: "Weak",        color: "bg-orange-500"},
    3: { label: "Fair",        color: "bg-amber-400" },
    4: { label: "Good",        color: "bg-emerald-500"},
    5: { label: "Strong",      color: "bg-gold"      },
  }

  return { score, ...meta[score]!, checks }
}

/* ─────────────────────────────────────────────────────
   Human-readable Firebase error messages
───────────────────────────────────────────────────── */
export function getFirebaseErrorMessage(code: string): string {
  const map: Record<string, string> = {
    /* ── Credentials ── */
    "auth/email-already-in-use":                 "An account with this email already exists.",
    "auth/invalid-email":                        "Please enter a valid email address.",
    "auth/weak-password":                        "Password must be at least 6 characters.",
    "auth/user-not-found":                       "No account found with this email.",
    "auth/wrong-password":                       "Incorrect password. Please try again.",
    "auth/invalid-credential":                   "Invalid email or password.",
    "auth/user-disabled":                        "This account has been disabled.",
    "auth/requires-recent-login":                "Please sign in again to continue.",
    "auth/credential-already-in-use":            "This credential is already linked to another account.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email. Try signing in with email/password.",

    /* ── Rate limiting ── */
    "auth/too-many-requests":                    "Too many attempts. Please wait a moment and try again.",

    /* ── Network ── */
    "auth/network-request-failed":               "Network error. Check your connection and try again.",
    "auth/timeout":                              "The request timed out. Check your connection.",

    /* ── Google popup ── */
    "auth/popup-closed-by-user":                 "Sign-in cancelled — the popup was closed.",
    "auth/cancelled-popup-request":              "Another sign-in window is open. Please close it first.",
    "auth/popup-blocked":                        "Popup was blocked by your browser. Please allow popups for this site.",

    /* ── Domain / project config ── */
    "auth/unauthorized-domain":
      "This domain is not authorised for sign-in. Add it in Firebase Console → Authentication → Settings → Authorised domains.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
    "auth/app-not-authorized":
      "Firebase app is not authorised. Check your API key and project settings.",
    "auth/invalid-api-key":
      "Invalid Firebase API key. Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      "Firebase API key is invalid. Get the correct key from Firebase Console → Project Settings → Your Apps.",
    "auth/project-not-found":
      "Firebase project not found. Check NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local.",

    /* ── Internal ── */
    "auth/internal-error":                       "An internal authentication error occurred. Please try again.",
    "auth/invalid-user-token":                   "Session expired. Please sign in again.",
    "auth/user-token-expired":                   "Session expired. Please sign in again.",
  }

  if (!map[code]) {
    console.warn("[Firebase auth] Unmapped error code:", code)
  }

  return map[code] ?? `Authentication error (${code || "unknown"}). Please try again.`
}

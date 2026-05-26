"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth }                          from "@/lib/firebase/config"
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle  as fbSignInWithGoogle,
  signOut           as fbSignOut,
  sendPasswordReset,
  checkRedirectResult,
} from "@/lib/firebase/auth"

/* ─────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────── */
export interface UserProfile {
  firebase_uid: string
  email:        string
  display_name: string | null
  created_at:   string
  updated_at:   string
}

interface AuthContextValue {
  user:             User | null
  profile:          UserProfile | null   // Supabase profile row
  loading:          boolean
  signUp:           (email: string, password: string, name?: string) => Promise<void>
  signIn:           (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut:          () => Promise<void>
  resetPassword:    (email: string) => Promise<void>
}

/* ─────────────────────────────────────────────────────
   Context
───────────────────────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null)

/* ─────────────────────────────────────────────────────
   Profile sync helper
   Called after every login / session restore.
   Fire-and-forget — never blocks the auth flow.
───────────────────────────────────────────────────── */
async function syncProfileToSupabase(
  firebaseUser: User,
  setProfile:   (p: UserProfile | null) => void
) {
  try {
    const token = await firebaseUser.getIdToken()
    const res   = await fetch("/api/account/profile", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        email:        firebaseUser.email        ?? "",
        display_name: firebaseUser.displayName  ?? null,
      }),
    })
    if (res.ok) {
      const { profile } = await res.json()
      setProfile(profile ?? null)
      if (process.env.NODE_ENV === "development") {
        console.log("[Auth] Supabase profile synced ✓", profile)
      }
    } else {
      const body = await res.text().catch(() => "(unreadable)")
      console.error("[Auth] Supabase profile sync failed:", res.status, body)
    }
  } catch (err) {
    // Non-critical — profile sync failure never breaks auth
    console.error("[Auth] Supabase profile sync threw:", err)
  }
}

/* ─────────────────────────────────────────────────────
   Provider
───────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  /*
   * Handle the result of a signInWithRedirect flow.
   * This fires once on mount. If the user was redirected from Google,
   * Firebase returns the credential here; onAuthStateChanged handles
   * the user object automatically. We only need to catch redirect errors.
   */
  useEffect(() => {
    checkRedirectResult().catch((err: unknown) => {
      const code = (err as { code?: string }).code ?? ""
      if (code) {
        console.error("[Auth] Redirect sign-in error:", { code, raw: err })
      }
    })
  }, [])

  /* Subscribe to Firebase auth state — persists across refreshes */
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Auth] onAuthStateChanged listener registered")
    }

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Auth] state changed →", firebaseUser
          ? `uid=${firebaseUser.uid} email=${firebaseUser.email} provider=${firebaseUser.providerData[0]?.providerId}`
          : "signed out"
        )
      }

      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        /* Sync/create Supabase profile on every login & session restore */
        void syncProfileToSupabase(firebaseUser, setProfile)
      } else {
        setProfile(null)
      }
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp:           async (e, p, n) => { await signUpWithEmail(e, p, n) },
        signIn:           async (e, p)    => { await signInWithEmail(e, p)    },
        signInWithGoogle: async ()        => { await fbSignInWithGoogle()     },
        signOut:          async ()        => { await fbSignOut()              },
        resetPassword:    async (e)       => { await sendPasswordReset(e)     },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* ─────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────── */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

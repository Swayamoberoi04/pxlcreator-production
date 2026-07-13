"use client"

import { useState, useEffect, useCallback } from "react"
import Link                                  from "next/link"
import { useAuth }                           from "@/contexts/AuthContext"
import { PasswordModal }                     from "./PasswordModal"
import { cn }                                from "@/lib/utils"

interface UnlockOrBuyPanelProps {
  preset: {
    id:                 string
    slug:               string
    name:               string
    price:              number
    isFree?:            boolean
    downloadFileName?:  string
    youtubeVideoTitle?: string | null
  }
}

type AccessState = "loading" | "locked" | "unlocked"

/**
 * UnlockOrBuyPanel
 *
 * Handles all three access paths:
 *   1. Free preset    → Drive download via /api/preset/download (no password)
 *   2. Paid/bought    → Drive download via /api/preset/download (auth proves ownership)
 *   3. Password       → PasswordModal → /api/preset/download → open Drive URL
 *   4. Neither yet    → Buy Now + Unlock From YouTube buttons
 *
 * Drive URLs and passwords are NEVER stored or exposed client-side.
 * All download logic goes through the secure server endpoint.
 */
export function UnlockOrBuyPanel({ preset }: UnlockOrBuyPanelProps) {
  const { user }                        = useAuth()
  const [access,       setAccess]       = useState<AccessState>("loading")
  const [unlockMethod, setUnlockMethod] = useState<string | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [downloading,  setDownloading]  = useState(false)
  const [dlDone,       setDlDone]       = useState(false)

  /* ── Check access on mount / auth change ── */
  const checkAccess = useCallback(async () => {
    if (!user) { setAccess("locked"); return }
    if (preset.isFree) { setAccess("unlocked"); setUnlockMethod("free"); return }

    try {
      const token = await user.getIdToken()
      const res   = await fetch(`/api/presets/${preset.slug}/access`, {
        headers: { Authorization: `Bearer ${token}` },
        cache:   "no-store",
      })
      const data  = await res.json()
      if (data.access) {
        setAccess("unlocked")
        setUnlockMethod(data.method)
      } else {
        setAccess("locked")
      }
    } catch {
      setAccess("locked")
    }
  }, [user, preset.slug, preset.isFree])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void checkAccess() }, [checkAccess])

  /* ── Secure Drive download via server endpoint ── */
  async function handleDriveDownload() {
    if (!user || downloading) return
    setDownloading(true)

    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/preset/download", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: preset.slug }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        alert(data.error ?? "Download unavailable. Please contact support.")
        setDownloading(false)
        return
      }

      window.open(data.url as string, "_blank", "noopener,noreferrer")
      setDlDone(true)
      setTimeout(() => setDlDone(false), 5000)
    } catch {
      alert("Download failed. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  /* ── Password unlock success — modal already validated + got URL ── */
  function handleUnlockSuccess(url: string) {
    setShowModal(false)
    setAccess("unlocked")
    setUnlockMethod("password")
    window.open(url, "_blank", "noopener,noreferrer")
  }

  /* ── Not signed in ── */
  if (!user) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-5">
        <p className="text-[0.875rem] text-muted/70 leading-relaxed">
          {preset.isFree
            ? "Create a free account to download this preset instantly."
            : "Sign in to buy or unlock this preset with a YouTube password."}
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href={`/signup?from=/presets/${preset.slug}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gold py-3 text-[0.875rem] font-semibold text-background hover:bg-gold/90 active:scale-[0.98] transition-all"
          >
            <UserIcon />
            Create free account
          </Link>
          <Link
            href={`/login?from=/presets/${preset.slug}`}
            className="flex-1 flex items-center justify-center rounded-xl border border-border py-3 text-[0.875rem] font-medium text-muted hover:text-foreground hover:border-border/80 transition-all"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  /* ── Loading ── */
  if (access === "loading") {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/50 bg-surface/40 py-5">
        <div className="h-4 w-4 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
        <span className="text-[0.8125rem] text-muted/50">Checking access…</span>
      </div>
    )
  }

  /* ── UNLOCKED — show download button ── */
  if (access === "unlocked") {
    return (
      <div className="flex flex-col gap-3">
        {/* Method badge */}
        {unlockMethod && unlockMethod !== "free" && (
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[0.8125rem] font-medium",
            unlockMethod === "payment"
              ? "border border-gold/25 bg-gold/[0.07] text-gold/90"
              : "border border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400"
          )}>
            {unlockMethod === "payment" ? <CardIcon /> : <UnlockIcon />}
            {unlockMethod === "payment" ? "Purchased — download available" : "✓ Preset Unlocked"}
          </div>
        )}

        <button
          type="button"
          onClick={handleDriveDownload}
          disabled={downloading || dlDone}
          className={cn(
            "flex w-full items-center justify-center gap-2.5 rounded-xl py-4",
            "text-[0.9375rem] font-semibold transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dlDone
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : downloading
                ? "bg-gold/60 text-background cursor-wait"
                : "bg-gold text-background hover:bg-gold/90 active:scale-[0.98]"
          )}
        >
          {downloading && <SpinnerIcon />}
          {!downloading && (dlDone ? <CheckIcon /> : <DownloadIcon />)}
          {downloading ? "Preparing download…" : dlDone ? "Download started!" : "Download Preset"}
        </button>
      </div>
    )
  }

  /* ── LOCKED — show Buy + Unlock options ── */
  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Buy Now */}
        <Link
          href={`/checkout?preset=${preset.slug}`}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gold py-4 text-[0.9375rem] font-semibold text-background hover:bg-gold/90 active:scale-[0.98] transition-all"
        >
          <CartIcon />
          Buy Preset — ${preset.price}
        </Link>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <span className="flex-1 h-px bg-border/60" />
          <span className="text-[0.7rem] font-medium text-muted/35 tracking-widest uppercase">or</span>
          <span className="flex-1 h-px bg-border/60" />
        </div>

        {/* Unlock from YouTube */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border/70 bg-surface/50 py-3.5 text-[0.875rem] font-semibold text-foreground/80 hover:border-gold/40 hover:text-gold hover:bg-gold/[0.04] active:scale-[0.98] transition-all"
        >
          <YoutubeIcon />
          Unlock From YouTube
        </button>

        {preset.youtubeVideoTitle && (
          <p className="text-center text-[0.7rem] text-muted/40 leading-snug px-2">
            Password available in: <span className="text-muted/60">{preset.youtubeVideoTitle}</span>
          </p>
        )}
      </div>

      {showModal && (
        <PasswordModal
          presetName={preset.name}
          youtubeVideoTitle={preset.youtubeVideoTitle}
          slug={preset.slug}
          onClose={() => setShowModal(false)}
          onSuccess={handleUnlockSuccess}
          getToken={() => user.getIdToken()}
        />
      )}
    </>
  )
}

/* ── Icons ── */
function DownloadIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function CartIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
}
function YoutubeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/></svg>
}
function UnlockIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
}
function CardIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
}
function UserIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function SpinnerIcon() {
  return <div className="h-4 w-4 rounded-full border-2 border-background/30 border-t-background animate-spin" aria-hidden="true" />
}

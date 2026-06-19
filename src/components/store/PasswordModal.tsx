"use client"

import { useState, useRef, useEffect } from "react"
import { cn }                           from "@/lib/utils"

interface PasswordModalProps {
  presetName:         string
  youtubeVideoTitle?: string | null
  onClose:            () => void
  onSuccess:          () => void
  slug:               string
  getToken:           () => Promise<string>
}

export function PasswordModal({
  presetName,
  youtubeVideoTitle,
  onClose,
  onSuccess,
  slug,
  getToken,
}: PasswordModalProps) {
  const [password, setPassword]  = useState("")
  const [loading,  setLoading]   = useState(false)
  const [error,    setError]     = useState<string | null>(null)
  const inputRef                 = useRef<HTMLInputElement>(null)

  /* Focus input on mount */
  useEffect(() => { inputRef.current?.focus() }, [])

  /* Close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const res   = await fetch(`/api/presets/${slug}/validate-password`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ password: password.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.")
        setLoading(false)
        return
      }

      onSuccess()
    } catch {
      setError("Network error. Please check your connection.")
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-background/95 shadow-[0_0_80px_rgba(201,168,76,0.08)] backdrop-blur-md p-6 flex flex-col gap-5">

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full border border-border/50 text-muted/50 hover:text-foreground hover:border-border transition-colors"
        >
          <CloseIcon />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-2 pr-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold">
              <YoutubeIcon />
            </span>
            <div>
              <p id="modal-title" className="text-[0.9375rem] font-semibold text-foreground leading-tight">
                Unlock from YouTube
              </p>
              <p className="text-[0.75rem] text-muted/60">{presetName}</p>
            </div>
          </div>

          {youtubeVideoTitle && (
            <div className="rounded-xl border border-gold/20 bg-gold/[0.05] px-3.5 py-2.5 mt-1">
              <p className="text-[0.75rem] text-muted/50 leading-none mb-1">Find the password in:</p>
              <p className="text-[0.8125rem] font-medium text-gold/90 leading-snug">{youtubeVideoTitle}</p>
            </div>
          )}

          <p className="text-[0.8125rem] text-muted/60 leading-relaxed">
            Watch the YouTube video to find the unlock password, then enter it below.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unlock-password" className="text-[0.75rem] font-medium text-muted/60 tracking-wide">
              Unlock Password
            </label>
            <input
              ref={inputRef}
              id="unlock-password"
              type="text"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="Enter password from video…"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "w-full rounded-xl border bg-surface px-4 py-3 text-[0.9375rem] font-mono tracking-wider text-foreground",
                "placeholder:text-muted/30 placeholder:font-sans placeholder:tracking-normal",
                "outline-none transition-colors",
                "focus:border-gold/50 focus:ring-1 focus:ring-gold/20",
                error ? "border-red-500/60" : "border-border"
              )}
            />
            {error && (
              <p className="flex items-center gap-1.5 text-[0.75rem] text-red-400" role="alert">
                <ErrorIcon />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className={cn(
              "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5",
              "text-[0.9375rem] font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              loading || !password.trim()
                ? "bg-gold/40 text-background/70 cursor-not-allowed"
                : "bg-gold text-background hover:bg-gold/90 active:scale-[0.98]"
            )}
          >
            {loading && <SpinnerIcon />}
            {loading ? "Checking password…" : "Unlock Preset"}
          </button>
        </form>

        <p className="text-center text-[0.75rem] text-muted/35">
          Password is case-sensitive. Check the video description for hints.
        </p>
      </div>
    </div>
  )
}

/* ── Icons ── */
function CloseIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function YoutubeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/></svg>
}
function ErrorIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function SpinnerIcon() {
  return <div className="h-4 w-4 rounded-full border-2 border-background/30 border-t-background animate-spin" aria-hidden="true" />
}

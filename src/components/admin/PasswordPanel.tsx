"use client"

/**
 * PasswordPanel — admin UI for managing a preset's unlock password.
 *
 * Self-contained: owns its own fetch/save/generate state.
 * Communicates only with /api/admin/presets/[id]/password.
 * The password is never written to public API responses.
 */

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface PasswordMeta {
  unlock_password:      string | null
  password_updated_at:  string | null
  password_updated_by:  string | null
  unlock_count:         number
}

interface PasswordPanelProps {
  presetId: string
}

/* Unambiguous character set — removes 0/O, 1/I/l which confuse users */
const GEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generatePassword(length = 6): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  let result = "PXL-"
  for (let i = 0; i < length; i++) {
    result += GEN_CHARS[array[i] % GEN_CHARS.length]
  }
  return result
}

type Strength = "none" | "weak" | "medium" | "strong"

function getStrength(pwd: string): { level: Strength; label: string; color: string } {
  if (!pwd) return { level: "none", label: "", color: "" }
  if (pwd.startsWith("PXL-") && pwd.length >= 10) return { level: "strong", label: "Strong",  color: "text-emerald-400" }
  if (pwd.length >= 8)                              return { level: "medium", label: "Medium",  color: "text-gold" }
  return                                                   { level: "weak",   label: "Weak",    color: "text-red-400" }
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function PasswordPanel({ presetId }: PasswordPanelProps) {
  const [meta,    setMeta]    = useState<PasswordMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [pwd,     setPwd]     = useState("")
  const [revealed,setRevealed]= useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  /* ── Load current password + metadata ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/presets/${presetId}/password`)
      const json = await res.json()
      if (json.success) {
        setMeta(json.data)
        setPwd(json.data.unlock_password ?? "")
      } else {
        setError(json.error ?? "Failed to load password.")
      }
    } catch {
      setError("Network error loading password.")
    } finally {
      setLoading(false)
    }
  }, [presetId])

  useEffect(() => { load() }, [load])

  /* ── Save ── */
  async function handleSave() {
    if (!pwd.trim()) { setError("Password cannot be empty."); return }
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/presets/${presetId}/password`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password: pwd.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setSaved(true)
        setMeta((prev) => prev ? {
          ...prev,
          unlock_password:     pwd.trim(),
          password_updated_at: json.data.password_updated_at,
          password_updated_by: json.data.password_updated_by,
        } : prev)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(json.error ?? "Save failed.")
      }
    } catch {
      setError("Network error saving password.")
    } finally {
      setSaving(false)
    }
  }

  /* ── Generate ── */
  function handleGenerate() {
    const newPwd = generatePassword(6)
    setPwd(newPwd)
    setRevealed(true)   // auto-reveal so admin can see what was generated
    setSaved(false)
    setError(null)
  }

  /* ── Copy ── */
  async function handleCopy() {
    if (!pwd) return
    try {
      await navigator.clipboard.writeText(pwd)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Clipboard access denied.")
    }
  }

  const strength = getStrength(pwd)

  /* ── Strength bar segments ── */
  const segments: Strength[] = ["weak", "medium", "strong"]
  const segmentActive = (s: Strength) => {
    const order: Strength[] = ["none", "weak", "medium", "strong"]
    return order.indexOf(strength.level) >= order.indexOf(s)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse mb-3" />
        <div className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col gap-5">

      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <label className="text-[0.75rem] text-white/70 tracking-widest">( Preset Password )</label>
          <p className="text-[0.8125rem] text-white/50">
            Users enter this after watching the YouTube video to unlock the download.
          </p>
        </div>
        {/* Unlock count badge */}
        {meta && (
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1.5">
            <span className="text-[0.65rem] text-white/50">Unlocks</span>
            <span className="text-[0.8rem] font-semibold text-gold">{meta.unlock_count.toLocaleString()}</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Password input row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Input */}
          <div className="relative flex-1">
            <input
              type={revealed ? "text" : "password"}
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setSaved(false); setError(null) }}
              placeholder="No password set — generate or type one"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 pr-10 text-[0.875rem] text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors font-mono tracking-wider"
              aria-label="Preset unlock password"
            />
          </div>

          {/* Reveal / Hide */}
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            title={revealed ? "Hide password" : "Reveal password"}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white/90 hover:border-white/20 transition-all shrink-0"
            aria-label={revealed ? "Hide password" : "Reveal password"}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>

          {/* Copy */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!pwd}
            title="Copy to clipboard"
            className={cn(
              "h-10 w-10 rounded-xl border flex items-center justify-center transition-all shrink-0",
              copied
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white/90 hover:border-white/20 disabled:opacity-30"
            )}
            aria-label="Copy password"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>

          {/* Generate */}
          <button
            type="button"
            onClick={handleGenerate}
            title="Generate a random PXL password"
            className="h-10 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-[0.75rem] font-medium text-white/70 hover:text-white/92 hover:border-gold/30 hover:bg-gold/[0.04] transition-all shrink-0 whitespace-nowrap"
          >
            Generate
          </button>
        </div>

        {/* Strength indicator */}
        {pwd && (
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1">
              {segments.map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 w-8 rounded-full transition-colors duration-300",
                    segmentActive(s)
                      ? s === "strong" ? "bg-emerald-500"
                        : s === "medium" ? "bg-gold"
                        : "bg-red-500"
                      : "bg-white/10"
                  )}
                />
              ))}
            </div>
            <span className={cn("text-[0.7rem] font-medium", strength.color)}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      {/* Password format hint */}
      {pwd && pwd.startsWith("PXL-") && (
        <p className="text-[0.7rem] text-white/40 -mt-2">
          PXL format — 6 unambiguous characters after the prefix
        </p>
      )}

      {/* Save row */}
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/[0.06]">
        {/* Metadata */}
        <div className="flex flex-col gap-0.5">
          {meta?.password_updated_at ? (
            <>
              <p className="text-[0.7rem] text-white/40">
                Last changed: <span className="text-white/60">{formatDate(meta.password_updated_at)}</span>
              </p>
              {meta.password_updated_by && (
                <p className="text-[0.7rem] text-white/40">
                  By: <span className="text-white/60">{meta.password_updated_by}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-[0.7rem] text-white/40">Password has never been set</p>
          )}
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 shrink-0">
          {saved && <span className="text-[0.8125rem] text-emerald-400">✓ Saved</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !pwd.trim()}
            className="rounded-xl bg-gold/90 text-background font-semibold px-4 py-2 text-[0.8125rem] hover:bg-gold transition-all disabled:opacity-40 active:scale-95"
          >
            {saving ? "Saving…" : "Save Password"}
          </button>
        </div>
      </div>

    </div>
  )
}

/* ── Icons ── */
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

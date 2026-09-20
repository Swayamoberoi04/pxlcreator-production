"use client"

/**
 * Report / block / mute menu — the public entry point into moderation.
 *
 * Reuses the content_reports queue that has existed since migration 012 but
 * had no submission path until Phase 5.6, and the user_blocks table from
 * migration 048.
 *
 * Privacy: the person being reported is never told who reported them, and
 * this component never displays report counts or moderator state.
 */

import { useState } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "@/contexts/AuthContext"

export type ReportTargetType =
  | "post" | "comment" | "showcase" | "profile" | "channel" | "project" | "event" | "resource"

const REASONS: { id: string; label: string }[] = [
  { id: "spam",            label: "Spam or scam" },
  { id: "harassment",      label: "Harassment or bullying" },
  { id: "hate_speech",     label: "Hate speech" },
  { id: "sexual_content",  label: "Sexual content" },
  { id: "violence",        label: "Violence or threats" },
  { id: "misinformation",  label: "Misinformation" },
  { id: "impersonation",   label: "Impersonation" },
  { id: "stolen_work",     label: "Stolen work / copyright" },
  { id: "other",           label: "Something else" },
]

interface ReportMenuProps {
  targetType: ReportTargetType
  targetId: string
  /** Set for creator-owned content so Block/Mute can be offered too. */
  targetUid?: string
  className?: string
}

export function ReportMenu({ targetType, targetId, targetUid, className }: ReportMenuProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"menu" | "report">("menu")
  const [reason, setReason] = useState("spam")
  const [details, setDetails] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState("")

  const isSelf = !!targetUid && user?.uid === targetUid
  if (!user || isSelf) return null

  function reset() {
    setOpen(false); setMode("menu"); setReason("spam"); setDetails(""); setDone(null); setError("")
  }

  async function authHeaders() {
    const token = await user!.getIdToken()
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  }

  async function submitReport() {
    setBusy(true); setError("")
    try {
      const res = await fetch("/api/community/report", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details: details || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? data.errors?.[0]?.message ?? "Failed to report.")
      setDone(data.already_reported
        ? "You've already reported this. Our moderators have it."
        : "Report submitted. Moderators will review it.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report.")
    } finally { setBusy(false) }
  }

  async function blockUser(blockType: "block" | "mute") {
    if (!targetUid) return
    setBusy(true); setError("")
    try {
      const res = await fetch("/api/community/block", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ target_uid: targetUid, block_type: blockType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed.")
      setDone(blockType === "block"
        ? "Blocked. You won't see each other, and any follows between you were removed."
        : "Muted. You won't see their content — they aren't notified.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.")
    } finally { setBusy(false) }
  }

  const sheet = open && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4" onClick={reset}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-black/90 p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <p className="text-sm text-foreground">{done}</p>
            <button onClick={reset} className="self-end text-xs text-gold hover:underline">Close</button>
          </>
        ) : mode === "menu" ? (
          <>
            <p className="font-display font-bold text-sm text-foreground">Report or hide</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={() => setMode("report")}
              className="text-left text-sm text-muted/92 hover:text-foreground rounded-lg px-3 py-2 hover:bg-surface-2 transition-colors">
              🚩 Report this {targetType}
            </button>
            {targetUid && (
              <>
                <button onClick={() => blockUser("mute")} disabled={busy}
                  className="text-left text-sm text-muted/92 hover:text-foreground rounded-lg px-3 py-2 hover:bg-surface-2 transition-colors disabled:opacity-50">
                  🔇 Mute this creator
                  <span className="block text-[0.6875rem] text-muted/60">You stop seeing them. They aren&apos;t told.</span>
                </button>
                <button onClick={() => blockUser("block")} disabled={busy}
                  className="text-left text-sm text-red-400 hover:text-red-300 rounded-lg px-3 py-2 hover:bg-surface-2 transition-colors disabled:opacity-50">
                  🚫 Block this creator
                  <span className="block text-[0.6875rem] text-muted/60">Neither of you sees the other. Follows are removed.</span>
                </button>
              </>
            )}
            <button onClick={reset} className="self-end text-xs text-muted/70 hover:text-foreground mt-1">Cancel</button>
          </>
        ) : (
          <>
            <p className="font-display font-bold text-sm text-foreground">Report this {targetType}</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/40">
              {REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <textarea value={details} onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              placeholder="Anything else moderators should know? (optional)" rows={3}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none" />
            <p className="text-[0.6875rem] text-muted/60">
              Your report is private — the person you&apos;re reporting is never told who reported them.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setMode("menu")} className="text-xs text-muted/70 hover:text-foreground px-2 py-1">Back</button>
              <button onClick={submitReport} disabled={busy}
                className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-black hover:bg-gold/90 disabled:opacity-50 transition-colors">
                {busy ? "Sending…" : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        aria-label="Report or hide"
        title="Report or hide"
        className={className ?? "text-muted/40 hover:text-muted/80 transition-colors text-sm leading-none px-1"}
      >
        ⋯
      </button>
      {sheet}
    </>
  )
}

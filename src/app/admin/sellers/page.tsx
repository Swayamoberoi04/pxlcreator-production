"use client"

/**
 * /admin/sellers — Phase 5.10.2 creator seller review queue.
 *
 * Every decision goes through PATCH /api/admin/sellers/[uid], which re-checks
 * eligibility server-side and records the acting admin from the session. This
 * page never writes creator_seller_accounts directly.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { SellerAccountStatus } from "@/types/database"
import type { SellerAdminAction, SellerAdminRow } from "@/types/monetization"

const FILTERS: { value: SellerAccountStatus; label: string }[] = [
  { value: "applied",   label: "Applied" },
  { value: "approved",  label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected",  label: "Rejected" },
]

const ACTIONS: Record<SellerAccountStatus, { action: SellerAdminAction; label: string; needsNote: boolean; tone: string }[]> = {
  applied:   [
    { action: "approve", label: "Approve", needsNote: false, tone: "bg-gold text-black" },
    { action: "reject",  label: "Reject",  needsNote: true,  tone: "border border-red-500/40 text-red-300" },
  ],
  approved:  [{ action: "suspend",   label: "Suspend",   needsNote: true,  tone: "border border-red-500/40 text-red-300" }],
  suspended: [{ action: "reinstate", label: "Reinstate", needsNote: false, tone: "bg-gold text-black" }],
  rejected:  [],
}

export default function AdminSellersPage() {
  const [status, setStatus] = useState<SellerAccountStatus>("applied")
  const [rows, setRows] = useState<SellerAdminRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [rowError, setRowError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/sellers?status=${status}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Failed to load sellers")
      setRows(d.sellers ?? [])
      setCounts(d.counts ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sellers")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { setTimeout(() => void load(), 0) }, [load])

  async function act(uid: string, action: SellerAdminAction, needsNote: boolean) {
    const note = (notes[uid] ?? "").trim()
    if (needsNote && !note) { setRowError((e) => ({ ...e, [uid]: "Add a note first — the creator will see it." })); return }
    setBusy(uid)
    setRowError((e) => ({ ...e, [uid]: "" }))
    try {
      const r = await fetch(`/api/admin/sellers/${encodeURIComponent(uid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Action failed")
      await load()
    } catch (e) {
      setRowError((er) => ({ ...er, [uid]: e instanceof Error ? e.message : "Action failed" }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Creator Sellers</h1>
          <p className="text-small text-muted mt-0.5">Review applications. Eligibility is re-checked live on approve.</p>
        </div>
        <Link href="/admin" className="text-small text-muted hover:text-foreground transition-colors">← Dashboard</Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={[
              "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
              status === f.value ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-surface text-muted hover:text-foreground",
            ].join(" ")}
          >
            {f.label} {counts[f.value] !== undefined ? `(${counts[f.value]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl border border-border bg-surface animate-pulse" />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          {error} <button onClick={() => void load()} className="ml-2 underline">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted">
          No {status} sellers.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((s) => (
            <li key={s.firebase_uid} className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {s.profile?.display_name ?? "No profile"}{" "}
                    {s.profile?.username && (
                      <Link href={`/community/${s.profile.username}`} target="_blank" className="text-gold text-sm hover:underline">@{s.profile.username}</Link>
                    )}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Applied {new Date(s.applied_at).toLocaleString()}
                    {s.reviewed_at && ` · Reviewed ${new Date(s.reviewed_at).toLocaleString()} by ${s.reviewed_by ?? "—"}`}
                  </p>
                  {s.review_note && <p className="text-xs text-muted mt-1">Note: {s.review_note}</p>}
                </div>
                <span className={`text-xs font-semibold rounded-full px-3 py-1 ${s.eligibility.eligible ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-300"}`}>
                  {s.eligibility.eligible ? "Eligible now" : "Not eligible now"}
                </span>
              </div>

              <ul className="grid gap-1.5 sm:grid-cols-2">
                {s.eligibility.checks.map((c) => (
                  <li key={c.id} className="text-xs flex gap-2">
                    <span aria-hidden className={c.passed ? "text-green-400" : "text-red-300"}>{c.passed ? "✓" : "✕"}</span>
                    <span className="text-foreground/85">{c.label}<span className="text-muted"> — {c.detail}</span></span>
                  </li>
                ))}
              </ul>

              {ACTIONS[s.status].length > 0 && (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={notes[s.firebase_uid] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [s.firebase_uid]: e.target.value }))}
                    placeholder="Note to the creator (required to reject or suspend)"
                    maxLength={1000}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  <div className="flex flex-wrap gap-2">
                    {ACTIONS[s.status].map((a) => (
                      <button
                        key={a.action}
                        onClick={() => void act(s.firebase_uid, a.action, a.needsNote)}
                        disabled={busy === s.firebase_uid || (a.action === "approve" && !s.eligibility.eligible)}
                        className={`min-h-10 rounded-full px-4 text-sm font-semibold disabled:opacity-40 ${a.tone}`}
                      >
                        {busy === s.firebase_uid ? "Working…" : a.label}
                      </button>
                    ))}
                  </div>
                  {rowError[s.firebase_uid] && <p role="alert" className="text-xs text-red-300">{rowError[s.firebase_uid]}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

"use client"

/**
 * /community/sell — Phase 5.10.2 seller onboarding.
 *
 * Shows the member's live eligibility (computed server-side) and lets them
 * apply. Nothing here can make anyone a seller: the page only calls
 * POST /api/creator/seller, which re-checks eligibility and can only ever
 * produce 'applied'. Approval is an admin action.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import type { EligibilityCheckId, SellerStatusResponse } from "@/types/monetization"

const FIX_LINKS: Partial<Record<EligibilityCheckId, { href: string; label: string }>> = {
  public_profile: { href: "/community/me", label: "Edit profile" },
  has_showcase: { href: "/community/showcase", label: "Go to Showcase" },
}

export default function SellPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<SellerStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?from=/community/sell")
  }, [authLoading, user, router])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/creator/seller", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
      if (!r.ok) throw new Error()
      setData(await r.json())
    } catch {
      setError("We couldn't load your seller status.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { if (user) setTimeout(() => void load(), 0) }, [user, load])

  async function apply() {
    if (!user) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const r = await fetch("/api/creator/seller", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
      const d = await r.json()
      if (!r.ok) {
        setSubmitError(d.error ?? "Couldn't submit your application.")
        if (d.eligibility && data) setData({ ...data, eligibility: d.eligibility })
        return
      }
      await load()
    } catch {
      setSubmitError("Couldn't submit your application. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !user || loading) {
    return <div className="max-w-2xl mx-auto w-full h-72 rounded-2xl bg-surface border border-border animate-pulse" />
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto w-full text-center py-16 flex flex-col items-center gap-3">
        <p className="text-sm text-muted/90">{error || "Something went wrong."}</p>
        <button onClick={() => void load()} className="min-h-10 px-4 rounded-full bg-gold text-black text-sm font-semibold">Try again</button>
      </div>
    )
  }

  const { account, eligibility } = data
  const status = account?.status
  const canApply = !status || account?.can_apply_now === true

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Sell on PXL</h1>
        <p className="text-sm text-muted/85 mt-1">
          Approved creators will be able to sell their own presets. Every seller is reviewed by the PXL team.
        </p>
      </div>

      {status && (
        <section
          aria-label="Application status"
          className={[
            "rounded-2xl border p-5",
            status === "approved" ? "border-green-500/30 bg-green-500/10"
              : status === "applied" ? "border-gold/30 bg-gold/5"
              : "border-red-500/30 bg-red-500/10",
          ].join(" ")}
        >
          <p className="font-semibold text-foreground">
            {status === "approved" && "You're an approved seller."}
            {status === "applied" && "Application received — we're reviewing it."}
            {status === "rejected" && "Your application wasn't approved."}
            {status === "suspended" && "Your seller account is suspended."}
          </p>
          <p className="text-sm text-muted/90 mt-1">
            {status === "approved" && "Selling tools are coming next. Payouts are not enabled yet."}
            {status === "applied" && `Submitted ${new Date(account!.applied_at).toLocaleDateString()}.`}
            {status === "rejected" && account?.can_reapply_at && !account.can_apply_now &&
              `You can apply again from ${new Date(account.can_reapply_at).toLocaleDateString()}.`}
            {status === "suspended" && "Contact support if you think this is a mistake."}
          </p>
          {account?.review_note && <p className="text-sm text-foreground/85 mt-2">Note from the team: {account.review_note}</p>}
        </section>
      )}

      <section aria-label="Requirements" className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">Requirements</h2>
        <ul className="flex flex-col gap-3">
          {eligibility.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-0.5 size-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${c.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/15 text-red-300"}`}
              >
                {c.passed ? "✓" : "✕"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground">
                  {c.label}<span className="sr-only">{c.passed ? " — met" : " — not met"}</span>
                </span>
                <span className="block text-xs text-muted/85">{c.detail}</span>
              </span>
              {!c.passed && FIX_LINKS[c.id] && (
                <Link href={FIX_LINKS[c.id]!.href} className="shrink-0 text-xs text-gold hover:underline min-h-10 inline-flex items-center">
                  {FIX_LINKS[c.id]!.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canApply && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => void apply()}
            disabled={!eligibility.eligible || submitting}
            className="self-start min-h-11 px-6 rounded-full bg-gold text-black font-semibold disabled:opacity-40"
          >
            {submitting ? "Submitting…" : status === "rejected" ? "Apply again" : "Apply to sell"}
          </button>
          {!eligibility.eligible && <p className="text-xs text-muted/85">Meet every requirement above to apply.</p>}
          {submitError && <p role="alert" className="text-sm text-red-300">{submitError}</p>}
        </div>
      )}
    </div>
  )
}

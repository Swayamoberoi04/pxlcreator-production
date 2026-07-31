"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter }    from "next/navigation"
import Link             from "next/link"
import { useAuth }      from "@/contexts/AuthContext"
import { Container }    from "@/components/layout/Container"
import { PLANS }        from "@/lib/subscriptions/plans"
import { cn }           from "@/lib/utils"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

/* ── Types ── */
interface Subscription {
  id:                   string
  plan_id:              string
  billing_cycle:        "monthly" | "yearly"
  status:               string
  current_period_start: string
  current_period_end:   string
  amount_usd:           number
  amount_inr:           number
}

interface PaymentRecord {
  id:            string
  plan_id:       string
  billing_cycle: string
  amount_usd:    number
  amount_inr:    number
  status:        string
  period_start:  string | null
  period_end:    string | null
  created_at:    string
}

type CancelState = "idle" | "confirming" | "cancelling" | "cancelled"

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function BillingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [history,      setHistory]      = useState<PaymentRecord[]>([])
  const [dataLoading,  setDataLoading]  = useState(true)
  const [cancelState,  setCancelState]  = useState<CancelState>("idle")
  const [cancelError,  setCancelError]  = useState<string | null>(null)

  /* Redirect if not logged in */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?from=/account/billing")
    }
  }, [user, authLoading, router])

  /* Fetch subscription data */
  useEffect(() => {
    if (!user) return
    fetch(`/api/subscriptions/status?uid=${user.uid}`)
      .then((r) => r.json())
      .then((data) => {
        setSubscription(data.subscription ?? null)
        setHistory(data.history ?? [])
      })
      .catch(() => null)
      .finally(() => setDataLoading(false))
  }, [user])

  /* Cancel handler */
  const handleCancel = useCallback(async () => {
    if (!user || !subscription || cancelState === "cancelling") return
    setCancelState("cancelling")
    setCancelError(null)

    try {
      const res  = await fetch("/api/subscriptions/cancel", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid:    user.uid,
          subscription_id: subscription.id,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setCancelError(data.error ?? "Failed to cancel subscription")
        setCancelState("confirming")
        return
      }

      setSubscription((prev) => prev ? { ...prev, status: "cancelled" } : null)
      setCancelState("cancelled")
    } catch {
      setCancelError("Network error. Please try again.")
      setCancelState("confirming")
    }
  }, [user, subscription, cancelState])

  /* ── Loading skeleton ── */
  if (authLoading || dataLoading) {
    return (
      <div className="w-full bg-background min-h-[70vh]">
        <Container className="py-12 sm:py-16">
          <div className="max-w-2xl mx-auto space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse border border-border" />
            ))}
          </div>
        </Container>
      </div>
    )
  }

  if (!user) return null

  const planInfo = subscription ? PLANS[subscription.plan_id as "creator" | "pro"] : null
  const isActive = subscription?.status === "active"
  const isCancelled = subscription?.status === "cancelled"

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <div className="relative w-full bg-background overflow-hidden">
      <LuminousEnvironment variant="gold" intensity={0.6} />
      <GrainOverlay opacity={0.014} zIndex={1} />
      <Container className="relative z-10 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">

          {/* Page header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/account"
              className="text-[0.8125rem] text-muted/85 hover:text-foreground transition-colors"
            >
              â† Account
            </Link>
            <span className="text-border" aria-hidden="true">|</span>
            <h1 className="font-display font-bold text-xl text-foreground">Billing</h1>
          </div>

          {/* ── No subscription ── */}
          {!subscription && (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <div className="flex justify-center mb-5">
                <div className="h-16 w-16 rounded-2xl bg-gold/10 flex items-center justify-center text-gold">
                  <StarIcon />
                </div>
              </div>
              <h2 className="font-display font-bold text-lg text-foreground mb-2">
                No active subscription
              </h2>
              <p className="text-[0.875rem] text-muted/85 mb-6">
                Upgrade to Creator or Pro for unlimited preset downloads, full courses, and more.
              </p>
              <Link
                href="/premium#plans"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3 text-sm font-semibold text-background hover:bg-gold-dim transition-colors shadow-[0_0_20px_rgba(255,214,10,0.15)]"
              >
                View Plans
              </Link>
            </div>
          )}

          {/* ── Active / cancelled subscription ── */}
          {subscription && (
            <div className="flex flex-col gap-5">

              {/* Cancellation success */}
              {cancelState === "cancelled" && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3">
                  <CheckIcon className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Subscription cancelled</p>
                    <p className="text-[0.8125rem] text-muted/92 mt-0.5">
                      You&apos;ll keep access until{" "}
                      <strong className="text-foreground">
                        {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Cancel error */}
              {cancelError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
                  <AlertCircle className="text-red-400 shrink-0" />
                  <p className="text-[0.8125rem] text-red-400">{cancelError}</p>
                </div>
              )}

              {/* Plan card */}
              <div className={cn(
                "rounded-2xl border bg-surface overflow-hidden",
                isActive ? "border-gold/30" : "border-border"
              )}>
                {isActive && (
                  <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                )}
                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        <h2 className="font-display font-bold text-xl text-foreground">
                          {planInfo?.name ?? subscription.plan_id} Plan
                        </h2>
                        <span className={cn(
                          "text-[0.65rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-0.5",
                          isActive   ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : isCancelled ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          : "bg-surface-2 text-muted border border-border"
                        )}>
                          {isActive ? "Active" : subscription.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[0.875rem] text-muted/85 capitalize">
                        {subscription.billing_cycle} billing ·{" "}
                        ${subscription.amount_usd}/
                        {subscription.billing_cycle === "yearly" ? "yr" : "mo"}
                      </p>
                    </div>
                  </div>

                  {/* Period */}
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-surface-2/50 border border-border/60 p-4">
                      <p className="text-[0.7rem] font-bold tracking-[0.15em] uppercase text-muted/85 mb-1">
                        Started
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(subscription.current_period_start).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-2/50 border border-border/60 p-4">
                      <p className="text-[0.7rem] font-bold tracking-[0.15em] uppercase text-muted/85 mb-1">
                        {isCancelled ? "Access Until" : "Renews / Expires"}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {isActive && cancelState !== "cancelled" && (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        href="/premium#plans"
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-background hover:bg-gold-dim transition-colors"
                      >
                        Upgrade Plan
                      </Link>

                      {cancelState === "idle" && (
                        <button
                          type="button"
                          onClick={() => setCancelState("confirming")}
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted hover:text-destructive hover:border-destructive/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Cancel Subscription
                        </button>
                      )}

                      {cancelState === "confirming" && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-2.5">
                          <p className="text-[0.8125rem] text-foreground/92">Cancel plan?</p>
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[0.8125rem] font-semibold text-red-400 hover:text-red-300 transition-colors focus-visible:outline-none"
                          >
                            Yes, cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCancelState("idle"); setCancelError(null) }}
                            className="text-[0.8125rem] text-muted/85 hover:text-foreground transition-colors focus-visible:outline-none"
                          >
                            Keep plan
                          </button>
                        </div>
                      )}

                      {cancelState === "cancelling" && (
                        <div className="flex items-center gap-2 text-muted/85 text-[0.8125rem]">
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-muted/30 border-t-muted/70 animate-spin" />
                          Cancelling…
                        </div>
                      )}
                    </div>
                  )}

                  {isCancelled && (
                    <div className="mt-5">
                      <Link
                        href="/premium#plans"
                        className="inline-flex items-center gap-2 rounded-xl bg-gold/10 border border-gold/20 text-gold px-5 py-2.5 text-sm font-semibold hover:bg-gold/15 transition-colors"
                      >
                        Resubscribe
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Payment history ── */}
              {history.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-display font-bold text-sm text-foreground">Payment History</h3>
                  </div>
                  <ul className="divide-y divide-border">
                    {history.map((payment) => {
                      const pInfo = PLANS[payment.plan_id as "creator" | "pro"]
                      return (
                        <li key={payment.id} className="flex items-center gap-4 px-6 py-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                            <ReceiptIcon />
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {pInfo?.name ?? payment.plan_id} — {payment.billing_cycle}
                            </p>
                            <p className="text-[0.75rem] text-muted/85">
                              {new Date(payment.created_at).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                              {payment.period_end && (
                                <> · Until {new Date(payment.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display font-bold text-sm text-gold">
                              ${payment.amount_usd}
                            </p>
                            <p className="text-[0.7rem] text-muted/85">
                              ₹{payment.amount_inr.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

            </div>
          )}

        </div>
      </Container>
    </div>
  )
}

/* ── Icons ── */
function CheckIcon({ className = "" }: { className?: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function AlertCircle({ className = "" }: { className?: string }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function StarIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}
function ReceiptIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="16" y1="8" x2="8" y2="8"/><line x1="16" y1="12" x2="8" y2="12"/><line x1="12" y1="16" x2="8" y2="16"/></svg>
}


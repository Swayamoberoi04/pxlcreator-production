"use client"

/**
 * /admin/reviews — Review moderation
 *
 * Lists submitted reviews, lets admin approve or reject each one.
 * Approve → sets is_approved = true (triggers rating recalculation)
 * Reject  → permanently deletes the review
 */

import { useState, useEffect, useCallback } from "react"
import { cn }                                from "@/lib/utils"

/* ── Types ──────────────────────────────────────────────── */
type ReviewStatus = "pending" | "approved" | "all"

interface AdminReview {
  id:                   string
  preset_id:            string
  firebase_uid:         string
  email:                string
  rating:               number
  review_text:          string | null
  is_approved:          boolean
  is_verified_purchase: boolean
  created_at:           string
  presets:              { title: string; slug: string } | null
}

/* ── Page ───────────────────────────────────────────────── */
export default function AdminReviewsPage() {
  const [reviews,  setReviews]  = useState<AdminReview[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<ReviewStatus>("pending")
  const [acting,   setActing]   = useState<string | null>(null)  // id of review being actioned
  const [error,    setError]    = useState<string | null>(null)

  const loadReviews = useCallback(async (status: ReviewStatus) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/reviews?status=${status}&limit=50`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Failed to load"); return }
      setReviews(json.reviews ?? [])
      setTotal(json.total ?? 0)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadReviews(filter) }, [filter, loadReviews])

  async function handleAction(id: string, action: "approve" | "reject") {
    setActing(id)
    try {
      const res  = await fetch("/api/admin/reviews", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, action }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Action failed"); return }

      /* Remove from list (approved reviews leave pending, rejected are gone) */
      setReviews((prev) => prev.filter((r) => r.id !== id))
      setTotal((t) => t - 1)
    } catch {
      setError("Network error")
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( MODERATION )</span>
        </div>
        <h1 className="font-display font-black text-[1.75rem] text-white/90">
          Review Moderation
        </h1>
        <p className="text-[0.875rem] text-white/70 max-w-lg">
          Approve reviews to make them public. Rejected reviews are permanently deleted.
          Approved reviews automatically update the preset&apos;s star rating.
        </p>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {(["pending", "approved", "all"] as ReviewStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[0.8125rem] font-medium transition-all capitalize",
              filter === s
                ? "bg-white/[0.08] text-white/92"
                : "text-white/70 hover:text-white/85"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-[0.8125rem] text-red-400">
          {error}
        </div>
      )}

      {/* ── Empty states ── */}
      {!loading && reviews.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-[0.875rem] text-white/70">
            {filter === "pending" ? "No pending reviews — you&apos;re all caught up." : "No reviews found."}
          </p>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Review cards ── */}
      {!loading && reviews.length > 0 && (
        <>
          <p className="text-[0.8125rem] text-white/70">
            {total} review{total !== 1 ? "s" : ""}
          </p>

          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-3"
              >
                {/* ── Top row: preset + meta ── */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[0.875rem] font-semibold text-white/92">
                      {review.presets?.title ?? review.preset_id}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[0.75rem] text-white/70">{review.email}</span>
                      {review.is_verified_purchase && (
                        <span className="text-[0.65rem] text-emerald-400/70 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-full px-2 py-px">
                          Verified purchase
                        </span>
                      )}
                      <span className="text-[0.75rem] text-white/70">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Star rating */}
                  <div className="flex gap-0.5 shrink-0">
                    {[1,2,3,4,5].map((n) => (
                      <svg
                        key={n}
                        width="12" height="12" viewBox="0 0 24 24"
                        fill={n <= review.rating ? "currentColor" : "none"}
                        stroke="currentColor" strokeWidth="2"
                        className={n <= review.rating ? "text-gold" : "text-white/70"}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                </div>

                {/* ── Review text ── */}
                {review.review_text && (
                  <p className="text-[0.875rem] text-white/85 leading-relaxed">
                    &ldquo;{review.review_text}&rdquo;
                  </p>
                )}
                {!review.review_text && (
                  <p className="text-[0.8125rem] text-white/70 italic">No written review</p>
                )}

                {/* ── Actions ── */}
                {!review.is_approved && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                    <button
                      onClick={() => handleAction(review.id, "approve")}
                      disabled={acting === review.id}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[0.8125rem] font-medium hover:bg-emerald-500/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acting === review.id ? <SpinIcon /> : <CheckIcon />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(review.id, "reject")}
                      disabled={acting === review.id}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500/[0.08] text-red-400/70 border border-red-500/15 text-[0.8125rem] font-medium hover:bg-red-500/12 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon />
                      Reject
                    </button>
                  </div>
                )}

                {review.is_approved && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                    <span className="text-[0.75rem] text-emerald-400/60 flex items-center gap-1.5">
                      <CheckIcon />
                      Published
                    </span>
                    <button
                      onClick={() => handleAction(review.id, "reject")}
                      disabled={acting === review.id}
                      className="ml-auto text-[0.75rem] text-red-400/50 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}

/* ── Icons ── */
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}
function SpinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

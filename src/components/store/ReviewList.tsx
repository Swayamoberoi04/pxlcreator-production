"use client"

/**
 * ReviewList
 *
 * Fetches and displays approved reviews for a preset.
 * Shows avg rating + count in the header, individual reviews below.
 */

import { useEffect, useState } from "react"

interface Review {
  id:                   string
  rating:               number
  title:                string | null
  review_text:          string | null
  created_at:           string
  email:                string
  is_verified_purchase: boolean
}

interface ReviewListProps {
  presetSlug: string
  refreshKey?: number
}

export function ReviewList({ presetSlug, refreshKey = 0 }: ReviewListProps) {
  const [reviews,    setReviews]    = useState<Review[]>([])
  const [avgRating,  setAvgRating]  = useState<number | null>(null)
  const [count,      setCount]      = useState(0)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    fetch(`/api/presets/${presetSlug}/reviews`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews ?? [])
        setAvgRating(data.avgRating)
        setCount(data.count ?? 0)
      })
      .catch(() => {/* silent — reviews are non-critical */})
      .finally(() => setLoading(false))
  }, [presetSlug, refreshKey])

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-2" />
        ))}
      </div>
    )
  }

  if (count === 0) {
    return (
      <p className="text-[0.875rem] text-muted/85 italic">
        No reviews yet — be the first to share your experience.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary row */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-display font-black text-[2rem] text-gold leading-none">
            {avgRating?.toFixed(1)}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <StarIcon key={s} filled={s <= Math.round(avgRating ?? 0)} />
            ))}
          </div>
        </div>
        <div className="h-10 w-px bg-border shrink-0" />
        <p className="text-[0.875rem] text-muted/85">
          <span className="font-semibold text-foreground">{count}</span>{" "}
          {count === 1 ? "review" : "reviews"}
        </p>
      </div>

      {/* Individual reviews */}
      <div className="flex flex-col gap-4">
        {reviews.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-5 py-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <StarIcon key={s} filled={s <= r.rating} small />
                  ))}
                </div>
                {r.title && (
                  <p className="text-[0.875rem] font-semibold text-foreground">{r.title}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[0.7rem] text-muted/70">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {r.is_verified_purchase && (
                  <span className="text-[0.62rem] font-semibold text-emerald-400/80 border border-emerald-500/20 bg-emerald-500/[0.06] rounded-full px-2 py-0.5">
                    Verified Purchase
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            {r.review_text && (
              <p className="text-[0.8125rem] text-muted/92 leading-relaxed">{r.review_text}</p>
            )}

            {/* Author */}
            <p className="text-[0.72rem] text-muted/70">
              {anonymiseEmail(r.email)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Hide most of the email address for privacy */
function anonymiseEmail(email: string): string {
  if (!email || !email.includes("@")) return "Anonymous"
  const [local, domain] = email.split("@")
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}

function StarIcon({ filled, small }: { filled: boolean; small?: boolean }) {
  const size = small ? 12 : 16
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? "#FFD60A" : "none"}
      stroke={filled ? "#FFD60A" : "#555"}
      strokeWidth="1.5"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}



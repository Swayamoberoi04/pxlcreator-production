"use client"

/**
 * ReviewForm
 *
 * Lets users with access (paid or YouTube-unlocked) submit a review.
 * Shown only when the user is signed in and has access to the preset.
 * Rating is required; title and review_text are optional.
 */

import { useState } from "react"
import { useAuth }  from "@/contexts/AuthContext"

interface ReviewFormProps {
  presetSlug: string
  onSuccess?: () => void
}

export function ReviewForm({ presetSlug, onSuccess }: ReviewFormProps) {
  const { user } = useAuth()

  const [rating,      setRating]      = useState(0)
  const [hovered,     setHovered]     = useState(0)
  const [title,       setTitle]       = useState("")
  const [reviewText,  setReviewText]  = useState("")
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  if (!user) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError("Please select a star rating."); return }
    setSubmitting(true)
    setError(null)

    try {
      const token = await user!.getIdToken()
      const res = await fetch(`/api/presets/${presetSlug}/reviews`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, title: title.trim() || undefined, review_text: reviewText.trim() || undefined }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to submit review.")
        return
      }

      setSubmitted(true)
      onSuccess?.()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-4">
        <p className="text-[0.875rem] font-semibold text-emerald-400">Review submitted</p>
        <p className="text-[0.8125rem] text-muted/85 mt-1">
          Thanks — it will appear here after moderation.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[0.8125rem] font-medium text-foreground/92">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} star`}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <StarIcon filled={(hovered || rating) >= star} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-title" className="text-[0.8125rem] font-medium text-foreground/92">
          Title <span className="text-muted/70 font-normal">(optional)</span>
        </label>
        <input
          id="review-title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="One-line summary of your experience"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[0.875rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-text" className="text-[0.8125rem] font-medium text-foreground/92">
          Review <span className="text-muted/70 font-normal">(optional)</span>
        </label>
        <textarea
          id="review-text"
          rows={4}
          maxLength={2000}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="How did this preset change your editing workflow?"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[0.875rem] text-foreground placeholder:text-muted/70 resize-none focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
        <span className="text-[0.7rem] text-muted/70 self-end">{reviewText.length}/2000</span>
      </div>

      {error && (
        <p className="text-[0.8125rem] text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !rating}
        className="self-start rounded-xl bg-gold px-5 py-2.5 text-[0.8125rem] font-semibold text-background transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? "#FFD60A" : "none"}
      stroke={filled ? "#FFD60A" : "currentColor"}
      strokeWidth="1.5"
      className={filled ? "" : "text-muted/70"}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}



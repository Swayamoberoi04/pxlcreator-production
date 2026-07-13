"use client"

import { useState } from "react"
import type { FormEvent } from "react"

interface Props {
  source?:      string   // tracks which surface captured the lead
  ctaLabel?:    string
  placeholder?: string
}

export function NewsletterForm({
  source      = "footer",
  ctaLabel    = "Get Free Preset",
  placeholder = "your@email.com",
}: Props) {
  const [email,      setEmail]      = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res  = await fetch("/api/email/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, source }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.")
        return
      }

      setSubmitted(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gold/25 bg-gold/8 px-5 py-3 text-[0.875rem] font-medium text-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" aria-hidden />
        You&apos;re on the list — free preset is on its way!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full sm:w-auto flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        aria-label="Email address"
        disabled={submitting}
        className="flex-1 sm:w-56 rounded-lg border border-border bg-background px-4 py-2.5 text-[0.875rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
        suppressHydrationWarning
      />
      <button
        type="submit"
        disabled={submitting}
        suppressHydrationWarning
        className="rounded-lg bg-gold px-5 py-2.5 text-[0.875rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "..." : ctaLabel}
      </button>
      {error && (
        <p className="text-[0.78rem] text-red-400 sm:col-span-2">{error}</p>
      )}
    </form>
  )
}

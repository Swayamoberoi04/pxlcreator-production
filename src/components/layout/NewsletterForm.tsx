"use client"

import { useState } from "react"
import type { FormEvent } from "react"

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    /* TODO: wire to email provider (Resend, Mailchimp, etc.) */
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gold/25 bg-gold/8 px-5 py-3 text-[0.875rem] font-medium text-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
        You&apos;re on the list — talk soon!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full sm:w-auto gap-2">
      <input
        type="email"
        required
        placeholder="your@email.com"
        aria-label="Email address for newsletter"
        className="flex-1 sm:w-56 rounded-lg border border-border bg-background px-4 py-2.5 text-[0.875rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors"
        suppressHydrationWarning
      />
      <button
        type="submit"
        suppressHydrationWarning
        className="rounded-lg bg-gold px-5 py-2.5 text-[0.875rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
      >
        Subscribe
      </button>
    </form>
  )
}

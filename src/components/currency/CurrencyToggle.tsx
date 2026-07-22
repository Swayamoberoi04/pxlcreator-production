"use client"

import { useCurrencyStore } from "@/store/currency"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

/**
 * CurrencyToggle — compact pill in the site header.
 * Clicking it switches between USD ($) and INR (₹).
 * Preference is persisted in localStorage via the currency store.
 */
export function CurrencyToggle() {
  /* Suppress hydration mismatch — localStorage read happens client-side */
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  const { currency, toggle } = useCurrencyStore()

  if (!mounted) {
    return (
      <div className="h-9 w-[72px] rounded-full border border-border bg-surface animate-pulse" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${currency === "INR" ? "USD" : "INR"}`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-2",
        "text-[0.75rem] font-semibold tracking-wide transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "hover:border-gold/40 hover:text-foreground active:scale-95",
        currency === "INR"
          ? "border-gold/25 bg-gold/8 text-gold"
          : "border-border bg-surface text-muted"
      )}
    >
      <span>{currency === "INR" ? "₹" : "$"}</span>
      <span>{currency}</span>
    </button>
  )
}

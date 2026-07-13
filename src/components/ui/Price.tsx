"use client"

/**
 * <Price> — Unified currency-aware price display.
 *
 * Reads the Zustand currency store (USD/INR) and renders the correct
 * amount via formatPrice(). Hydration-safe: renders nothing until mounted
 * to avoid mismatch between SSR (default "INR") and client localStorage.
 *
 * Usage:
 *   <Price usd={29} />                     → "$29.00" or "₹2,436"
 *   <Price usd={29} className="text-gold" />
 *   <Price usd={29} original={49} />       → adds strikethrough + save badge
 */

import { useEffect, useState } from "react"
import { useCurrencyStore }    from "@/store/currency"
import { formatPrice }         from "@/lib/currency/format"
import { cn }                  from "@/lib/utils"

interface PriceProps {
  usd:        number
  original?:  number          // if set, renders strikethrough + save badge
  className?: string
  size?:      "sm" | "md" | "lg" | "xl"
  free?:      boolean
}

const sizeMap = {
  sm:  "text-[0.875rem]",
  md:  "text-[1rem]",
  lg:  "text-[1.5rem]",
  xl:  "text-[2.5rem]",
}

export function Price({ usd, original, className, size = "md", free = false }: PriceProps) {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  const currency = useCurrencyStore((s) => s.currency)

  if (!mounted) {
    return (
      <span className={cn("inline-block h-5 w-16 rounded bg-surface-2 animate-pulse", className)} />
    )
  }

  if (free) {
    return (
      <span className={cn("font-display font-black text-emerald-400", sizeMap[size], className)}>
        Free
      </span>
    )
  }

  const discount = original && original > usd
    ? Math.round((1 - usd / original) * 100)
    : null

  return (
    <span className={cn("inline-flex items-baseline gap-2 flex-wrap", className)}>
      <span className={cn("font-display font-black text-gold", sizeMap[size])}>
        {formatPrice(usd, currency)}
      </span>
      {original && original > usd && (
        <>
          <span className={cn("text-muted/40 line-through", sizeMap[size === "xl" ? "lg" : "sm"])}>
            {formatPrice(original, currency)}
          </span>
          {discount && (
            <span className="text-[0.7rem] font-bold text-red-400 bg-red-500/10 rounded-full px-2 py-0.5">
              Save {discount}%
            </span>
          )}
        </>
      )}
    </span>
  )
}

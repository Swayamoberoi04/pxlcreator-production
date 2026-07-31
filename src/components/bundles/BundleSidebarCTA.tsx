"use client"

/**
 * src/components/bundles/BundleSidebarCTA.tsx
 *
 * Sticky purchase sidebar on the bundle detail page.
 * Client component — reads from currency + cart stores.
 *
 * Shows:
 *   - Value comparison (individual vs bundle, strikethrough)
 *   - Savings amount + percentage
 *   - Add to Cart button
 *   - Pack count summary
 *   - Compatibility chips
 */

import { useState, useEffect } from "react"
import type { Bundle }          from "@/types/bundle"
import { useCurrencyStore }     from "@/store/currency"
import { useCartStore }         from "@/store/cart"
import { formatPrice, toInr }   from "@/lib/currency/format"
import { cn }                   from "@/lib/utils"

interface BundleSidebarCTAProps {
  bundle: Bundle
}

export function BundleSidebarCTA({ bundle }: BundleSidebarCTAProps) {
  /* Hydration guard for Zustand persist */
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  const currency       = useCurrencyStore((s) => s.currency)
  const displayCurrency = mounted ? currency : "INR"   // default INR for server match

  const addItem     = useCartStore((s) => s.addItem)
  const cartItems   = useCartStore((s) => s.items)
  const [added, setAdded] = useState(false)

  const alreadyInCart = cartItems.some((i) => i.preset.id === bundle.id)

  const totalPresets   = bundle.includeCount
    ?? bundle.includedPacks.reduce((s, p) => s + p.presetCount, 0)

  const savingsPercent = bundle.individualValueUsd > 0
    ? Math.round((1 - bundle.price / bundle.individualValueUsd) * 100)
    : 0

  const savingsAmount = displayCurrency === "INR"
    ? `₹${(toInr(bundle.individualValueUsd) - toInr(bundle.price)).toLocaleString("en-IN")}`
    : `$${(bundle.individualValueUsd - bundle.price).toFixed(2)}`

  function handleAddToCart() {
    addItem(bundle)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-surface overflow-hidden">

      {/* Top gold glow line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="p-6 flex flex-col gap-5">

        {/* Pricing block */}
        <div>
          {/* Individual value — strikethrough */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[0.75rem] text-muted/70">Individual value:</span>
            <span
              className="text-[0.75rem] text-muted/70 line-through"
              suppressHydrationWarning
            >
              {formatPrice(bundle.individualValueUsd, displayCurrency)}
            </span>
          </div>

          {/* Bundle price — large */}
          <p
            className="font-display font-bold text-[2rem] leading-none text-gold"
            suppressHydrationWarning
          >
            {formatPrice(bundle.price, displayCurrency)}
          </p>

          {/* Secondary currency */}
          {mounted && (
            <p className="text-[0.75rem] text-muted/70 mt-1" suppressHydrationWarning>
              ≈{" "}
              {displayCurrency === "INR"
                ? `$${bundle.price.toFixed(2)}`
                : `₹${toInr(bundle.price).toLocaleString("en-IN")}`}
            </p>
          )}
        </div>

        {/* Savings badge */}
        {savingsPercent > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 px-4 py-3">
            <div className="text-emerald-400">
              <CheckCircleIcon />
            </div>
            <div>
              <p className="text-[0.8125rem] font-bold text-emerald-400">
                You save {savingsPercent}%
              </p>
              <p
                className="text-[0.75rem] text-emerald-400/60"
                suppressHydrationWarning
              >
                {savingsAmount} off individual pack prices
              </p>
            </div>
          </div>
        )}

        {/* Pack + preset count */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2/50 border border-border/40 px-3 py-2.5 text-center">
            <p className="text-[1.25rem] font-bold text-foreground/90 leading-none">
              {totalPresets}
            </p>
            <p className="text-[0.65rem] text-muted/70 mt-0.5 tracking-wide">
              PRESETS
            </p>
          </div>
          <div className="rounded-xl bg-surface-2/50 border border-border/40 px-3 py-2.5 text-center">
            <p className="text-[1.25rem] font-bold text-foreground/90 leading-none">
              {bundle.includedPacks.length}
            </p>
            <p className="text-[0.65rem] text-muted/70 mt-0.5 tracking-wide">
              PACKS
            </p>
          </div>
        </div>

        {/* Pricing breakdown table */}
        {bundle.includedPacks.some((p) => p.priceUsd !== undefined) && (
          <div className="rounded-xl border border-border/40 bg-surface-2/30 overflow-hidden">
            <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-muted/70 px-4 pt-3 pb-2">
              Pack Breakdown
            </p>
            <div className="divide-y divide-border/30">
              {bundle.includedPacks.map((pack) => (
                <div key={pack.name} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none flex-shrink-0">{pack.icon}</span>
                    <span className="text-[0.8125rem] text-muted/85 truncate">{pack.name}</span>
                  </div>
                  <span className={cn(
                    "text-[0.8125rem] font-semibold flex-shrink-0 ml-2",
                    pack.priceUsd === 0 ? "text-emerald-400/70" : "text-muted/85"
                  )}>
                    {pack.priceUsd === 0 ? "Free" : `$${pack.priceUsd!.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-[0.75rem] text-muted/70">Individual total</span>
              <span className="text-[0.75rem] font-bold text-muted/85 line-through">
                ${bundle.individualValueUsd.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gold/10 px-4 py-2.5 flex items-center justify-between bg-gold/[0.03]">
              <span className="text-[0.75rem] font-semibold text-foreground/92">Bundle price</span>
              <span className="text-[0.875rem] font-bold text-gold">${bundle.price.toFixed(2)}</span>
            </div>
            <div className="border-t border-emerald-500/10 px-4 py-2.5 flex items-center justify-between bg-emerald-500/[0.03]">
              <span className="text-[0.75rem] font-semibold text-emerald-400/70">You save</span>
              <span className="text-[0.75rem] font-bold text-emerald-400">
                ${(bundle.individualValueUsd - bundle.price).toFixed(2)} ({savingsPercent}%)
              </span>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={alreadyInCart}
          suppressHydrationWarning
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-4",
            "text-[0.9375rem] font-bold transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            alreadyInCart
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 cursor-default"
              : added
              ? "bg-emerald-600 text-white"
              : "bg-gold text-[#0a0800] hover:brightness-110 active:brightness-95 shadow-[0_8px_24px_rgba(255,214,10,0.2)]"
          )}
        >
          {alreadyInCart
            ? <><CheckIcon /> Already in Cart</>
            : added
            ? <><CheckIcon /> Added to Cart!</>
            : <><BagIcon /> Add to Cart</>
          }
        </button>

        {/* Trust signals */}
        <div className="space-y-2">
          {[
            "Instant download after purchase",
            "Lifetime access — free updates",
            "Works on Lightroom Classic & CC",
          ].map((line) => (
            <div key={line} className="flex items-center gap-2.5">
              <span className="text-gold/60">
                <SmallCheckIcon />
              </span>
              <span className="text-[0.75rem] text-muted/85">{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────── */

function BagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function SmallCheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}


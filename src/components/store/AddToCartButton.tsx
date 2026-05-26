"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Preset } from "@/types/product"
import { useCartStore } from "@/store/cart"
import { cn } from "@/lib/utils"

interface AddToCartButtonProps {
  preset: Preset
}

export function AddToCartButton({ preset }: AddToCartButtonProps) {
  const addItem  = useCartStore((s) => s.addItem)
  const router   = useRouter()

  const [addedState, setAddedState] = useState<"idle" | "added">("idle")

  function handleAddToCart() {
    addItem(preset)
    setAddedState("added")
    setTimeout(() => setAddedState("idle"), 2000)
  }

  function handleBuyNow() {
    addItem(preset)
    router.push("/checkout")
  }

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* Primary — Add to Cart */}
      <button
        type="button"
        onClick={handleAddToCart}
        suppressHydrationWarning
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          addedState === "added"
            ? "bg-green-600 text-white"
            : "bg-gold text-background hover:bg-gold-dim active:scale-[0.98]"
        )}
      >
        {addedState === "added" ? (
          <>
            <CheckIcon />
            Added to Cart
          </>
        ) : (
          <>
            <BagIcon />
            Add to Cart — ${preset.price}
          </>
        )}
      </button>

      {/* Secondary — Buy Now */}
      <button
        type="button"
        onClick={handleBuyNow}
        className="flex w-full items-center justify-center rounded-xl border border-border py-4 text-base font-semibold text-foreground transition-colors hover:border-gold/40 hover:bg-surface-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Buy Now
      </button>

      {/* Trust note */}
      <p className="text-center text-small text-muted">
        Instant download · No subscription · Secure checkout
      </p>

    </div>
  )
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

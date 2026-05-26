"use client"

import { useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useCartStore, selectTotal, selectItemCount } from "@/store/cart"
import type { CartItem } from "@/types/cart"
import { cn } from "@/lib/utils"

export function CartDrawer() {
  const isOpen    = useCartStore((s) => s.isOpen)
  const closeCart = useCartStore((s) => s.closeCart)
  const items     = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const total     = useCartStore(selectTotal)
  const itemCount = useCartStore(selectItemCount)

  /* Lock body scroll while open — use a class for Lenis compatibility */
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = "hidden"
    } else {
      document.documentElement.style.overflow = ""
    }
    return () => { document.documentElement.style.overflow = "" }
  }, [isOpen])

  /* Close on Escape */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") closeCart()
  }, [closeCart])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
      <>
      {/* ── Backdrop ── */}
      <motion.div
        key="cart-backdrop"
        aria-hidden="true"
        onClick={closeCart}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
      />

      {/* ── Drawer panel ── */}
      <motion.div
        key="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col",
          "bg-surface/95 backdrop-blur-2xl border-l border-border/60",
          "shadow-[-24px_0_80px_rgba(0,0,0,0.6)]"
        )}
      >

        {/* ── Drawer header ── */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-base text-foreground">Cart</span>
            {itemCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-background">
                {itemCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Clear cart */}
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                suppressHydrationWarning
                className="px-2.5 py-1 text-xs text-muted hover:text-destructive transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear all
              </button>
            )}
            {/* Close button */}
            <button
              type="button"
              aria-label="Close cart"
              onClick={closeCart}
              suppressHydrationWarning
              className="flex items-center justify-center w-8 h-8 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* ── Cart body ── */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <EmptyCart onClose={closeCart} />
          ) : (
            <ul className="flex flex-col divide-y divide-border p-4 gap-1" role="list">
              {items.map((item) => (
                <CartItemRow
                  key={item.preset.id}
                  item={item}
                  onRemove={() => removeItem(item.preset.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* ── Drawer footer — only shown when cart has items ── */}
        {items.length > 0 && (
          <div className="border-t border-border p-5 flex flex-col gap-4 shrink-0">

            {/* Order summary */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-small text-muted">
                <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                <span className="text-foreground font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-small text-muted">
                <span>Delivery</span>
                <span className="text-gold font-medium">Free — instant download</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display font-bold text-xl text-gold">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex w-full items-center justify-center rounded-lg bg-gold py-3.5 text-sm font-semibold text-background transition-colors hover:bg-gold-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Proceed to Checkout
            </Link>

            <p className="text-center text-small text-muted">
              Secure checkout · Instant delivery
            </p>
          </div>
        )}

      </motion.div>
      </>
      )}
    </AnimatePresence>
  )
}

/* ── Individual cart item row ── */
function CartItemRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const { preset, quantity } = item

  return (
    <li className="flex items-start gap-3 py-4">

      {/* Colour swatch — category indicator */}
      <div className="h-14 w-14 shrink-0 rounded-lg bg-surface-2 border border-border flex items-center justify-center overflow-hidden">
        <span className="text-label text-muted text-center leading-tight px-1">
          {preset.category.split(" ")[0]}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug truncate">
          {preset.name}
        </p>
        <p className="text-small text-muted">{preset.category}</p>
        {quantity > 1 && (
          <p className="text-small text-muted">Qty: {quantity}</p>
        )}
      </div>

      {/* Price + remove */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="font-display font-bold text-gold text-sm">
          ${(preset.price * quantity).toFixed(2)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${preset.name} from cart`}
          className="text-muted hover:text-destructive transition-colors focus-visible:outline-none"
        >
          <TrashIcon />
        </button>
      </div>

    </li>
  )
}

/* ── Empty cart state ── */
function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 border border-border text-muted">
        <BagEmptyIcon />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-foreground">Your cart is empty</p>
        <p className="text-small text-muted">Add some presets to get started.</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-sm text-gold hover:underline underline-offset-4 focus-visible:outline-none"
      >
        Browse presets →
      </button>
    </div>
  )
}

/* ── Icons ── */
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6"  y2="18" />
      <line x1="6"  y1="6" x2="18" y2="18" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function BagEmptyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

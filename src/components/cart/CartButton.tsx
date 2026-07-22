"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useCartStore, selectItemCount } from "@/store/cart"

export function CartButton() {
  const openCart  = useCartStore((s) => s.openCart)
  const itemCount = useCartStore(selectItemCount)

  return (
    <button
      type="button"
      aria-label={itemCount > 0 ? `Open cart — ${itemCount} item${itemCount > 1 ? "s" : ""}` : "Open cart"}
      onClick={openCart}
      suppressHydrationWarning
      className="relative flex items-center justify-center h-11 w-11 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <BagIcon />

      {/* Item count badge — Framer Motion scale-in for premium feel */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
            key={itemCount}
            aria-hidden="true"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{    scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-background text-[10px] font-bold leading-none shadow-[0_0_8px_rgba(255,214,10,0.5)]"
          >
            {itemCount > 9 ? "9+" : itemCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function BagIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}


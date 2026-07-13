"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface FaqItem {
  q: string
  a: string
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="mt-5 flex flex-col divide-y divide-border/50">
      {items.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded"
          >
            <span className="text-[0.9375rem] font-medium text-foreground/85 leading-snug">
              {item.q}
            </span>
            <ChevronIcon open={open === i} />
          </button>

          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } }}
                exit={{ height: 0, opacity: 0, transition: { duration: 0.20, ease: [0.25, 0.46, 0.45, 0.94] } }}
                className="overflow-hidden"
              >
                <p className="pb-5 text-[0.875rem] text-muted/65 leading-[1.75]">
                  {item.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      className="shrink-0 text-muted/40"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </motion.svg>
  )
}

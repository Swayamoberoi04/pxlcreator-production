"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import type { Variants } from "framer-motion"
import { fadeUp } from "./motion"

interface RevealProps {
  children:   React.ReactNode
  className?: string
  variants?:  Variants
  delay?:     number
  once?:      boolean
  threshold?: number
}

/**
 * Scroll-triggered reveal wrapper.
 * Defaults to a fade-up entrance; pass custom `variants` to override.
 */
export function Reveal({
  children,
  className,
  variants = fadeUp,
  delay     = 0,
  once      = true,
  threshold = 0.15,
}: RevealProps) {
  const ref      = useRef<HTMLDivElement>(null)
  const inView   = useInView(ref, { once, amount: threshold })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  )
}

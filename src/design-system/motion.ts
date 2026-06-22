"use client"

/**
 * PXL Creator — Motion Primitives
 * Reusable Framer Motion variants for consistent cinematic animation.
 */

import type { Variants } from "framer-motion"
import { easing, duration } from "./tokens"

/* ── Reveal variants ────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.reveal, ease: easing.spring },
  },
}

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.slow, ease: easing.smooth } },
}

export const slideLeft: Variants = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.reveal, ease: easing.spring } },
}

export const slideRight: Variants = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.reveal, ease: easing.spring } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,   transition: { duration: duration.reveal, ease: easing.spring } },
}

/* ── Stagger container ──────────────────────────────────── */

export function staggerContainer(staggerChildren = 0.1, delayChildren = 0): Variants {
  return {
    hidden:  {},
    visible: { transition: { staggerChildren, delayChildren } },
  }
}

/* ── Page transition ────────────────────────────────────── */

export const pageVariants: Variants = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1, transition: { duration: duration.page, ease: easing.smooth } },
  exit:     { opacity: 0, transition: { duration: duration.fast, ease: easing.snappy } },
}

/* ── Glow pulse (for CTA buttons) ──────────────────────── */

export const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 12px rgba(255,214,10,0.35)",
      "0 0 28px rgba(255,214,10,0.60)",
      "0 0 12px rgba(255,214,10,0.35)",
    ],
    transition: { duration: 2.4, ease: "easeInOut", repeat: Infinity },
  },
}

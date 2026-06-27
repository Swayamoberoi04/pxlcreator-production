/**
 * PXL Creator Design Tokens — v2.1 (Canonical Gold)
 *
 * Single source of truth for all non-CSS design decisions.
 * CSS counterparts live in src/app/globals.css @theme inline.
 * Use these in Three.js materials, SVGs, and anywhere CSS vars can't reach.
 */

/* ── Brand palette ─────────────────────────────────────── */
export const colors = {
  /* Primary accent — cinematic warm amber (Brand Bible v1.0 canonical) */
  gold:        "#C9A84C",
  goldBright:  "#E2C97E",  // inner bloom
  goldDim:     "#A8852A",  // pressed / gradient base
  goldMuted:   "rgba(201, 168, 76, 0.12)",

  /* Gold RGB for Three.js / canvas */
  glowRgb:     [201, 168, 76] as [number, number, number],

  /* Surfaces */
  background:  "#0A0A0A",
  surface:     "#161616",
  surface2:    "#2A2A2A",
  surface3:    "#3A3A3A",

  /* Text */
  foreground:  "#F5F5F5",
  muted:       "#D4D4D4",

  /* Borders */
  border:      "#222222",

  /* Accent teal */
  teal:        "rgba(61, 122, 138, 1)",
} as const

/* ── Gold shadows (for inline style / JS) ──────────────── */
export const glows = {
  sm:   `0 0 12px rgba(201,168,76,0.35), 0 0 4px rgba(201,168,76,0.20)`,
  md:   `0 0 24px rgba(201,168,76,0.40), 0 0 10px rgba(201,168,76,0.25)`,
  lg:   `0 0 48px rgba(201,168,76,0.45), 0 0 18px rgba(201,168,76,0.28), 0 0 4px rgba(201,168,76,0.60)`,
  text: `0 0 8px rgba(201,168,76,0.90), 0 0 24px rgba(201,168,76,0.55), 0 0 56px rgba(201,168,76,0.22)`,
} as const

/* ── Three.js material colors (hex numbers) ────────────── */
export const threeColors = {
  gold:       0xC9A84C,
  goldBright: 0xE2C97E,
  goldDim:    0xA8852A,
} as const

/* ── Motion timing ─────────────────────────────────────── */
export const easing = {
  spring:    [0.16, 1, 0.3, 1] as [number, number, number, number],
  smooth:    [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  snappy:    [0.4, 0, 0.2, 1] as [number, number, number, number],
  cinematic: [0.76, 0, 0.24, 1] as [number, number, number, number],
} as const

export const duration = {
  fast:   0.18,
  base:   0.32,
  slow:   0.55,
  reveal: 0.75,
  page:   0.60,
} as const

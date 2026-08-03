/**
 * src/types/popup.ts
 *
 * Shared type definitions for the PXL Creator promotional popup system.
 *
 * Architecture:
 *   PopupConfig  — pure data; no business logic
 *   PopupVariant — union of the 4 popup types
 *
 * Designed to be extended (add new variants by adding to the union).
 */

export type PopupVariant = 'bestseller' | 'freebie' | 'mobile'

export interface PopupConfig {
  id:           PopupVariant

  /* ── Badge chip ── */
  badge:        string
  badgeStyle:   string     // Tailwind classes for chip colour

  /* ── Copy ── */
  headline:     string
  subheadline:  string     // secondary gold-coloured line
  valueProp:    string     // 1–2 sentence body copy

  /* ── Conversion elements ── */
  highlight:    string     // bold callout pill e.g. "FREE", "SAVE 60%"
  ctaLabel:     string
  ctaHref:      string

  /* ── Visual theming ── */
  accentGlow:   string     // CSS rgba() — secondary glow behind the modal
}

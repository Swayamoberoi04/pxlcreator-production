/**
 * src/data/popups.ts
 *
 * Promotional popup catalogue â€” 4 variants shown in round-robin rotation.
 *
 * Rotation strategy:
 *   bundle â†’ bestseller â†’ freebie â†’ mobile â†’ bundle â†’ â€¦
 *   Index tracked in localStorage so each visit sees the next variant.
 *
 * Copy principles (HCI):
 *   â€¢ Headline: 4â€“7 words, punchy noun-phrase
 *   â€¢ Subheadline: one golden social-proof line
 *   â€¢ Value prop: 2 sentences max, benefit-first
 *   â€¢ CTA: starts with a strong verb
 *   â€¢ Dismiss: minimal â€” lets user leave without guilt
 */

import type { PopupConfig } from '@/types/popup'

export const POPUP_CONFIGS: PopupConfig[] = [

  /* â”€â”€ 1 Â· Featured Bundle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    id:           'bundle',
    badge:        'EXCLUSIVE OFFER',
    badgeStyle:   'bg-gold/15 text-gold border-gold/30',
    headline:     'The Complete PXL Bundle',
    subheadline:  'Every preset pack. One price. Yours forever.',
    valueProp:
      'Desert Gold, Film Emulation, Urban Noir, and 18 more packs â€” the entire PXL professional catalogue at 60% off the individual price. The complete toolkit, one decision.',
    highlight:    'SAVE 60%',
    ctaLabel:     'Explore the Bundle',
    ctaHref:      '/bundles',
    accentGlow:   'rgba(255, 214, 10, 0.18)',
  },

  /* â”€â”€ 2 Â· Best Selling Presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    id:           'bestseller',
    badge:        "EDITORS' PICKS",
    badgeStyle:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
    headline:     'Trusted By 1,200+ Creators',
    subheadline:  'Rated 4.9â˜… across all packs.',
    valueProp:
      'Desert Gold Pack, Film Emulation Bundle, Urban Noir Pack â€” the three best-sellers that define the PXL aesthetic. Start with the presets that already work for thousands.',
    highlight:    '4.9â˜… RATED',
    ctaLabel:     'Shop Best Sellers',
    ctaHref:      '/store',
    accentGlow:   'rgba(251, 191, 36, 0.16)',
  },

  /* â”€â”€ 3 Â· Free Preset Lead Magnet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    id:           'freebie',
    badge:        'FREE DOWNLOAD',
    badgeStyle:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    headline:     '8 Free Presets. No Card.',
    subheadline:  'Our most-downloaded free pack â€” no signup needed.',
    valueProp:
      'Everyday Cinematic gives you 8 versatile one-click presets that work on any subject, any light. Download instantly, start editing like a pro today.',
    highlight:    '100% FREE',
    ctaLabel:     'Download Free Now',
    ctaHref:      '/presets/everyday-cinematic',
    accentGlow:   'rgba(52, 211, 153, 0.14)',
  },

  /* â”€â”€ 4 Â· Lightroom Mobile Master Collection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    id:           'mobile',
    badge:        'MOBILE PRESETS',
    badgeStyle:   'bg-violet-500/15 text-violet-400 border-violet-500/30',
    headline:     'Edit Like a Pro on Your Phone',
    subheadline:  'Built for Lightroom Mobile CC.',
    valueProp:
      '25 mobile-ready cinematic presets from the Cinematic Starter Bundle â€” one tap on your phone, stunning professional results on every shoot, every scene.',
    highlight:    'FOR MOBILE',
    ctaLabel:     'Get Mobile Presets',
    ctaHref:      '/presets/cinematic-starter-bundle',
    accentGlow:   'rgba(139, 92, 246, 0.14)',
  },

]


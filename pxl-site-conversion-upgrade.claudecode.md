# PXL Creator — Conversion & Premium-Positioning Upgrade
### Claude Code automation prompt — run at repository root

> **Purpose:** translate the *Critical* and *Important* findings from `competitor-analysis-pxlcreator.md` into shipped, premium, conversion-focused changes — without touching `main`, without burning context, and without guessing brand values (all tokens are pre-defined inline below).
>
> **Operating rules (do not deviate):**
> - Work on a feature branch only. **Never push to or merge into `main`.** Open a PR at the end.
> - One commit per phase/surface. Conventional commit messages.
> - Cinematic motion only — fades, parallax, scene-change transitions. **No bouncy springs, no overshoot, no playful easing.**
> - Reuse existing components; do not create duplicate systems or chaotic file names. kebab-case files, feature-folder architecture.
> - If a referenced file/route does not exist, note it in the audit and propose the smallest correct addition — do not invent unrelated structure.
> - Pause for my review after **Phase 0** before writing any code.

---

## Pre-defined design tokens (canonical — do not guess or substitute)

```
Colors
  --pxl-black:   #0A0A0A   /* cinematic base — backgrounds, hero, foundations */
  --pxl-gold:    #C9A84C   /* LOCKED brand accent — CTAs, highlights, logo */
  --pxl-teal:    #3D7A8A   /* cinematic shadow tone — accents, grading */
  --pxl-silver:  #D4D4D4   /* neutral light — body text, secondary */

  NOTE: #FFD60A "glow-yellow" was explored but is NOT canonical.
  Use --pxl-gold (#C9A84C) unless I explicitly say otherwise in this session.

Type
  Display: Monument Extended (fallback: Bebas Neue) — all-caps, wide tracking
  Body:    Inter (fallback: DM Sans) — light weight, generous line-height

Motion
  Cinematic only: ease-out fades, slow parallax, black scene-change transitions.
  Framer Motion for complex motion; no CSS-keyframe bounce. Duration 300–700ms.
```

Stack assumed present: **Next.js + TypeScript + TailwindCSS + Shadcn/UI + Framer Motion**, deployed on **Vercel**. If `tokens.ts`/Tailwind theme already defines these, extend — don't duplicate.

---

## Phase 0 — Read-only audit (NO code changes; stop and report)

Do not modify anything. Produce a short written report covering:

1. **Branch & safety:** confirm current branch; confirm `main` is not checked out; list any uncommitted changes.
2. **Token state:** where brand colors/fonts/motion currently live (`tailwind.config`, `design-system/tokens.ts`, globals). Flag any hardcoded hex values or the `#FFD60A` glow-yellow anywhere in the codebase.
3. **Surface inventory:** map existing routes/components for: homepage hero, product/preset page, bundle, checkout/cart, email-capture, before/after slider (exists? reusable?), navigation.
4. **Conversion gaps vs the analysis:** for each Critical item (#1–7) and Important item (#8–15), mark `EXISTS / PARTIAL / MISSING` with the file path.
5. **Placeholder/unfinished scan:** grep for `lorem`, `TODO`, `placeholder`, dummy text, broken images, empty sections — list every premium-perception risk.
6. **Proposed branch name + phase plan** for my approval.

**→ Stop here. Wait for my go-ahead.**

---

## Phase 1 — Token & motion foundation (1 commit)

`git checkout -b feat/premium-conversion-upgrade` (or the name I approve).

- Centralize the canonical tokens above into the single source of truth (`design-system/tokens.ts` + Tailwind theme). Replace stray hardcoded hexes and any `#FFD60A` with semantic token references.
- Add reusable cinematic motion primitives (Framer Motion variants): `fadeUp`, `fadeIn`, `parallaxSlow`, `sceneTransition`. Export from one module; no per-component re-definition.
- Add a shared `<BeforeAfterSlider />` component if missing (graded vs flat, drag handle, touch-friendly, lazy-loaded, no layout shift). Make it the single slider used everywhere.

Commit: `feat(design): centralize brand tokens + cinematic motion primitives + before/after slider`

---

## Phase 2 — CRITICAL conversion surfaces (commit per surface)

**2a. Product / preset page** *(Critical #1)*
- Full-bleed `<BeforeAfterSlider />` above the fold (graded vs flat).
- Atmospheric name + one-line descriptor; "Shot on phone. No DSLR." mobile-native badge.
- "One preset, many scenes" gallery (versatility = save-intent).
- Clear "what's included," reviews/UGC strip, FAQ accordion (install/compat/refund).
- Sticky add-to-cart with an **order bump** slot (*Critical #6*).
- Commit: `feat(product): cinematic before/after + conversion-optimized preset page`

**2b. Signature bundle** *(Critical #4)*
- "The PXL Cinematic System" bundle page; anchor pricing UI ("10 packs worth $X — yours for $Y"). Pull anchor/sale from product data, not hardcoded.
- Commit: `feat(bundle): PXL Cinematic System signature bundle with anchor pricing`

**2c. Dual-currency PPP scaffolding** *(Critical #2)*
- Currency context/provider: auto-detect locale → USD (global) vs INR (India); manual switcher in header/footer.
- Render all prices through one `<Price>` component reading the active currency. **Do not implement payment-secret logic or store keys** — wire the Razorpay (IN) / Lemon Squeezy (global) selection seam and leave clearly-marked integration TODOs with env-var placeholders for me to fill.
- Commit: `feat(pricing): dual-currency PPP scaffolding (USD/INR) + unified Price component`

**2d. Free lead-magnet capture** *(Critical #3)*
- Email-capture component on homepage + exit-intent/footer offering the free cinematic preset. Wire to the email provider via an API route stub with a clearly-marked TODO (no secrets committed).
- Commit: `feat(funnel): free-preset email capture + lead-magnet entry point`

**2e. Premium-perception lockdown** *(Critical #5)*
- Remove/replace every placeholder, lorem, dummy text, broken image, empty section found in Phase 0. Ensure dark-luxury identity is consistent across all surfaces.
- Commit: `fix(brand): remove placeholders + enforce cinematic identity site-wide`

---

## Phase 3 — IMPORTANT surfaces (commit per surface; only after Phase 2 builds clean)

- **3a. Mood-based navigation** *(#11)* — "Shop by Mood" (Cinematic / Dark & Moody / Vintage Film / etc.). `feat(nav): mood-based shopping navigation`
- **3b. UGC + featured-creator grid** *(#10)* — tagged-creator edits + a "monthly challenge" CTA block. `feat(community): featured-creator UGC grid + challenge CTA`
- **3c. Recommender quiz MVP** *(#8)* — 4–6 question "Find Your Cinematic Style" → recommended pack/bundle. Client-side logic now; seam for PXL AI later. `feat(quiz): cinematic style recommender MVP`
- **3d. SEO + naming** *(#12, #13)* — long-tail intent `<title>`/meta on product/bundle pages; ensure atmospheric naming in copy. `feat(seo): long-tail intent metadata + atmospheric naming`
- **3e. Vault waitlist** *(#9)* — subscription landing + waitlist capture (no billing yet). `feat(vault): subscription waitlist landing`

---

## Phase 4 — Polish, a11y, performance, PR (1 commit + PR)

- Accessibility: slider keyboard/touch operable, focus states, alt text, color-contrast on gold/teal CTAs, prefers-reduced-motion respected.
- Performance: lazy-load slider images + heavy media; no CLS; check Lighthouse on key routes.
- Responsive-first verification on mobile (primary audience).
- `feat(polish): a11y + performance + responsive pass`
- **Open a PR into `main`** titled `Premium conversion & positioning upgrade`. In the PR body: summarize per-phase changes, list every TODO/seam I must complete (payment keys, email provider, env vars), and the Vercel branch-preview URL. **Do not merge.**

---

## Guardrails recap
- ❌ never touch `main` · ❌ no payment secrets/keys committed · ❌ no `#FFD60A` · ❌ no bouncy motion · ❌ no duplicate components or placeholder text shipped.
- ✅ feature branch → Vercel preview → PR → I review/merge.
- ✅ stop after Phase 0 for approval.

Begin with **Phase 0** now.

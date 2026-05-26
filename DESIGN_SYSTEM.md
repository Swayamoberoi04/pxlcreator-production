# PXL Creator — Official Design System & Art Direction Document

**Version:** 1.0  
**Status:** Active  
**Owner:** PXL Creator Brand Team  
**For use by:** Claude Code, frontend developers, UI/UX designers, branding systems, AI agents

---

> This document is the single source of truth for every visual and interaction decision on PXL Creator.  
> If it isn't in this document, it doesn't belong on the product.

---

## 01. DESIGN PHILOSOPHY

### Core Identity Statement
PXL Creator is not a tool. It is a creative environment.  
Every pixel, every transition, every line of copy must reinforce one emotional truth:  
**"This is where serious creators come to develop their visual identity."**

### The Three Pillars
1. **Cinematic Calm** — The experience should feel like walking into a beautifully lit studio, not a marketplace. Restrained. Intentional. Atmospheric.
2. **Editorial Precision** — Every element earns its place. Nothing decorative without purpose. Every visual decision has a functional reason.
3. **Creator-First Empathy** — The interface anticipates the creator's emotional state: aspirational, slightly overwhelmed, looking for clarity. The design delivers that clarity without condescension.

### Emotional Experience Map
| Page State | User Emotion | Design Response |
|---|---|---|
| First visit | Curious, skeptical | Dramatic hero, slow reveal, no clutter |
| Browsing presets | Aspirational, comparing | Clean grid, cinematic thumbnails, clear hierarchy |
| Reading education | Engaged, learning | Wide breathing space, strong typographic rhythm |
| At checkout | Slightly anxious | Minimal UI, zero distractions, trust signals prominent |
| Post-purchase | Satisfied, excited | Warm confirmation, clear next step, no upsell pressure |

### What the experience should NEVER feel like
- A Shopify template
- A YouTube creator's Linktree
- An Etsy shop
- A "presets pack" landing page
- Overcrowded with badges, banners, pop-ups
- Generic SaaS with brand colors swapped

### Design Inspiration Hierarchy
1. **Apple** — Spatial clarity, controlled whitespace, typographic confidence
2. **Linear** — Dark mode mastery, premium SaaS minimalism, micro-interaction precision
3. **Framer** — Scroll-driven storytelling, editorial layout confidence
4. **A24** — Cinematic restraint, mood-first visual communication
5. **Loewe / Bottega Veneta** — Luxury brand silence (what you don't say matters)

---

## 02. TYPOGRAPHY SYSTEM

### Font Stack

```
Display (headlines, brand voice):  Syne — Black 900, Bold 700
Body (reading, UI text):           DM Sans — Regular 400, Medium 500, SemiBold 600
Mono (code, data, labels):         System monospace stack
```

**Why Syne?** Its geometric weight at 900 creates a commanding editorial presence. It reads as modern, unapologetic, and design-aware — exactly the personality PXL Creator projects.  
**Why DM Sans?** It is optically clear at small sizes, warm enough to avoid coldness, and pairs perfectly with Syne's angularity.

### Type Scale

```
Display XL   — clamp(2.5rem, 6vw, 5rem)    | Syne 900 | lh 1.00 | ls -0.025em
Display L    — clamp(2rem, 5vw, 3.5rem)     | Syne 900 | lh 1.05 | ls -0.020em
Heading 1    — clamp(1.875rem, 4vw, 3rem)   | Syne 700 | lh 1.08 | ls -0.015em
Heading 2    — clamp(1.5rem, 3vw, 2rem)     | Syne 700 | lh 1.15 | ls -0.010em
Heading 3    — clamp(1.125rem, 2vw, 1.375rem)| Syne 700 | lh 1.25 | ls -0.005em
Body Large   — 1.0625rem (17px)             | DM Sans 400 | lh 1.75 | ls 0
Body         — 1rem (16px)                  | DM Sans 400 | lh 1.70 | ls 0
Body Small   — 0.9375rem (15px)             | DM Sans 400 | lh 1.65 | ls 0
UI Label     — 0.75rem (12px)               | DM Sans 600 | lh 1.0  | ls 0.10em | UPPERCASE
Caption      — 0.8125rem (13px)             | DM Sans 400 | lh 1.55 | ls 0
Button       — 0.9375rem (15px)             | DM Sans 600 | lh 1.0  | ls 0.01em
```

### Hierarchy Rules

**Use Syne 900 for:** Hero headlines, section-opening statements, brand voice moments, manifesto text  
**Use Syne 700 for:** Section headings, card titles, feature headers  
**Use DM Sans 600 for:** Buttons, labels, navigation, pricing, stat numbers  
**Use DM Sans 400 for:** Body copy, descriptions, tooltips, legal text  
**Never use:** DM Sans 900, random font weights, more than 2 typefaces on any page

### Golden Rules
- Never set body copy wider than 72 characters per line
- Never use more than 3 type sizes in a single card
- Never center-align body copy longer than 2 lines
- Every heading benefits from negative letter-spacing; body copy never does
- `text-label` class (0.75rem / 600 / UPPERCASE / ls 0.10em) is for metadata only — not decorative

### Responsive Behavior
All display and heading sizes use `clamp()` — they scale fluidly between mobile and desktop without breakpoint jumps. Body copy stays fixed at `1rem` on mobile, `1.0625rem` on desktop.

---

## 03. COLOR SYSTEM

### Primary Palette

```
Background   #000000   Pure black. The cinematic stage.
Surface      #111111   First elevation — cards, nav, modals
Surface-2    #1A1A1A   Second elevation — hover states, inner cards
Surface-3    #222222   Third elevation — tooltips, deepest containers
Border       #222222   Hairline separators. Never heavier than this.
Foreground   #FFFFFF   Primary text only.
Muted        #AAAAAA   Secondary text, metadata, placeholder copy
```

### Brand Accent Palette

```
Gold         #FFD700   Primary brand accent. Use sparingly and intentionally.
Gold Dim     #E5A227   Hover state for gold interactive elements
Gold Muted   rgba(255,215,0,0.12)   Background tint for featured zones
```

**Gold is not a color. It is a signal.**  
Gold appears on: active states, premium features, CTAs, brand moments, highlights.  
Gold does NOT appear on: borders everywhere, backgrounds, decorative elements, UI chrome.  
The moment gold is overused, it loses its signaling power entirely.

### Extended Semantic Palette

```
Success      #22C55E  (Tailwind green-500)    Confirmation states
Warning      #F59E0B  (Tailwind amber-500)    Attention without alarm
Error        #EF4444  (Tailwind red-500)      Failures, destructive actions
Info         #6366F1  (Indigo-500)            AI Studio identity color
```

### Gradient System

```
Gold Gradient    linear-gradient(135deg, #FFD700 0%, #E5A227 100%)
                 → Used on text, never as a full background

Hero Gradient    radial-gradient at hero center, gold opacity 0.04–0.06, blur 120px+
                 → Ambient glow only. Creates cinematic depth without distraction.

Indigo×Gold      linear-gradient(90deg, #6366F1 0%, #FFD700 100%)
                 → AI Studio exclusive. Marks AI-powered features.

Text Gradient    linear-gradient(135deg, #FFFFFF 0%, #FFD700 45%, #E5A227 100%)
                 → Reserved for vision statements, closing manifesto moments only
```

### Glow Usage Rules
Glows are depth tools, not decoration. They simulate the soft light bleed of a photographic subject.

```
Gold text glow:    text-shadow: 0 0 10px rgba(255,215,0,0.80), 0 0 24px rgba(255,215,0,0.40)
                   → Active nav items, logo, key interactive text only

Section ambient:   Large blurred div, opacity 0.03–0.07, blur 80–140px
                   → One per section maximum. Never stacked.

Interactive glow:  box-shadow: 0 0 32px rgba(255,215,0,0.18)
                   → CTA buttons in their enabled state only
```

### Dark Mode Philosophy
PXL Creator is dark-mode-first by design. There is no light mode.  
Pure black (#000000) as the base creates maximum contrast, makes gold pop at full luminosity, and delivers the cinematic premium feel the brand demands. Light backgrounds would feel clinical and reduce perceived premium quality.

---

## 04. SPACING & LAYOUT SYSTEM

### The Core Principle
**Whitespace is not empty space. It is breathing room. It is premium.**  
The more expensive a brand feels, the more space it gives its content. Apple, Rolex, A24 — they all let content breathe. Crowding is a signal of anxiety, not value.

### Spacing Scale (4px base unit)

```
1    →  4px    Hairline gaps within inline elements
2    →  8px    Internal component padding (chips, badges)
3    →  12px   Small component gaps
4    →  16px   Default element spacing
5    →  20px   Card internal padding (small)
6    →  24px   Card internal padding (standard)
8    →  32px   Between related groups
10   →  40px   Component separation
12   →  48px   Large component gaps
14   →  56px   Section header bottom margin
16   →  64px   Major section internal padding
20   →  80px   Section vertical padding (mobile)
24   →  96px   Section vertical padding (tablet)
28   →  112px  Section vertical padding (desktop)
32   →  128px  Hero vertical padding
```

### Layout Grid

```
Container widths:
  Default:  max-w-[1100px]   → Standard content: sections, text, grids
  Wide:     max-w-[1280px]   → Full product grids, galleries
  Narrow:   max-w-[720px]    → Blog posts, checkout, legal, forms

Container padding:
  Mobile:    px-5  (20px)
  Tablet:    px-8  (32px)
  Desktop:   px-10 (40px)
  Large:     px-16 (64px)
```

### Section Spacing Formula

```
Every full-page section:
  Mobile:  py-16 sm:py-20   (64px / 80px)
  Desktop: sm:py-24 lg:py-28 (96px / 112px)

Section header to content:  mb-12 sm:mb-16  (48px / 64px)
Between grid cards:          gap-6           (24px)
Between stacked sections:    border-b border-border (visual break, no extra margin)
```

### Component Spacing Standards

| Component | Internal Padding | Gap Between Items |
|---|---|---|
| Large card | p-6 (24px) | gap-4 (16px) |
| Small card | p-4 (16px) | gap-3 (12px) |
| Button (primary) | px-8 py-3.5 | — |
| Button (compact) | px-6 py-2.5 | — |
| Navbar height | h-14 (56px) | gap-1 between links |
| Form input | px-4 py-3 | gap-2 between label/input |
| Modal | p-6 sm:p-8 | — |

### The Crowding Test
Before shipping any layout, ask: "If I removed 20% of the elements, would this be more powerful?"  
If the answer is yes — remove them.

---

## 05. SHAPE LANGUAGE

### Border Radius System

```
xs    →  0.25rem  (4px)    Inline chips, tags, small badges
sm    →  0.375rem (6px)    Compact UI elements
md    →  0.5rem   (8px)    Input fields, small buttons
lg    →  0.625rem (10px)   Standard cards, nav items
xl    →  0.75rem  (12px)   Feature cards, dropdowns
2xl   →  1rem     (16px)   Section cards, modals, major UI blocks
full  →  9999px            Pills, avatar rings, toggle switches
```

### Shape Philosophy
- **Cards:** `rounded-xl` (12px) for standard, `rounded-2xl` (16px) for featured
- **Buttons:** `rounded-xl` for primary CTAs, `rounded-full` for pill-style secondary buttons
- **Inputs:** `rounded-xl` — never use `rounded-md` on forms, it reads as generic
- **Chips/Badges:** `rounded-full` always
- **Images:** `rounded-2xl` for editorial image blocks, `rounded-xl` for product thumbnails
- **Never use `rounded-none`** — sharp corners communicate cheapness in this brand context

### Depth & Layering
PXL Creator uses three visual elevations:

```
Level 0  → #000000 background  (the stage)
Level 1  → #111111 surface     (cards, primary containers)
Level 2  → #1A1A1A surface-2   (hover states, nested containers)
Level 3  → #222222 surface-3   (tooltips, deepest insets)
```

Borders at every elevation are `border-border` (#222222). They separate without dividing — a suggestion of structure, not a wall.

---

## 06. VISUAL HIERARCHY SYSTEM

### Attention Flow Map
Every layout should guide the eye in a predictable Z or F pattern:
1. **Top-left:** Brand / navigation identity
2. **Center-top:** Primary value statement (largest text)
3. **Center:** Supporting evidence (images, testimonials, features)
4. **Bottom-center:** CTA (always the visual destination)

### Hierarchy Tiers

```
Tier 1 — COMMAND:    Hero headline, section title. One per section. Max 2 sentences.
Tier 2 — SUPPORT:    Subheadline, descriptive copy. Max 3 lines.
Tier 3 — EVIDENCE:   Cards, images, lists, testimonials. The proof layer.
Tier 4 — ACTION:     CTAs. Always singular and clear. Never compete.
Tier 5 — METADATA:   Labels, captions, timestamps, legal. Muted, never dominant.
```

### CTA Hierarchy
Every page has exactly **one primary CTA** and optionally one secondary CTA.

```
Primary CTA:    bg-gold, rounded-full or rounded-xl, font-semibold
Secondary CTA:  border-border, ghost style, rounded-full
Tertiary CTA:   Text link with → arrow, no border, text-muted hover-text-foreground
```

Primary and secondary CTAs must never be the same visual weight. If they look equal, the primary loses power.

### Page-Specific Rules

**Homepage:**  
Hero → Products → Brand Story → Social Proof → Final CTA  
Each section answers one question: Who are you? What do you sell? Why are you different? Who trusts you? What should I do?

**Preset Pages:**  
Image first. Price prominent. Social proof close to CTA. Description below fold — it's supplementary.

**Checkout:**  
Remove all navigation. Single-column. Trust signals (secure, instant, no-subscription) directly adjacent to the submit button. Zero distractions.

**Studio/Tool Pages:**  
Tool occupies primary visual real estate. Instructions are secondary. The interface teaches itself.

---

## 07. IMAGE TREATMENT SYSTEM

### Cinematic Image Philosophy
Images on PXL Creator should look like they were selected by a film director, not a stock photo librarian. Every image should have:
- **Strong tonal intentionality** — warm golds, cool silvers, or deep shadows. No flat, neutral, corporate images.
- **Emotional atmosphere** — the image should make you feel something before you read anything
- **Consistency with the brand palette** — warm tones align with gold, cool tones align with indigo (AI features)

### Technical Standards

```
Aspect Ratios:
  Hero images:        16/9 or 2/1 (cinematic widescreen)
  Product thumbnails: 4/3 (slightly tall, feels editorial)
  Profile/avatar:     1/1 (square, then circle-clipped)
  Gallery cards:      3/2 or 4/3 (consistent within a grid)

Quality:
  Never use compressed JPEGs below 80% quality
  All images should survive a 2x Retina screen
  Use Next.js <Image> for all performance-critical images

Treatment:
  Subtle vignette on full-bleed hero images
  Never pure-white backgrounds on product images
  Slight warm tone (+5 to +10 on warmth) preferred over cold/neutral
```

### Placeholder System (Preset Cards)
When real photography isn't available, use the CSS gradient placeholder system in `PresetCard.tsx`:
- Each category has a distinct dark gradient (deep gold for Cinematic, deep blue for Landscape, etc.)
- Decorative filmstrip lines create visual texture at 20% opacity
- This is a temporary measure — real sample images should replace these progressively

### Hover Behavior
```
Product images:   scale(1.04) on hover, duration 500ms, ease-out
Gallery images:   Overlay appears (gradient from transparent to black/50%) with preset name
Hero images:      No hover effect (passive, cinematic)
```

### Image Overlays
When overlaying text on images:
```
Dark overlay:     linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)
Gold overlay:     Never — gold on image backgrounds reads as low quality
Blur backdrop:    backdrop-blur-sm (4px) for floating UI elements over images
```

---

## 08. MOTION & ANIMATION LANGUAGE

### Motion Philosophy
**Motion should feel inevitable, not surprising.**  
Every animation should feel like the natural consequence of an action — not a flourish added for visual interest. If an animation can be removed without the user noticing, it should be.

### Timing System

```
Instant:    0ms       State changes with no perceived motion (color only)
Fast:       150ms     Hover states, button press feedback
Standard:   200ms     Most UI transitions (border color, opacity, background)
Deliberate: 300ms     Panel slides, dropdown opens, card enters
Slow:       500ms     Image scale, hero reveal, page transitions
Cinematic:  700ms+    Section entries, confidence bars, dramatic reveals
```

### Easing Curves

```
ease-out        → Most UI transitions. Starts fast, decelerates. Feels natural.
ease-in-out     → Page-level transitions. Symmetric, controlled.
linear          → Loading bars, progress indicators only.
spring(custom)  → Bounce-in for celebratory moments (cart added, success state) only.
```

### Hover States
Every interactive element must have a hover state. No exceptions.

```
Links:      color transition to gold, 200ms ease-out
Buttons:    bg/border shift, optional slight scale (0.98 for primary, none for ghost)
Cards:      -translate-y-1 (4px lift), border-gold/40, shadow enhancement, 300ms
Images:     scale(1.04), overflow hidden, 500ms ease-out
Nav items:  Color to foreground, 200ms
```

### Scroll Animations
Use sparingly. PXL Creator relies more on typographic weight than scroll tricks.

**Acceptable:**
- Fade-in on first viewport entry (`opacity-0 → opacity-100`, `translateY(12px) → 0`)
- Confidence/progress bar fills on entry (gold bars, step indicators)
- Staggered card grid entry (each card delayed by 50ms)

**Never acceptable:**
- Parallax on mobile
- Continuous spinning/pulsing elements in primary content areas
- Text that types itself character by character
- Elements that slide in from off-screen on scroll

### Microinteractions

```
Form submit:     Button disabled → spinner → success icon → reset
Add to Cart:     Gold → green with ✓, 1800ms → reset
Download:        Standard → "Saved to downloads" → reset after 3s
Toggle/Chip:     Border + bg fill, scale(0.97) press, 150ms
```

---

## 09. UI COMPONENT SYSTEM

### Buttons

```
Primary (Gold Solid):
  bg-gold text-background rounded-full px-8 py-3.5 font-semibold text-[0.9375rem]
  hover: bg-gold-dim
  active: scale-[0.97]
  disabled: bg-surface-2 text-muted/40 cursor-not-allowed

Secondary (Ghost):
  border border-border rounded-full px-8 py-3.5 font-medium text-muted text-[0.9375rem]
  hover: border-gold/40 text-foreground
  Never use bg on ghost buttons

Compact (Inside cards, UI):
  rounded-xl px-6 py-2.5 text-[0.875rem] font-medium

Danger:
  border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl
  hover: border-red-500/50 bg-red-500/15
```

### Cards

```
Standard Card:
  rounded-xl border border-border bg-surface
  hover: border-gold/40 -translate-y-1 shadow-[0_8px_40px_rgba(255,215,0,0.07)]
  Internal padding: p-5 or p-6

Featured Card:
  rounded-2xl border border-gold/20 bg-gold/[0.04]
  Top rule: inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent
  Internal padding: p-6 sm:p-8

Glass Card (over images):
  bg-black/60 backdrop-blur-md border border-white/10 rounded-xl
```

### Navigation Bar

```
Height:       h-14 (56px)
Background:   bg-background/80 backdrop-blur-xl
Border:       border-b border-border/50
Position:     sticky top-0 z-50

Links:        px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide
Active state: text-gold + text-glow-gold + h-px underline indicator at bottom
Inactive:     text-muted/70 hover:text-foreground

CTA in nav:   bg-gold text-background rounded-full px-5 py-1.5 text-sm font-semibold
```

### Forms & Inputs

```
Input:
  rounded-xl border border-border bg-background px-4 py-3
  text-[0.9375rem] text-foreground placeholder:text-muted/35
  focus: border-gold/50 outline-none

Textarea:
  Same as input + resize-none min-h-[120px]

Label:
  text-label text-muted/60 tracking-widest (above input)

Error state:
  border-red-500/50 bg-red-500/[0.04]
  Error text: text-[0.8125rem] text-red-400 mt-1.5

Form card wrapper:
  rounded-2xl border border-border bg-surface p-6 sm:p-8
```

### Preset Gallery Grid

```
Desktop:  grid-cols-3 gap-6
Tablet:   grid-cols-2 gap-5
Mobile:   grid-cols-1 gap-4 (or grid-cols-2 for compact cards)

Card aspect ratio: 4/3 image + body below
Hover: CTA slides up from bottom with gradient overlay
Never: Horizontal list on desktop — presets are visual products, grid is mandatory
```

### Pricing Cards

```
Non-featured:  rounded-2xl border border-border bg-surface p-6
Featured:      rounded-2xl border border-gold/25 bg-gold/[0.04] p-6 relative
               + "Most Popular" badge top-right
               + Top gold rule

Price number:  font-display font-black text-[2.5rem] text-foreground
Period:        text-[0.875rem] text-muted
CTA:           Full-width at bottom of card, primary style for featured
```

### Section Header Pattern (Standard)

```jsx
<div className="flex items-center gap-3">
  <span className="h-px w-8 bg-gold opacity-70" />
  <span className="text-label text-gold tracking-widest">SECTION LABEL</span>
  <span className="h-px w-8 bg-gold opacity-70" />
</div>
<h2 className="heading-2 text-foreground">
  Main Headline
</h2>
<p className="text-lead max-w-xl">
  Supporting copy — concise, one idea.
</p>
```

---

## 10. HCI PRINCIPLES

### Usability Foundations
- **Fitts's Law:** CTAs must be large enough to click without precision. Minimum tap target: 44×44px on mobile.
- **Hick's Law:** Reduce choices. One primary action per screen state. No decision paralysis.
- **Miller's Law:** Never present more than 7 items in a single navigation group or feature list.
- **Jakob's Law:** Navigation patterns (hamburger, cart icon, profile) follow universal conventions. Do not innovate on expected behaviors.

### Cognitive Load Reduction
1. Every section answers ONE question. If it answers two, split it.
2. Progressive disclosure — show the minimum needed, reveal depth on demand.
3. Consistent patterns — if a card behaves one way on the homepage, it behaves identically everywhere.
4. Pre-attentive attributes — gold, size, weight, and position establish hierarchy before the user consciously reads.

### Accessibility Standards
```
Color contrast:   Body text on dark bg: minimum 7:1 (AAA)
                  Gold on black: 8.32:1 (passes AAA)
                  Muted text (#AAAAAA on #000000): 4.73:1 (passes AA)

Focus states:     focus-visible:ring-2 focus-visible:ring-ring on ALL interactive elements
                  Never remove focus rings — style them instead

Semantic HTML:    <nav>, <main>, <section>, <article>, <button> — never <div onClick>
                  Every image has meaningful alt text or aria-hidden="true" if decorative

Motion:           Respect prefers-reduced-motion. All animations should be CSS transitions
                  that can be disabled via @media (prefers-reduced-motion: reduce)

Screen readers:   aria-label on icon-only buttons, aria-current="page" on active nav links
                  sr-only text for context not visible on screen
```

### Interaction Feedback
Every action must have feedback within 100ms. The user must never wonder "did that work?"

```
Button click:     Visual press (scale down) in <100ms
Form submit:      Loading state immediately, never a freeze
Add to Cart:      Instant visual change, no delay
Error state:      Clear, inline, adjacent to the problem — never a toast for form errors
Success state:    Warm green, brief (1.8–3s), then auto-reset
```

---

## 11. PREMIUM WEBSITE EXPERIENCE STRATEGY

### What Makes a Website Feel Expensive

**1. Confident Whitespace**  
Cheap websites fill every pixel because they're afraid of "wasting space."  
Premium brands own whitespace because space signals confidence. Apple's homepage is 60% whitespace.

**2. Typographic Restraint**  
One display font family. Max two weights in a single section. No gradients on body copy.  
The moment a website uses 4 different font sizes in a card, it signals amateur execution.

**3. Controlled Color**  
Premium brands have ONE accent color used with extreme discipline.  
Gold is PXL Creator's accent. It appears on 20% of the UI. The remaining 80% is neutral — which makes gold feel precious when it appears.

**4. Motion That Earns Its Place**  
Cheap sites animate everything. Premium sites animate almost nothing — but what they do animate feels like physics, not CSS.

**5. Photography Quality Signal**  
Users don't consciously evaluate photography quality, but they unconsciously register it.  
One bad stock photo destroys premium perception that took 20 design decisions to build.

**6. Hierarchical Clarity**  
At a glance, users should understand: what this is, what it costs, why it matters, and what to do.  
If they need to hunt for any of these, the hierarchy has failed.

### Why Most Creator Websites Fail Visually
- **Aesthetic identity borrowed from peers** — looks like every other preset brand
- **Too many features announced at once** — creates overwhelm not excitement
- **Inconsistent card sizing** — breaks the visual rhythm
- **Gold/neon overuse** — loses premium signal
- **Generic section headings** — "Our Features," "Why Choose Us" — no brand voice
- **Conflicting font weights** — 5 different weights on one page
- **Mobile as afterthought** — everything squished instead of redesigned

---

## 12. BRAND CONSISTENCY RULES

### The Single-Brand Test
Any new page, section, or component should be identifiable as PXL Creator even with the logo removed. If it could be any other brand, revise.

### Strict Rules

**Typography:**
- Syne only for display/heading roles. Never for body copy.
- DM Sans only for body/UI. Never try to make it display.
- Letter-spacing on labels: always 0.10em+. Never on body copy.
- Negative letter-spacing on headings: always. (-0.01em minimum)

**Color:**
- Gold only on: active states, CTAs, featured elements, brand moments, gradient text highlights
- Never use gold as a background fill for sections
- Never use more than 2 accent colors on a single page (gold + one supporting color max)

**Iconography:**
- Lucide icon library as the standard (already implicit in SVG usage patterns)
- strokeWidth: 2 for standard icons, 2.5 for small icons (<16px), 1.5 for large icons (>24px)
- Icons are always `aria-hidden="true"` — they accompany text, never replace it
- Icon color follows parent text color — never hardcoded unless intentional (e.g., gold star)

**Animation:**
- All durations in the system: 150ms / 200ms / 300ms / 500ms / 700ms
- No custom durations outside this set without documented reason
- All easings: ease-out (standard), ease-in-out (page-level), linear (progress only)

**Section Structure:**
- Every section begins with a label (text-label + gold/muted color) above the heading
- Every full-width section uses `border-b border-border` as its separator — never margin
- Alternating bg pattern: background → surface → background → surface (creates visual rhythm)

---

## 13. MOODBOARD & VISUAL REFERENCES

### Photography Style
The ideal PXL Creator image:
- **Tonal:** Rich shadows, controlled highlights, pulled-back saturation with one dominant warm hue
- **Composition:** Intentional negative space, subject isolated by depth of field or exposure
- **Emotion:** Contemplative, aspirational, quiet — not energetic, lifestyle-stock, or busy
- **Reference photographers:** Tyler Mitchell, Petra Collins (for warmth), Erik Madigan Heck (for editorial density), Wong Kar-wai stills (for cinematic atmosphere)

### Design References

| Brand | What to Borrow |
|---|---|
| Apple | Centered layouts, typographic confidence, hero image restraint, product photography cleanliness |
| Linear | Dark UI mastery, subtle glow usage, card hierarchy in dark environments |
| Framer | Scroll-driven section reveals, editorial headline sizing, generous layout breathing |
| Notion | Functional minimalism, content-forward layouts, clean documentation feel |
| A24 | Cinematic poster design — high contrast, minimal text, mood-before-information |
| Loewe | What NOT to show — luxury through omission, letting one visual element own the page |
| Vercel | Developer-grade dark UI clarity, information hierarchy, badge/label systems |

### Cinematic References for Copy Tone
- **Taglines:** Short, declarative, present tense. "See differently." not "Helping creators see differently."
- **Section labels:** One word or two. "The Moats." "The Gap." "Why We Exist."
- **Body copy:** Maximum 3 sentences per paragraph. Breathe between ideas.
- **No marketing superlatives:** "Best," "most powerful," "industry-leading" — these are cheap signals. Show, don't claim.

---

## 14. FINAL DESIGN DIRECTION SUMMARY

### The PXL Creator Visual Identity in One Paragraph
PXL Creator presents itself as the premium dark-mode creative ecosystem — pure black canvas, gold as the sole accent signal, Syne headlines that command attention, DM Sans body copy that earns trust, and negative space that communicates confidence. Motion is inevitable and minimal. Typography does the heavy lifting. Color is disciplined. Every layout decision asks: "Does this feel like a premium studio environment, or does it feel like a template?" If the answer is the latter — it ships when revised.

### The Five Non-Negotiables
1. **Black is the canvas.** Not dark grey. Not charcoal. Black.
2. **Gold is a signal, not a theme.** Use it for emphasis. Never for decoration.
3. **One font system.** Syne + DM Sans. No additions, ever.
4. **Whitespace is a feature.** Not a gap to be filled.
5. **Every section earns its place.** If it doesn't advance the user's journey, it doesn't exist.

### Emotional Direction in Three Words
**Cinematic. Intentional. Empowering.**

### What "Done" Looks Like
A finished page on PXL Creator should be able to pass these tests:
- [ ] Remove all copy — does the layout still communicate hierarchy?
- [ ] View on a 375px mobile — does it feel designed, or squeezed?
- [ ] Show it to someone outside the creator niche — do they perceive it as premium?
- [ ] Cover the logo — is it still recognizably PXL Creator?
- [ ] Scan it in 3 seconds — do you know exactly what to do next?

If all five answers are yes, it ships.

---

*Document maintained by the PXL Creator design team.*  
*All deviations require documented reasoning and design review before implementation.*  
*Last updated: 2026*

"use client"

import { useState } from "react"
import Link         from "next/link"
import { Container } from "@/components/layout/Container"
import { cn }        from "@/lib/utils"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal }     from "@/components/ui/CinematicReveal"

/* ── FAQ data ──────────────────────────────────────────────── */
interface FAQItem {
  q: string
  a: string
  category: string
}

const FAQS: FAQItem[] = [
  /* ── Presets & Compatibility ── */
  {
    category: "Presets & Compatibility",
    q: "What file formats do the presets come in?",
    a: "Every preset pack ships as .xmp files (compatible with Lightroom Classic, Lightroom CC, and Adobe Camera Raw) and .dng files (for Lightroom Mobile on iOS and Android). Both formats are included in every download.",
  },
  {
    category: "Presets & Compatibility",
    q: "Which versions of Lightroom are supported?",
    a: "Lightroom Classic (all versions from 2018 onwards), Lightroom CC (desktop and mobile), and Adobe Camera Raw in Photoshop. DaVinci Resolve LUTs are included in select packs.",
  },
  {
    category: "Presets & Compatibility",
    q: "Do the presets work on mobile (iPhone / Android)?",
    a: "Yes. The .dng files included in every pack work in Lightroom Mobile on both iOS and Android. Import the .dng, copy the settings, and paste them onto any photo.",
  },
  {
    category: "Presets & Compatibility",
    q: "Will these work on any camera brand — Sony, Canon, Nikon, Fuji?",
    a: "Yes. Every preset is tested across RAW files from all major camera brands. You may need minor Exposure or White Balance tweaks depending on your specific body and lens combination, but the grade will be consistent.",
  },
  {
    category: "Presets & Compatibility",
    q: "What cameras or sensors have you tested these on?",
    a: "We test every pack on Sony A7 series, Canon R series, Nikon Z series, and Fujifilm X-Trans sensors. The presets are designed to handle the colour science differences between these systems.",
  },
  {
    category: "Presets & Compatibility",
    q: "Can I use these presets on JPEG files, or only RAW?",
    a: "They work on both, but results are significantly better on RAW files. JPEGs have already had camera-side processing applied, which can cause clipping and colour shifts. For best results, always shoot RAW when using cinematic presets.",
  },

  /* ── Download & Installation ── */
  {
    category: "Download & Installation",
    q: "How do I install presets in Lightroom Classic?",
    a: "Open Lightroom Classic → go to the Develop module → right-click in the Presets panel → Import Presets → select the .xmp files from your download. The presets will appear in a named folder in your panel.",
  },
  {
    category: "Download & Installation",
    q: "How do I install presets in Lightroom Mobile?",
    a: "Import the included .dng file into your Lightroom Mobile library → open it → tap the three-dot menu → Copy Settings → go to any photo → Paste Settings. You can then save it as a preset for one-tap use.",
  },
  {
    category: "Download & Installation",
    q: "Where is my download link after purchasing?",
    a: "Your download link is sent immediately to the email you used at checkout. If you don't see it within 5 minutes, check your spam folder. You can also access all your purchases from your account dashboard under 'My Orders'.",
  },
  {
    category: "Download & Installation",
    q: "How long is my download link valid for?",
    a: "Download links are valid for 30 days from purchase and allow up to 5 downloads. If your link expires, contact us at creatorpxl@gmail.com and we'll reissue it — no questions asked.",
  },

  /* ── AI Studio ── */
  {
    category: "AI Studio",
    q: "What is AI Studio and how does it work?",
    a: "AI Studio is our GPT-4o Vision powered tool. You upload a photo, describe the aesthetic you want (e.g. 'warm golden hour', 'moody cinematic blue'), and the AI analyses your image and applies a cinematic colour grade — then recommends the exact preset pack that permanently achieves that look.",
  },
  {
    category: "AI Studio",
    q: "Is AI Studio free to use?",
    a: "Yes. AI Studio is completely free to try — no account required. You get a processed image and a preset recommendation instantly.",
  },
  {
    category: "AI Studio",
    q: "Does AI Studio work on portrait, landscape, and street photos?",
    a: "Yes. The AI adapts its grading recommendation based on what it detects in the image. It handles skin tones differently from landscapes, and urban scenes differently from nature.",
  },
  {
    category: "AI Studio",
    q: "Can I download the AI-edited image?",
    a: "Yes. After processing, you can download the graded image as a JPEG. The actual Lightroom preset file is a separate purchase if you want to apply the same look to your entire library.",
  },

  /* ── Returns & Refunds ── */
  {
    category: "Returns & Refunds",
    q: "Can I get a refund?",
    a: "Yes. We offer a 30-day money-back guarantee on all purchases. If you're not satisfied for any reason, email creatorpxl@gmail.com with your order number and we'll process a full refund.",
  },
  {
    category: "Returns & Refunds",
    q: "What if the presets don't look like the preview images?",
    a: "Preview images are shot on specific cameras in specific conditions. Results will vary based on your camera, lens, and lighting. We recommend using the AI Studio tool first to preview what our grades look like on your own photos before purchasing.",
  },
  {
    category: "Returns & Refunds",
    q: "Can I exchange a pack for a different one?",
    a: "Yes. If you purchased the wrong pack within the last 30 days, contact us and we'll swap it for a different pack of equal or lesser value.",
  },

  /* ── Usage & Licensing ── */
  {
    category: "Usage & Licensing",
    q: "Can I use these presets for commercial photography (paid client work)?",
    a: "Yes. All PXL Creator presets come with a personal and commercial use license. You can use them on paid client shoots, editorial work, and social media content. The only restriction is reselling or redistributing the preset files themselves.",
  },
  {
    category: "Usage & Licensing",
    q: "Can I share presets with friends or colleagues?",
    a: "Each license covers one person. If your team or studio wants to use the presets, they need their own license. We offer volume discounts for teams of 3 or more — contact us.",
  },
  {
    category: "Usage & Licensing",
    q: "Do the presets have any watermarks or restrictions on the output?",
    a: "None at all. Your edited photos are completely yours — no watermarks, no attribution required, no restrictions on how you publish or sell the final images.",
  },

  /* ── Technical ── */
  {
    category: "Technical",
    q: "My preset looks too warm / too cool on my specific camera. What do I do?",
    a: "This is normal. Every camera has its own colour science and sensor response. Start by adjusting White Balance (±200K) and Tint (±5). Most preset makers recommend fine-tuning these two controls first before touching anything else.",
  },
  {
    category: "Technical",
    q: "The preset is clipping my highlights. How do I fix this?",
    a: "Pull the Highlights slider down to −20 to −40, and reduce Whites by 5–10 points. If you shot a high-contrast scene, you may also want to open the Tone Curve and bring down the upper quarter slightly.",
  },
  {
    category: "Technical",
    q: "Can I modify the presets to match my style?",
    a: "Absolutely — that's encouraged. The presets are a starting point. Adjust any slider you want. A common workflow is: apply the preset, adjust WB and Exposure, then tweak the Tone Curve and HSL panel to personalise it.",
  },
]

const CATEGORIES = [...new Set(FAQS.map((f) => f.category))]

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All")
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const visible = activeCategory === "All"
    ? FAQS
    : FAQS.filter((f) => f.category === activeCategory)

  return (
    <div className="w-full bg-background">

      {/* ── Hero ── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="gold" intensity={0.85} />
        <GrainOverlay opacity={0.016} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent z-[3]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">Help Centre</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="font-display font-black text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-tight text-foreground">
                Frequently Asked{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #ffd700 0%, #e5a227 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Questions
                </span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.13}>
              <p className="text-[1.0625rem] text-muted/65 max-w-md leading-relaxed">
                Everything you need to know about PXL Creator presets, AI Studio, downloads, and licensing.
              </p>
            </CinematicReveal>

            <p className="text-[0.875rem] text-muted/50">
              Can&apos;t find your answer?{" "}
              <Link href="/contact" className="text-gold hover:underline underline-offset-4 transition-colors">
                Contact us →
              </Link>
            </p>

          </div>
        </Container>
      </div>

      <Container className="py-12 sm:py-20">
        <div className="max-w-3xl mx-auto">

          {/* ── Category filter tabs ── */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {["All", ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setActiveCategory(cat); setOpenIndex(null) }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[0.8125rem] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeCategory === cat
                    ? "bg-gold text-background shadow-[0_0_16px_rgba(255,215,0,0.25)]"
                    : "border border-border text-muted hover:text-foreground hover:border-gold/30"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Accordion ── */}
          <div className="flex flex-col divide-y divide-border/60">
            {visible.map((faq, i) => (
              <AccordionItem
                key={faq.q}
                faq={faq}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>

          {/* ── Still need help ── */}
          <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.07]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p className="font-display font-bold text-foreground mb-1">Still have a question?</p>
                <p className="text-[0.875rem] text-muted/60">
                  Our team typically replies within 24 hours on business days.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-[0.875rem] font-semibold text-background hover:bg-gold-dim transition-colors shadow-[0_0_24px_rgba(255,215,0,0.15)]"
              >
                Contact Support →
              </Link>
            </div>
          </div>

        </div>
      </Container>
    </div>
  )
}

/* ── Accordion item ── */
function AccordionItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQItem
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="py-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm group"
      >
        <span className="font-display font-bold text-[0.9375rem] text-foreground group-hover:text-gold transition-colors duration-200 leading-snug">
          {faq.q}
        </span>
        <span
          className={cn(
            "shrink-0 mt-0.5 text-muted transition-transform duration-200",
            isOpen && "rotate-45 text-gold"
          )}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <p className="mt-3.5 text-[0.875rem] text-muted/70 leading-relaxed pr-8">
          {faq.a}
        </p>
      )}
    </div>
  )
}

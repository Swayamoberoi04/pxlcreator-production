import Link                                         from "next/link"
import { Container }                                from "@/components/layout/Container"
import { CinematicBackground }                      from "@/components/ui/CinematicBackground"
import { GrainOverlay }                             from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ─────────────────────────────────────────────────────────────────────────
   WHY PXL CREATOR — 5 editorial beats
   All content is centre-aligned.
   Visual chapter-break divider sits between beat 04 and beat 05.
───────────────────────────────────────────────────────────────────────── */
export function WhyPXLSection() {
  return (
    <section className="relative w-full bg-background" aria-label="Why PXL Creator">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          BEAT 01 — THE BROKEN SYSTEM
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden border-b border-border bg-surface">

        {/* Subtle red tension atmosphere */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-[0.05] blur-3xl"
          style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.8) 0%, transparent 70%)" }}
        />
        <GrainOverlay opacity={0.020} animated zIndex={1} />

        <Container className="relative z-10 py-28 sm:py-40">
          <div className="flex flex-col items-center text-center gap-14">

            {/* Beat counter */}
            <CinematicReveal variant="rise">
              <BeatCounter number="01" label="The Broken System" />
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.08} className="max-w-2xl mx-auto">
              <div className="flex flex-col gap-5 items-center text-center">
                <h2 className="font-display font-bold text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-tight text-foreground">
                  The creator economy{" "}
                  <span className="text-gold-gradient">is exploding.</span>
                </h2>
                <p className="text-[1.125rem] text-muted/92 leading-relaxed">
                  But most creators are quietly drowning inside it.
                  Technically they have more tools than ever.
                  Emotionally? They&apos;ve never felt more lost.
                </p>
              </div>
            </CinematicReveal>

            {/* Pain mosaic */}
            <CinematicStagger stagger={0.055} baseDelay={0.12} itemVariant="rise" className="flex flex-wrap justify-center gap-2.5 max-w-3xl">
              {PAIN_POINTS.map(({ label, weight }) => (
                <CinematicItem key={label} variant="rise">
                  <div
                    className="rounded-full border px-4 py-2"
                    style={{
                      borderColor:     `rgba(239,68,68,${weight * 0.25})`,
                      backgroundColor: `rgba(239,68,68,${weight * 0.06})`,
                      fontSize:        `${0.7 + weight * 0.12}rem`,
                      opacity:         0.4 + weight * 0.4,
                      color:           weight > 0.7 ? "#fca5a5" : "#aaaaaa",
                    }}
                  >
                    {label}
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

            <CinematicReveal variant="rise" delay={0.15} className="w-full max-w-2xl">
              <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <span className="font-display font-bold text-[2rem] text-muted/70 shrink-0 select-none">8×</span>
                <p className="text-[0.9375rem] text-muted/92 leading-relaxed text-left">
                  Eight distinct pain points. One root cause:{" "}
                  <span className="text-foreground font-semibold">
                    creators have access to tools, but not to taste, identity, or systems.
                  </span>
                </p>
              </div>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          BEAT 02 — THE GAP
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden border-b border-border bg-background">

        <Container className="relative z-10 py-28 sm:py-40">
          <div className="flex flex-col items-center text-center gap-14">

            <CinematicReveal variant="rise">
              <BeatCounter number="02" label="The Gap Nobody Filled" />
            </CinematicReveal>

            {/* Two-column gap visual */}
            <CinematicReveal variant="rise" delay={0.1} className="w-full max-w-4xl mx-auto">
              <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 sm:gap-0 items-stretch text-left">

                {/* Left — technical side */}
                <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col gap-4">
                  <span className="text-label text-muted/70 tracking-widest">What exists</span>
                  <h3 className="font-display font-bold text-[1.25rem] text-muted/85 leading-snug">
                    Technically powerful tools.
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {WHAT_EXISTS.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-[0.875rem] text-muted/70">
                        <span className="h-px w-3 bg-muted/25 shrink-0" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Centre — gap indicator */}
                <div className="hidden sm:flex flex-col items-center justify-center px-4 gap-2">
                  <div className="h-full w-px bg-border" aria-hidden="true" />
                  <span className="font-display font-bold text-[0.65rem] tracking-[0.2em] text-muted/70 uppercase rotate-90 whitespace-nowrap">
                    no bridge
                  </span>
                  <div className="h-full w-px bg-border" aria-hidden="true" />
                </div>

                {/* Right — identity side */}
                <div className="relative rounded-2xl border border-gold/20 bg-gold/[0.04] p-6 sm:p-8 flex flex-col gap-4 overflow-hidden">
                  <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                  <span className="text-label text-gold/60 tracking-widest">What&apos;s missing</span>
                  <h3 className="font-display font-bold text-[1.25rem] text-foreground leading-snug">
                    Systems for taste, style,<br />identity, and confidence.
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {WHAT_MISSING.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-[0.875rem] text-foreground/92">
                        <span className="h-1 w-1 rounded-full bg-gold/70 shrink-0" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </CinematicReveal>

            {/* Bridge statement */}
            <CinematicReveal variant="rise" delay={0.15}>
              <div className="flex items-center gap-3">
                <span className="h-px w-12 bg-gold/40" aria-hidden="true" />
                <span className="font-display font-bold text-[1.375rem] sm:text-[1.75rem] text-foreground text-center">
                  That space?{" "}
                  <span className="text-gold-gradient">That&apos;s where PXL Creator lives.</span>
                </span>
                <span className="h-px w-12 bg-gold/40" aria-hidden="true" />
              </div>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          BEAT 03 — WHY WE EXIST
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden border-b border-border bg-surface depth-section">

        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.018} animated zIndex={1} />

        <Container className="relative z-10 py-28 sm:py-40">
          <div className="flex flex-col items-center text-center gap-14">

            <CinematicReveal variant="rise">
              <BeatCounter number="03" label="Why We Exist" />
            </CinematicReveal>

            {/* Mission quote */}
            <CinematicReveal variant="depth" delay={0.08} className="max-w-3xl mx-auto">
              <div className="flex flex-col gap-5 items-center">
                <p className="text-[0.75rem] font-bold tracking-[0.25em] uppercase text-gold/60">Mission</p>
                <blockquote className="font-display font-bold text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] tracking-tight text-foreground text-center">
                  Empower creators to build visually powerful identities — through cinematic editing,{" "}
                  <span className="text-gold-gradient">creative systems, education, and technology.</span>
                </blockquote>
              </div>
            </CinematicReveal>

            {/* Not everyone has / but everyone has */}
            <CinematicStagger stagger={0.12} baseDelay={0.1} itemVariant="depth" className="grid sm:grid-cols-2 gap-4 max-w-2xl w-full text-left">
              <CinematicItem variant="depth">
                <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-6 flex flex-col gap-4">
                  <span className="text-label text-muted/70 tracking-widest">Not everyone has</span>
                  <ul className="flex flex-col gap-2">
                    {NOT_EVERYONE.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-[0.875rem] text-muted/85">
                        <span className="text-muted/70 text-lg leading-none">×</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CinematicItem>
              <CinematicItem variant="depth">
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-6 flex flex-col gap-4">
                  <span className="text-label text-gold/60 tracking-widest">But everyone has</span>
                  <ul className="flex flex-col gap-2">
                    {EVERYONE_HAS.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-[0.875rem] text-foreground/92">
                        <span className="text-gold text-base leading-none">✦</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CinematicItem>
            </CinematicStagger>

            {/* Philosophy quote */}
            <CinematicReveal variant="rise" delay={0.12} className="max-w-xl mx-auto">
              <div className="border-l-2 border-gold/40 pl-6 text-left">
                <p className="text-[1rem] sm:text-[1rem] text-muted/92 leading-relaxed italic">
                  &ldquo;The future belongs to creators who think visually, build identity,
                  understand aesthetics, and create work that moves people.
                  PXL Creator exists to make that future accessible to everyone.&rdquo;
                </p>
              </div>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          BEAT 04 — THE FIVE MOATS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden border-b border-border bg-background">

        <Container className="relative z-10 py-28 sm:py-40">
          <div className="flex flex-col items-center text-center gap-14">

            <CinematicReveal variant="rise" className="w-full">
              <div className="flex flex-col items-center gap-4">
                <BeatCounter number="04" label="The PXL Moats" />
                <p className="font-display font-bold text-foreground text-[1.125rem]">Why this brand compounds.</p>
                <p className="text-[0.875rem] text-muted/85 max-w-xs leading-relaxed">
                  Five structural advantages that make PXL Creator impossible to simply replicate.
                </p>
              </div>
            </CinematicReveal>

            {/* Moat cards */}
            <CinematicStagger stagger={0.09} baseDelay={0.08} itemVariant="depth" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {MOATS.map((moat, i) => (
                <CinematicItem key={moat.title} variant="depth">
                  <div
                    className={`relative rounded-2xl border bg-surface p-6 flex flex-col gap-4 overflow-hidden h-full text-left depth-card
                      ${i === 4 ? "sm:col-span-2 lg:col-span-1" : ""}
                      ${moat.featured ? "border-gold/25 bg-gold/[0.04]" : "border-border"}`}
                  >
                    {moat.featured && (
                      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-display font-bold text-[2.5rem] leading-none select-none" style={{ color: `rgba(255,214,10,${0.08 + i * 0.04})` }}>
                        0{i + 1}
                      </span>
                      <span
                        className="text-[0.65rem] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full border mt-1"
                        style={{
                          borderColor: moat.featured ? "rgba(255,214,10,0.3)" : "rgba(255,255,255,0.08)",
                          color:       moat.featured ? "#FFD60A" : "#666",
                        }}
                      >
                        {moat.tag}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className={`font-display font-bold text-[1rem] leading-snug ${moat.featured ? "text-foreground" : "text-foreground/90"}`}>
                        {moat.title}
                      </h3>
                      <p className="text-[0.875rem] text-muted/85 leading-relaxed">{moat.body}</p>
                    </div>
                    {moat.featured && (
                      <p className="text-[0.8125rem] text-gold/70 font-semibold mt-auto">
                        AI automates the edit. It cannot replicate taste. →
                      </p>
                    )}
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

          </div>
        </Container>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          CHAPTER BREAK — dramatic visual separator
          between beat 04 and the closing beat 05
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden bg-background" style={{ height: "1px" }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      <div className="relative w-full overflow-hidden bg-background">
        {/* Full-width cinematic separator */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,214,10,0.06) 0%, transparent 70%)",
          }}
        />

        <Container className="relative z-10 py-16 sm:py-20">
          <CinematicReveal variant="rise">
            <div className="flex flex-col items-center gap-5">
              {/* Large decorative number */}
              <div
                className="font-display font-bold select-none leading-none text-center"
                style={{
                  fontSize:   "clamp(6rem, 20vw, 14rem)",
                  background: "linear-gradient(180deg, rgba(255,214,10,0.22) 0%, rgba(255,214,10,0.04) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.04em",
                }}
              >
                05
              </div>
              {/* Thin rule + label */}
              <div className="flex items-center gap-4 w-full max-w-sm">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/30" />
                <span className="text-label text-gold/50 tracking-[0.25em] whitespace-nowrap">The Vision</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/30" />
              </div>
            </div>
          </CinematicReveal>
        </Container>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          BEAT 05 — THE VISION
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden bg-surface depth-section">

        <CinematicBackground variant="dark" />
        <GrainOverlay opacity={0.022} animated zIndex={1} />

        {/* Rising gold haze from below */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "radial-gradient(ellipse 80% 55% at 50% 110%, rgba(255,214,10,0.07) 0%, transparent 65%)" }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent z-[2]" />

        <Container className="relative z-[10] py-28 sm:py-44">
          <div className="flex flex-col items-center text-center gap-12 max-w-3xl mx-auto">

            {/* Vision headline */}
            <CinematicReveal variant="depth">
              <div className="flex flex-col gap-4 items-center">
                <p className="text-[0.75rem] font-bold tracking-[0.25em] uppercase text-muted/70">
                  Where we&apos;re going
                </p>
                <h2
                  className="font-display font-bold text-[clamp(1.875rem,5.5vw,3.5rem)] leading-[1.05] tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #FFD60A 50%, #E0A800 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Not a preset store.<br />
                  A creative operating<br />
                  system for your generation.
                </h2>
              </div>
            </CinematicReveal>

            {/* Vision body */}
            <CinematicReveal variant="rise" delay={0.12}>
              <p className="text-[1rem] sm:text-[1rem] text-muted/85 leading-relaxed max-w-2xl">
                In a world flooded with generic content, AI-generated sameness, and disposable trends —
                PXL Creator stands for{" "}
                <span className="text-foreground/92 font-medium">intentional creativity</span>,{" "}
                <span className="text-foreground/92 font-medium">cinematic storytelling</span>, and{" "}
                <span className="text-foreground/92 font-medium">visually intelligent expression</span>.
              </p>
            </CinematicReveal>

            {/* Vision pillars */}
            <CinematicStagger stagger={0.08} baseDelay={0.1} itemVariant="rise" className="flex flex-wrap justify-center gap-3">
              {VISION_PILLARS.map((p) => (
                <CinematicItem key={p} variant="rise">
                  <div className="rounded-full border border-gold/15 bg-gold/[0.06] px-5 py-2 text-[0.8125rem] font-semibold text-gold/80 hover:border-gold/30 hover:bg-gold/[0.10] transition-colors">
                    {p}
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

            {/* CTA pair */}
            <CinematicReveal variant="rise" delay={0.15}>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                <Link
                  href="/presets"
                  className="inline-flex items-center gap-2.5 rounded-full bg-gold px-8 py-3.5 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] shadow-[0_0_40px_rgba(255,214,10,0.2)] hover:shadow-[0_0_56px_rgba(255,214,10,0.32)]"
                >
                  Start Building Your Identity
                  <ArrowRight />
                </Link>
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2.5 rounded-full border border-border px-8 py-3.5 text-[0.9375rem] font-medium text-muted transition-all hover:border-gold/40 hover:text-foreground"
                >
                  Try AI Studio
                </Link>
              </div>
            </CinematicReveal>

          </div>
        </Container>

        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent z-[2]" />
      </div>

    </section>
  )
}

/* ─────────────────────────────────────────
   Beat counter — shared visual component
   Shows "01", "02" etc. with a section label
───────────────────────────────────────────── */
function BeatCounter({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Large visible number */}
      <span
        className="font-display font-bold leading-none select-none"
        style={{
          fontSize:   "clamp(3.5rem, 8vw, 6rem)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.03em",
        }}
      >
        {number}
      </span>
      {/* Label */}
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-gold/30" aria-hidden="true" />
        <span className="text-label text-muted/85 tracking-[0.2em]">{label}</span>
        <span className="h-px w-8 bg-gold/30" aria-hidden="true" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const PAIN_POINTS: { label: string; weight: number }[] = [
  { label: "Creative Overwhelm",        weight: 1.0  },
  { label: "Aesthetic Inconsistency",   weight: 0.95 },
  { label: "Algorithm Pressure",        weight: 0.85 },
  { label: "Burnout",                   weight: 0.90 },
  { label: "Lack of Creative Identity", weight: 1.0  },
  { label: "Generic Editing Tools",     weight: 0.70 },
  { label: "Low-Quality Education",     weight: 0.75 },
  { label: "AI Commoditization",        weight: 0.65 },
]

const WHAT_EXISTS = [
  "Powerful AI editing apps",
  "Thousands of free presets",
  "Endless tutorial content",
  "Fast social media tools",
]

const WHAT_MISSING = [
  "A personal visual signature",
  "Structured taste development",
  "Cinematic identity systems",
  "A creative ecosystem to grow in",
]

const NOT_EVERYONE = [
  "Expensive camera equipment",
  "Studio setups",
  "Formal art education",
  "A production team",
]

const EVERYONE_HAS = [
  "A smartphone",
  "Raw creativity",
  "Real ambition",
  "Something worth saying",
]

const MOATS = [
  {
    title:    "Brand Identity Moat",
    tag:      "Emotional",
    body:     "Strong emotional branding creates loyalty beyond utility. You don't buy PXL. You become part of a creative philosophy.",
    featured: false,
  },
  {
    title:    "Community Moat",
    tag:      "Social",
    body:     "Creators stay for belonging, feedback, recognition, and culture — not just product downloads.",
    featured: false,
  },
  {
    title:    "Education Moat",
    tag:      "Trust",
    body:     "Structured creator learning compounds trust over time. Every lesson deepens the relationship with the brand.",
    featured: false,
  },
  {
    title:    "Ecosystem Moat",
    tag:      "Retention",
    body:     "Multiple interconnected products — presets, AI tools, courses, memberships — create compounding value and sticky retention.",
    featured: false,
  },
  {
    title:    "AI + Human Taste Moat",
    tag:      "Irreplaceable",
    body:     "AI can automate the edit. It cannot replicate curated taste, aesthetic direction, or emotional storytelling.",
    featured: true,
  },
] as const

const VISION_PILLARS = [
  "Cinematic Identity",
  "Creative Ecosystem",
  "Aesthetic Education",
  "Modern Visual Culture",
]

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}



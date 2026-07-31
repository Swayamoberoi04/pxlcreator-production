/**
 * src/components/store/AnimatedMockCard.tsx
 *
 * Client Component — the AI Studio "before/after" demo card.
 * Uses real before/after images (fr_before / fr_after) to show
 * credible visual proof of the AI-powered preset recommendation.
 */
"use client"

import Image from "next/image"

export function AnimatedMockCard() {
  return (
    <div className="relative">

      {/* ── Outer glow behind card ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:  "radial-gradient(ellipse at 50% 50%, rgba(255,214,10,0.10) 0%, rgba(61,122,138,0.08) 50%, transparent 75%)",
          animation:   "glow-pulse 4s ease-in-out infinite",
          "--pulse-min": "0.6",
          "--pulse-max": "1.0",
          transform:   "scale(1.08)",
          willChange:  "opacity, transform",
        } as React.CSSProperties}
      />

      {/* ── Glowing animated border ring ── */}
      <div
        aria-hidden="true"
        className="absolute -inset-[1px] rounded-2xl pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255,214,10,0.4) 20%, rgba(61,122,138,0.4) 40%, transparent 60%)",
            animation:  "spin-slow 6s linear infinite",
            opacity:    0.6,
          }}
        />
        {/* Inner mask to show only the border */}
        <div className="absolute inset-[1px] rounded-2xl bg-background" />
      </div>

      {/* ── Card ── */}
      <div className="relative rounded-2xl border border-border bg-background/90 backdrop-blur-md overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.65)]" style={{ zIndex: 1 }}>

        {/* Beam scan — sweeps across the entire card */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 20 }}
        >
          <div
            className="absolute inset-y-0 anim-beam"
            style={{
              left:       "-20%",
              width:      "40%",
              background: "linear-gradient(90deg, transparent 0%, rgba(61,122,138,0.08) 40%, rgba(255,214,10,0.06) 60%, transparent 100%)",
              animation:  "beam-scan 5s ease-in-out infinite",
              animationDelay: "0.8s",
              willChange: "transform",
            }}
          />
        </div>

        {/* ── BEFORE panel ── */}
        <div className="relative h-44 overflow-hidden bg-[#1a1815]">
          <Image
            src="/assets/fr_before.webp"
            alt="Before — Film Rich preset"
            fill
            sizes="420px"
            className="object-cover object-center opacity-90"
          />
          {/* Desaturated overlay for "unedited" feel */}
          <div className="absolute inset-0 bg-[#0a0e14]/30 mix-blend-multiply" />
          {/* Label */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1 z-10">
            <span className="text-[0.7rem] font-semibold text-white/85 tracking-widest uppercase">Before</span>
          </div>
        </div>

        {/* ── Divider with AI badge ── */}
        <div className="relative h-8 flex items-center justify-between px-4 bg-surface border-y border-border overflow-hidden">
          {/* Subtle scan line on divider */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 pointer-events-none anim-beam"
            style={{
              left:       "-30%",
              width:      "60%",
              background: "linear-gradient(90deg, transparent 0%, rgba(61,122,138,0.15) 50%, transparent 100%)",
              animation:  "beam-scan 3s ease-in-out infinite",
              animationDelay: "1.5s",
              willChange: "transform",
            }}
          />
          <div className="flex items-center gap-1.5 relative z-10">
            <span
              className="h-1 w-1 rounded-full bg-[#a5b4fc]"
              style={{ animation: "glow-pulse 1.5s ease-in-out infinite", "--pulse-min": "0.5", "--pulse-max": "1" } as React.CSSProperties}
            />
            <span className="text-[0.7rem] font-semibold text-[#a5b4fc] tracking-widest uppercase">AI Processing</span>
          </div>
          {/* Animated waveform bars */}
          <div className="flex items-center gap-1 relative z-10">
            {[0.4, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8].map((h, i) => (
              <div
                key={i}
                className="w-0.5 bg-[#6366f1] rounded-full"
                style={{
                  height:         `${h * 16}px`,
                  opacity:        0.6 + h * 0.4,
                  animation:      `glow-pulse ${0.8 + i * 0.12}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.08}s`,
                  "--pulse-min":  "0.3",
                  "--pulse-max":  "1.0",
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        {/* ── AFTER panel ── */}
        <div className="relative h-44 overflow-hidden bg-[#1a100a]">
          <Image
            src="/assets/fr_after.webp"
            alt="After — Film Rich preset applied"
            fill
            sizes="420px"
            className="object-cover object-center"
          />
          {/* Cinematic warmth overlay — lifts the graded feel */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 70% 55% at 30% 35%, rgba(255,165,30,0.18) 0%, transparent 65%)",
              animation:  "glow-pulse 3.5s ease-in-out infinite",
              "--pulse-min": "0.7",
              "--pulse-max": "1.0",
              willChange: "opacity",
            } as React.CSSProperties}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.50) 100%)" }}
          />

          {/* Label */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-gold/20 backdrop-blur-sm border border-gold/30 px-2.5 py-1 z-10">
            <span
              className="h-1 w-1 rounded-full bg-gold"
              style={{ animation: "glow-pulse 1.8s ease-in-out infinite", "--pulse-min": "0.5", "--pulse-max": "1" } as React.CSSProperties}
            />
            <span className="text-[0.7rem] font-semibold text-gold tracking-widest uppercase">After</span>
          </div>

          {/* Floating analysis chip */}
          <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 px-3 py-2 flex items-center justify-between gap-3 z-10">
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.7rem] font-bold text-gold tracking-wide">Film Rich Pack</span>
              <span className="text-[0.65rem] text-white/85">Warm analog cinematic grade</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 rounded-full bg-gold/15 border border-gold/25 px-2 py-0.5">
              <span className="text-[0.65rem] font-bold text-gold">97%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Floating stat chips */}
      <div className="absolute -top-3 -right-3 rounded-full bg-surface border border-border px-3 py-1.5 flex items-center gap-1.5 shadow-lg" style={{ zIndex: 2 }}>
        <span
          className="text-gold text-[0.75rem]"
          style={{ animation: "glow-pulse 2.5s ease-in-out infinite", "--pulse-min": "0.6", "--pulse-max": "1.0" } as React.CSSProperties}
        >
          ✦
        </span>
        <span className="text-[0.75rem] font-semibold text-foreground/92">GPT-4o Vision</span>
      </div>
      <div className="absolute -bottom-3 -left-3 rounded-full bg-surface border border-border px-3 py-1.5 flex items-center gap-1.5 shadow-lg" style={{ zIndex: 2 }}>
        <span className="text-[0.75rem] font-semibold text-foreground/92">~8s</span>
        <span className="text-muted/85 text-[0.75rem]">avg. processing</span>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  )
}


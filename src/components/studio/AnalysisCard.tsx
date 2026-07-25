"use client"

/**
 * AnalysisCard.tsx
 *
 * Premium AI vision report displayed after processing.
 * Renders all data from ImageAnalysisResult in an Adobe-quality UI.
 *
 * Every value shown is from REAL data:
 *   - StyleProfile metadata   → scene, lighting, colors, mood
 *   - Sharp adjustments       → grade bars (actual values applied)
 *   - Image metadata          → composition, quality
 *   - User prompt + keywords  → confidence score
 *
 * No AI output is fabricated. This is the style profile reporting its own
 * applied grade in a clear, beautiful, technically precise format.
 */

import { motion } from "framer-motion"
import { cn }     from "@/lib/utils"
import type { ImageAnalysisResult } from "@/types/ai"

interface AnalysisCardProps {
  imageAnalysis: ImageAnalysisResult
  profileName:   string
  colorPalette:  string[]
}

const EASE = [0.22, 1, 0.36, 1] as const

export function AnalysisCard({
  imageAnalysis,
  profileName,
  colorPalette,
}: AnalysisCardProps) {
  const { scene, lighting, colors, mood, composition, quality, adjustments, confidence, processingMs } = imageAnalysis
  const confidencePct = Math.round(confidence * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="rounded-2xl border border-border bg-surface overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/60 bg-gradient-to-r from-surface to-surface-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1]/20 to-gold/15 border border-[#6366f1]/20 shrink-0">
            <span className="font-display text-[1.05rem] leading-none text-gold/90">{profileName.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] font-bold tracking-widest uppercase text-muted/70">Vision Report</span>
              <span className="text-muted/70" aria-hidden>·</span>
              <span className="text-[0.7rem] font-semibold tracking-wider text-[#a5b4fc]/70">{profileName}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[0.8125rem] font-medium text-foreground/92">
                {mood.adjectives.slice(0, 2).map((a) => capitalise(a)).join(" · ")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end">
            <span className="font-display font-black text-gold text-[1.1rem] leading-none tabular-nums">
              {confidencePct}%
            </span>
            <span className="text-[0.65rem] text-muted/70 tracking-widest uppercase">Match</span>
          </div>
          <ConfidenceRing pct={confidencePct} />
        </div>
      </div>

      {/* ── Vision grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border/50">
        <VisionCell
          icon={<SceneIcon />}
          label="Scene"
          primary={formatSceneType(scene.type)}
          secondary={formatTimeOfDay(scene.timeOfDay)}
          accent="#a5b4fc"
        />
        <VisionCell
          icon={<LightIcon />}
          label="Lighting"
          primary={formatLightingQuality(lighting.quality)}
          secondary={`${lighting.kelvin.toLocaleString()}K · ${capitalise(lighting.colorTemperature)}`}
          accent="#fbbf24"
        />
        <VisionCell
          icon={<PaletteIcon />}
          label="Color Grade"
          primary={colors.grade}
          secondary={capitalise(colors.saturationLevel)}
          accent="#34d399"
          palette={colorPalette.slice(0, 3)}
        />
        <VisionCell
          icon={<MoodIcon />}
          label="Mood"
          primary={capitalise(mood.primary)}
          secondary={capitalise(mood.energy) + " energy"}
          accent="#f472b6"
          tags={mood.adjectives.slice(0, 3)}
        />
      </div>

      {/* ── Color palette ── */}
      <div className="px-5 py-4 border-t border-border/60">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[0.7rem] font-bold tracking-widest uppercase text-muted/70">Dominant Palette</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {colorPalette.map((hex, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <div
                className="w-6 h-6 rounded-md border border-white/10 shadow-sm ring-1 ring-inset ring-white/5 transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            </div>
          ))}
          <span className="ml-2 text-[0.75rem] text-muted/85">{colors.dominant.slice(0, 3).map(capitalise).join("  ·  ")}</span>
        </div>
      </div>

      {/* ── Grade applied — adjustment bars ── */}
      <div className="px-5 py-4 border-t border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[0.7rem] font-bold tracking-widest uppercase text-muted/70">Grade Applied</span>
          <span className="text-muted/70" aria-hidden>·</span>
          <span className="text-[0.7rem] text-muted/70">All values from Sharp pipeline</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <AdjBar label="Brightness"  value={adjustments.brightness}  base={1.0}  min={0.75} max={1.30} color="#fbbf24" />
          <AdjBar label="Contrast"    value={adjustments.contrast}    base={1.0}  min={0.80} max={1.45} color="#f472b6" />
          <AdjBar label="Saturation"  value={adjustments.saturation}  base={1.0}  min={0.50} max={1.60} color="#34d399" />
          <AdjBar label="Gamma"       value={adjustments.gamma}       base={1.0}  min={0.75} max={1.35} color="#a5b4fc" />
          {adjustments.hue !== 0 && (
            <HueRow hue={adjustments.hue} />
          )}
          {(Math.abs(adjustments.tintR) > 2 || Math.abs(adjustments.tintB) > 2) && (
            <TintRow tintR={adjustments.tintR} tintG={adjustments.tintG} tintB={adjustments.tintB} />
          )}
        </div>
      </div>

      {/* ── Quality + composition footer ── */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-border/60 bg-surface-2/50">
        <QualityBadge quality={quality} />
        <span className="text-muted/70" aria-hidden>·</span>
        <span className="text-[0.75rem] text-muted/85">
          {composition.orientation === "portrait" ? "Portrait" : composition.orientation === "square" ? "Square" : "Landscape"} · {composition.aspectRatio}
        </span>
        <span className="text-muted/70" aria-hidden>·</span>
        <span className="text-[0.75rem] text-muted/85">{(processingMs / 1000).toFixed(2)}s</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
          <span className="text-[0.7rem] text-muted/70 tracking-wider">Analysis complete</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

function VisionCell({
  icon, label, primary, secondary, accent, palette, tags,
}: {
  icon:      React.ReactNode
  label:     string
  primary:   string
  secondary: string
  accent:    string
  palette?:  string[]
  tags?:     string[]
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <div className="flex items-center gap-1.5">
        <span style={{ color: accent }} className="opacity-70">{icon}</span>
        <span className="text-[0.65rem] font-bold tracking-widest uppercase text-muted/70">{label}</span>
      </div>
      <p className="text-[0.875rem] font-semibold text-foreground leading-snug">{primary}</p>
      {palette ? (
        <div className="flex gap-1 mt-0.5">
          {palette.map((hex, i) => (
            <div key={i} className="h-2 w-5 rounded-sm" style={{ backgroundColor: hex }} />
          ))}
          <span className="text-[0.7rem] text-muted/70 ml-1">{secondary}</span>
        </div>
      ) : tags ? (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-2 border border-border px-1.5 py-0.5 text-[0.65rem] text-muted/85">
              {t}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-[0.75rem] text-muted/85">{secondary}</span>
      )}
    </div>
  )
}

function AdjBar({ label, value, base, min, max, color }: {
  label: string; value: number; base: number; min: number; max: number; color: string
}) {
  const range    = max - min
  const pos      = (value - min) / range            // 0–1 position
  const basePct  = (base  - min) / range * 100      // baseline position
  const valuePct = pos * 100
  const delta    = value - base
  const isUp     = delta > 0.01
  const isDown   = delta < -0.01
  const pctLabel = isUp
    ? `+${Math.round(delta * 100)}%`
    : isDown
    ? `${Math.round(delta * 100)}%`
    : "—"

  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.75rem] text-muted/85 w-20 shrink-0">{label}</span>
      <div className="relative h-1.5 flex-1 rounded-full bg-surface-2 overflow-hidden">
        {/* Track fill from baseline to value */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.abs(valuePct - basePct)}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className="absolute top-0 h-full rounded-full"
          style={{
            backgroundColor: color,
            opacity: 0.6,
            left: `${Math.min(valuePct, basePct)}%`,
          }}
        />
        {/* Baseline marker */}
        <div
          className="absolute top-0 h-full w-px bg-muted/30"
          style={{ left: `${basePct}%` }}
        />
        {/* Value marker */}
        <motion.div
          initial={{ left: `${basePct}%` }}
          animate={{ left: `${valuePct}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-surface shadow-sm"
          style={{ backgroundColor: color }}
        />
      </div>
      <span
        className={cn(
          "text-[0.72rem] w-10 text-right tabular-nums shrink-0",
          isUp   ? "text-emerald-400" :
          isDown ? "text-amber-400"   :
                   "text-muted/70"
        )}
      >
        {pctLabel}
      </span>
    </div>
  )
}

function HueRow({ hue }: { hue: number }) {
  const isPos = hue > 0
  return (
    <div className="flex items-center gap-3 col-span-full sm:col-span-1">
      <span className="text-[0.75rem] text-muted/85 w-20 shrink-0">Hue Shift</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ec4899, #ef4444)" }}
      />
      <span className={cn("text-[0.72rem] w-10 text-right tabular-nums shrink-0", isPos ? "text-emerald-400" : "text-amber-400")}>
        {isPos ? "+" : ""}{Math.round(hue)}°
      </span>
    </div>
  )
}

function TintRow({ tintR, tintG, tintB }: { tintR: number; tintG: number; tintB: number }) {
  const isWarm = tintR > tintB
  return (
    <div className="flex items-center gap-3 col-span-full sm:col-span-1">
      <span className="text-[0.75rem] text-muted/85 w-20 shrink-0">Colour Tint</span>
      <div className="flex gap-1 flex-1">
        <ChannelBar value={tintR} color="#ef4444" label="R" />
        <ChannelBar value={tintG} color="#22c55e" label="G" />
        <ChannelBar value={tintB} color="#3b82f6" label="B" />
      </div>
      <span className={cn("text-[0.72rem] w-10 text-right shrink-0", isWarm ? "text-amber-400" : "text-blue-400")}>
        {isWarm ? "Warm" : "Cool"}
      </span>
    </div>
  )
}

function ChannelBar({ value, color, label }: { value: number; color: string; label: string }) {
  const abs = Math.abs(value)
  const pct = Math.min((abs / 20) * 100, 100)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative h-4 w-3 rounded-sm overflow-hidden bg-surface-2">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
          className="absolute bottom-0 w-full rounded-sm"
          style={{ backgroundColor: color, opacity: value > 0 ? 0.7 : 0.4 }}
        />
      </div>
      <span className="text-[0.6rem] text-muted/70">{label}</span>
    </div>
  )
}

function ConfidenceRing({ pct }: { pct: number }) {
  const r         = 16
  const circ      = 2 * Math.PI * r
  const dash      = (pct / 100) * circ

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" className="text-surface-2" strokeWidth="3" />
      <motion.circle
        cx="22" cy="22" r={r}
        fill="none"
        stroke="#FFD60A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: EASE, delay: 0.3 }}
        transform="rotate(-90 22 22)"
      />
    </svg>
  )
}

function QualityBadge({ quality }: { quality: ImageAnalysisResult["quality"] }) {
  const pct = Math.round(quality.overall * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-surface overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.4 }}
          className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400"
        />
      </div>
      <span className="text-[0.72rem] text-muted/85 tabular-nums">{pct}%</span>
      <span className="text-[0.72rem] text-muted/70">
        {capitalise(quality.exposure)}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Format helpers
───────────────────────────────────────────────────────────── */

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatSceneType(t: string): string {
  const map: Record<string, string> = {
    landscape: "Landscape", portrait: "Portrait", street: "Street",
    architecture: "Architecture", macro: "Macro", wildlife: "Wildlife",
    travel: "Travel", product: "Product", abstract: "Abstract",
    interior: "Interior", event: "Event", night: "Night", unknown: "Unknown",
  }
  return map[t] ?? capitalise(t)
}

function formatTimeOfDay(t: string): string {
  const map: Record<string, string> = {
    "golden hour": "Golden Hour", "blue hour": "Blue Hour",
    midday: "Midday", overcast: "Overcast", night: "Night",
    sunrise: "Sunrise", sunset: "Sunset", dusk: "Dusk", unknown: "Unspecified",
  }
  return map[t] ?? capitalise(t)
}

function formatLightingQuality(q: string): string {
  const map: Record<string, string> = {
    "soft diffused": "Soft & Diffused", "harsh directional": "Harsh Directional",
    "warm directional": "Warm Directional", "cool diffused": "Cool Diffused",
    backlit: "Backlit", silhouette: "Silhouette", dramatic: "Dramatic",
    flat: "Flat", mixed: "Mixed", unknown: "Natural",
  }
  return map[q] ?? capitalise(q)
}

/* ── Icons ── */
function SceneIcon()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
function LightIcon()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> }
function PaletteIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg> }
function MoodIcon()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> }

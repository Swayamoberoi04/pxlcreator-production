"use client"

import { cn } from "@/lib/utils"
import type { AestheticChip } from "@/types/studio"

/* ─────────────────────────────────────────────────────────────
   Chip definitions
   Exported so StudioShell can resolve chip IDs → keyword arrays
   when building the FormData payload.
───────────────────────────────────────────────────────────── */
export const AESTHETIC_CHIPS: AestheticChip[] = [
  {
    id:       "golden-hour",
    label:    "Golden Hour",
    icon:     "☀",
    keywords: ["warm", "golden", "amber", "sunset", "sun"],
  },
  {
    id:       "cinematic",
    label:    "Cinematic",
    icon:     "◈",
    keywords: ["cinematic", "dramatic", "contrast", "rich", "dark"],
  },
  {
    id:       "film-grain",
    label:    "Film Vintage",
    icon:     "⬡",
    keywords: ["grain", "vintage", "faded", "analogue", "film"],
  },
  {
    id:       "cool-edit",
    label:    "Cool & Clean",
    icon:     "◇",
    keywords: ["cool", "teal", "minimal", "airy", "blue", "crisp"],
  },
  {
    id:       "moody",
    label:    "Moody Dark",
    icon:     "â—",
    keywords: ["moody", "dark", "shadows", "noir", "atmospheric"],
  },
  {
    id:       "portrait",
    label:    "Portrait Glow",
    icon:     "◯",
    keywords: ["portrait", "skin", "soft", "warm", "glow", "faces"],
  },
  {
    id:       "vibrant",
    label:    "Vibrant",
    icon:     "✦",
    keywords: ["vibrant", "saturated", "punchy", "vivid", "bold"],
  },
]

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
interface AestheticChipsProps {
  selected:  string[]                 // array of chip IDs
  onToggle:  (id: string) => void
  /** Overrides the default chip set — admin-managed via /admin/ai-studio. */
  chips?:    AestheticChip[]
}

export function AestheticChips({ selected, onToggle, chips = AESTHETIC_CHIPS }: AestheticChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-muted/85 tracking-widest">Quick vibes</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isActive = selected.includes(chip.id)
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onToggle(chip.id)}
              aria-pressed={isActive}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium",
                "border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-gold/50 bg-gold/12 text-gold shadow-[0_0_12px_rgba(255,214,10,0.12)]"
                  : "border-border bg-background text-muted hover:border-border/80 hover:text-foreground"
              )}
            >
              <span aria-hidden="true" className="text-[0.75rem] leading-none">
                {chip.icon}
              </span>
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}


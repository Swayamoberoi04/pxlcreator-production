"use client"

/**
 * src/components/admin/ui/ResponsivePreview.tsx
 *
 * Generic live-site preview: an iframe with mobile/tablet/desktop width
 * presets. Any module can drop this in pointed at the relevant public URL
 * — used by Homepage CMS to preview the live homepage while editing.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"

interface ResponsivePreviewProps {
  url: string
  className?: string
}

const PRESETS = [
  { key: "mobile", label: "Mobile", width: 375 },
  { key: "tablet", label: "Tablet", width: 768 },
  { key: "desktop", label: "Desktop", width: "100%" as const },
] as const

export function ResponsivePreview({ url, className }: ResponsivePreviewProps) {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["key"]>("desktop")
  const active = PRESETS.find((p) => p.key === preset)!

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-1 self-center rounded-lg border border-white/10 p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={cn(
              "rounded px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
              preset === p.key ? "bg-gold/15 text-gold" : "text-white/45 hover:text-white/75"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex justify-center rounded-xl border border-white/10 bg-black/40 p-3 overflow-auto max-h-[70vh]">
        <iframe
          src={url}
          title="Live preview"
          style={{ width: active.width, height: "70vh" }}
          className="rounded-lg border border-white/10 bg-white shrink-0"
        />
      </div>
    </div>
  )
}

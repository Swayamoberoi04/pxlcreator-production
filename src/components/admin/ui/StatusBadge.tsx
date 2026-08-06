"use client"

import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "neutral" | "danger" | "info" | "gold"

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  neutral: "bg-white/[0.06] text-white/60 border-white/10",
  danger:  "bg-red-500/10 text-red-400 border-red-500/25",
  info:    "bg-sky-500/10 text-sky-400 border-sky-500/25",
  gold:    "bg-gold/10 text-gold border-gold/25",
}

interface StatusBadgeProps {
  label: string
  tone?: StatusTone
  className?: string
}

/** Small pill used across every admin table/detail page for status flags. */
export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide",
        TONE_CLASSES[tone],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      {label}
    </span>
  )
}

/** Convenience mapper: published/draft/archived → the right tone + label. */
export function PublishStatusBadge({ isPublished, isArchived }: { isPublished?: boolean; isArchived?: boolean }) {
  if (isArchived) return <StatusBadge label="Archived" tone="neutral" />
  if (isPublished) return <StatusBadge label="Published" tone="success" />
  return <StatusBadge label="Draft" tone="warning" />
}

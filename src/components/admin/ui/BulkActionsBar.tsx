"use client"

import { cn } from "@/lib/utils"

export interface BulkAction {
  key: string
  label: string
  tone?: "default" | "danger"
  icon?: React.ReactNode
}

interface BulkActionsBarProps {
  selectedCount: number
  actions: BulkAction[]
  onAction: (key: string) => void
  onClearSelection: () => void
}

/** Sticky bar that appears once rows are selected in an AdminDataTable. */
export function BulkActionsBar({ selectedCount, actions, onAction, onClearSelection }: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-xl border border-gold/25 bg-[#151310] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3">
        <span className="text-[0.8125rem] font-semibold text-gold">{selectedCount} selected</span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-[0.75rem] text-white/40 hover:text-white/70 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => onAction(a.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
              a.tone === "danger"
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-white/[0.05] text-white/75 hover:bg-white/[0.1]"
            )}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

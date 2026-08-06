"use client"

import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterBarProps {
  /** Named filter groups, e.g. { status: [...], category: [...] } */
  groups: { key: string; label: string; options: FilterOption[] }[]
  active: Record<string, string>
  onChange: (key: string, value: string) => void
  onClearAll?: () => void
  className?: string
}

/** Generic pill-style filter bar used by every admin list page. */
export function FilterBar({ groups, active, onChange, onClearAll, className }: FilterBarProps) {
  const hasActive = Object.values(active).some((v) => v && v !== "all")

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {groups.map((group) => (
        <div key={group.key} className="flex items-center gap-1.5">
          <span className="text-[0.6875rem] text-white/35 uppercase tracking-wide mr-0.5">{group.label}</span>
          {group.options.map((opt) => {
            const isActive = (active[group.key] ?? "all") === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(group.key, opt.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-all",
                  isActive
                    ? "bg-gold/10 text-gold border-gold/30"
                    : "bg-white/[0.03] text-white/55 border-white/10 hover:text-white/85 hover:border-white/20"
                )}
              >
                {opt.label}
                {opt.count !== undefined && (
                  <span className="text-[0.65rem] opacity-60">{opt.count}</span>
                )}
              </button>
            )
          })}
        </div>
      ))}
      {hasActive && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[0.75rem] text-white/40 hover:text-white/70 transition-colors ml-1"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

/** The one toggle every admin form/table should use — replaces the hand-rolled div-toggles duplicated per page. */
export function ToggleSwitch({
  checked, onChange, label, description, disabled, loading, className,
}: ToggleSwitchProps) {
  const body = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
        checked ? "bg-gold" : "bg-white/10",
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-[1.125rem] w-[1.125rem] transform rounded-full bg-background shadow transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-1"
        )}
      />
    </button>
  )

  if (!label && !description) return body

  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
      <span className="flex flex-col gap-0.5">
        {label && <span className="text-[0.8125rem] font-medium text-white/85">{label}</span>}
        {description && <span className="text-[0.75rem] text-white/45">{description}</span>}
      </span>
      {body}
    </label>
  )
}

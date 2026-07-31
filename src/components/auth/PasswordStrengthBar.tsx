"use client"

import { getPasswordStrength } from "@/lib/firebase/auth"
import { cn } from "@/lib/utils"

interface PasswordStrengthBarProps {
  password: string
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  if (!password) return null

  const { score, label, color, checks } = getPasswordStrength(password)

  return (
    <div className="flex flex-col gap-2.5 mt-1">

      {/* Bar segments */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < score ? color : "bg-surface-3"
            )}
          />
        ))}
      </div>

      {/* Label */}
      {label && (
        <p className={cn(
          "text-[0.75rem] font-medium transition-colors",
          score <= 2 ? "text-red-400"    :
          score === 3 ? "text-amber-400"  :
          score === 4 ? "text-emerald-400":
                        "text-gold"
        )}>
          {label}
        </p>
      )}

      {/* Requirement chips */}
      <div className="flex flex-wrap gap-1.5">
        {REQUIREMENTS.map(({ key, label: req }) => (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium transition-all duration-200",
              checks[key as keyof typeof checks]
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-surface-2 border border-border text-muted/85"
            )}
          >
            <span aria-hidden="true">
              {checks[key as keyof typeof checks] ? "✓" : "·"}
            </span>
            {req}
          </span>
        ))}
      </div>

    </div>
  )
}

const REQUIREMENTS = [
  { key: "length",    label: "8+ chars"   },
  { key: "uppercase", label: "Uppercase"  },
  { key: "lowercase", label: "Lowercase"  },
  { key: "number",    label: "Number"     },
  { key: "special",   label: "Symbol"     },
]

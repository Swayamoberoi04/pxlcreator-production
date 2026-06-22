"use client"

import { motion } from "framer-motion"
import { cn }     from "@/lib/utils"
import { GOALS, type GoalId } from "@/types/onboarding"

interface Props {
  selected: GoalId[]
  onToggle: (id: GoalId) => void
}

const ITEM_VARIANTS = {
  hidden:  { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: i * 0.04 },
  }),
}

export function StepGoals({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-[0.8125rem] text-muted/50">Choose up to 3 goals</p>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {GOALS.map((goal, i) => {
          const isSelected = selected.includes(goal.id)
          const isDisabled  = !isSelected && selected.length >= 3
          return (
            <motion.button
              key={goal.id}
              type="button"
              custom={i}
              initial="hidden"
              animate="visible"
              variants={ITEM_VARIANTS}
              onClick={() => !isDisabled && onToggle(goal.id)}
              whileHover={isDisabled ? {} : { x: 4 }}
              whileTap={isDisabled ? {} : { scale: 0.99 }}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-4 rounded-xl border px-5 py-4 text-left w-full",
                "transition-all duration-200 cursor-pointer focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isDisabled && "opacity-40 cursor-not-allowed",
                isSelected
                  ? "border-gold/50 bg-gold/8 shadow-[0_0_16px_rgba(255,214,10,0.1)]"
                  : "border-border bg-surface hover:border-border/70 hover:bg-surface-2"
              )}
            >
              {/* Icon */}
              <span className="text-[1.25rem] shrink-0">{goal.icon}</span>

              {/* Label */}
              <span className={cn(
                "text-[0.9375rem] font-medium flex-1",
                isSelected ? "text-foreground" : "text-muted"
              )}>
                {goal.label}
              </span>

              {/* Check */}
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                isSelected
                  ? "border-gold bg-gold"
                  : "border-border"
              )}>
                {isSelected && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    aria-hidden="true"
                  >
                    <polyline points="1.5,5 4,7.5 8.5,2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </motion.svg>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}


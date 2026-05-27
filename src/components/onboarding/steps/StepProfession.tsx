"use client"

import { motion } from "framer-motion"
import { cn }     from "@/lib/utils"
import { PROFESSIONS, type ProfessionId } from "@/types/onboarding"

interface Props {
  selected: ProfessionId[]
  onToggle: (id: ProfessionId) => void
}

const ITEM_VARIANTS = {
  hidden:  { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: i * 0.03 },
  }),
}

export function StepProfession({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-[0.8125rem] text-muted/50 mb-1">Select all that apply</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[400px] overflow-y-auto pr-1
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {PROFESSIONS.map((prof, i) => {
          const isSelected = selected.includes(prof.id)
          return (
            <motion.button
              key={prof.id}
              type="button"
              custom={i}
              initial="hidden"
              animate="visible"
              variants={ITEM_VARIANTS}
              onClick={() => onToggle(prof.id)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center",
                "transition-all duration-200 cursor-pointer focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-gold/60 bg-gold/8 shadow-[0_0_20px_rgba(255,215,0,0.12)]"
                  : "border-border bg-surface hover:border-border/80 hover:bg-surface-2"
              )}
            >
              {/* Icon */}
              <span
                className="text-[1.5rem] leading-none"
                style={{ color: isSelected ? prof.color : undefined }}
              >
                {prof.icon}
              </span>

              {/* Label */}
              <span className={cn(
                "text-[0.75rem] font-medium leading-tight",
                isSelected ? "text-foreground" : "text-muted"
              )}>
                {prof.label}
              </span>

              {/* Selection ring */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 h-4 w-4 rounded-full bg-gold flex items-center justify-center"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <polyline points="1.5,5 4,7.5 8.5,2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-[0.8125rem] text-gold/70"
        >
          {selected.length} selected
        </motion.p>
      )}
    </div>
  )
}

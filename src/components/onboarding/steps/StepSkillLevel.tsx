"use client"

import { motion } from "framer-motion"
import { cn }     from "@/lib/utils"
import { SKILL_LEVELS, type SkillLevelId } from "@/types/onboarding"

interface Props {
  selected: SkillLevelId | undefined
  onSelect: (id: SkillLevelId) => void
}

const ITEM_VARIANTS = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: i * 0.08 },
  }),
}

export function StepSkillLevel({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {SKILL_LEVELS.map((level, i) => {
        const isSelected = selected === level.id
        return (
          <motion.button
            key={level.id}
            type="button"
            custom={i}
            initial="hidden"
            animate="visible"
            variants={ITEM_VARIANTS}
            onClick={() => onSelect(level.id)}
            whileHover={{ x: 6 }}
            whileTap={{ scale: 0.99 }}
            className={cn(
              "flex items-center gap-5 rounded-2xl border p-5 text-left w-full",
              "transition-all duration-250 cursor-pointer focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-gold/60 bg-gold/8 shadow-[0_0_24px_rgba(255,214,10,0.12)]"
                : "border-border bg-surface hover:border-border/70 hover:bg-surface-2"
            )}
          >
            {/* Stars indicator */}
            <div className="flex gap-0.5 shrink-0">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors duration-200",
                    j < level.stars
                      ? isSelected ? "bg-gold" : "bg-muted/50"
                      : "bg-border"
                  )}
                />
              ))}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-display font-bold text-[1rem] leading-tight",
                isSelected ? "text-foreground" : "text-foreground/80"
              )}>
                {level.label}
              </p>
              <p className="text-[0.875rem] text-muted mt-0.5 leading-snug">
                {level.desc}
              </p>
            </div>

            {/* Radio dot */}
            <div className={cn(
              "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
              "transition-all duration-200",
              isSelected ? "border-gold" : "border-border"
            )}>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-2.5 w-2.5 rounded-full bg-gold"
                />
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}


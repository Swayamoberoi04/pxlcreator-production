"use client"

import { motion } from "framer-motion"
import { cn }     from "@/lib/utils"
import { PLATFORMS, type PlatformId } from "@/types/onboarding"

interface Props {
  selected: PlatformId[]
  onToggle: (id: PlatformId) => void
}

const ITEM_VARIANTS = {
  hidden:  { opacity: 0, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: i * 0.06 },
  }),
}

export function StepPlatforms({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-[0.8125rem] text-muted/85">Select all that apply</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PLATFORMS.map((platform, i) => {
          const isSelected = selected.includes(platform.id)
          return (
            <motion.button
              key={platform.id}
              type="button"
              custom={i}
              initial="hidden"
              animate="visible"
              variants={ITEM_VARIANTS}
              onClick={() => onToggle(platform.id)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border p-5",
                "transition-all duration-200 cursor-pointer focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-gold/60 bg-gold/8 shadow-[0_0_20px_rgba(255,214,10,0.12)]"
                  : "border-border bg-surface hover:border-border/70 hover:bg-surface-2"
              )}
            >
              <span className={cn(
                "text-[2rem] leading-none transition-colors duration-200",
                isSelected ? "opacity-100" : "opacity-60"
              )}>
                {platform.icon}
              </span>

              <div className="text-center">
                <p className={cn(
                  "font-medium text-[0.9375rem] leading-tight",
                  isSelected ? "text-foreground" : "text-muted/92"
                )}>
                  {platform.label}
                </p>
                <p className="text-[0.75rem] text-muted/85 mt-0.5">
                  {platform.desc}
                </p>
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-1 w-8 rounded-full bg-gold"
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}


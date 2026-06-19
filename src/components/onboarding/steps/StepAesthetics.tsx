"use client"

import { motion } from "framer-motion"
import { cn }     from "@/lib/utils"
import { AESTHETICS, type AestheticId } from "@/types/onboarding"

interface Props {
  selected: AestheticId[]
  onToggle: (id: AestheticId) => void
}

const ITEM_VARIANTS = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: i * 0.04 },
  }),
}

export function StepAesthetics({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-[0.8125rem] text-muted/50">Select up to 3 aesthetics</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {AESTHETICS.map((aes, i) => {
          const isSelected = selected.includes(aes.id)
          const isDisabled  = !isSelected && selected.length >= 3
          return (
            <motion.button
              key={aes.id}
              type="button"
              custom={i}
              initial="hidden"
              animate="visible"
              variants={ITEM_VARIANTS}
              onClick={() => !isDisabled && onToggle(aes.id)}
              whileHover={isDisabled ? {} : { scale: 1.04, y: -3 }}
              whileTap={isDisabled ? {} : { scale: 0.97 }}
              disabled={isDisabled}
              className={cn(
                "relative overflow-hidden rounded-xl border aspect-[4/3] focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                "transition-all duration-300",
                isDisabled && "opacity-35 cursor-not-allowed",
                isSelected
                  ? "border-gold/70 shadow-[0_0_24px_rgba(201,168,76,0.18)]"
                  : "border-border/60 hover:border-border"
              )}
            >
              {/* Gradient background simulating the aesthetic */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br",
                aes.gradient
              )} />

              {/* Noise overlay for texture */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
                }}
              />

              {/* Accent color swatch */}
              <div
                className="absolute bottom-0 inset-x-0 h-0.5"
                style={{ background: aes.accent }}
              />

              {/* Label */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <p className="text-[0.75rem] font-semibold text-white leading-tight text-left">
                  {aes.label}
                </p>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gold flex items-center justify-center"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <polyline points="1.5,5 4,7.5 8.5,2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              )}

              {/* Gold border glow on selected */}
              {isSelected && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-gold/40 ring-inset pointer-events-none" />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

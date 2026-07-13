"use client"

/**
 * OnboardingModal.tsx — v2
 *
 * Full-screen cinematic onboarding experience.
 * Orchestrates 5 steps + Style DNA reveal using Framer Motion.
 *
 * New in v2:
 *  - Live recommendation preview panel (updates as user selects)
 *  - Dual-column layout on desktop: steps (left) | preview (right)
 *  - Mobile: single column, preview below step content
 */

import { useCallback }             from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth }                 from "@/contexts/AuthContext"
import { useOnboardingStore }      from "@/store/onboarding"
import { StepProfession }          from "./steps/StepProfession"
import { StepGoals }               from "./steps/StepGoals"
import { StepAesthetics }          from "./steps/StepAesthetics"
import { StepSkillLevel }          from "./steps/StepSkillLevel"
import { StepPlatforms }           from "./steps/StepPlatforms"
import { StepComplete }            from "./steps/StepComplete"
import { LivePreviewPanel }        from "./LivePreviewPanel"
import type {
  ProfessionId, GoalId, AestheticId,
  SkillLevelId, PlatformId, OnboardingAnswers,
  PersonalizedSection, StyleDNA,
} from "@/types/onboarding"

/* ── Step metadata ────────────────────────────────────────── */
const STEPS = [
  { n: 1, headline: "What best describes you?",       sub: "Your profession shapes every recommendation we make." },
  { n: 2, headline: "What are you trying to achieve?", sub: "Your goals define your personalised learning path."   },
  { n: 3, headline: "What styles attract you most?",   sub: "Your aesthetic taste builds your Style DNA."         },
  { n: 4, headline: "How would you rate your skill?",  sub: "We match tutorials and tools to your level."         },
  { n: 5, headline: "Where do you create?",            sub: "Your platforms focus your preset recommendations."   },
  { n: 6, headline: "Your Style DNA is ready.",        sub: "We've built your personalised creative universe."    },
] as const

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ── Slide transition ─────────────────────────────────────── */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.45, ease: EASE } },
  exit:   (dir: number) => ({
    x:          dir > 0 ? "-60%" : "60%",
    opacity:    0,
    transition: { duration: 0.3, ease: EASE },
  }),
}

export function OnboardingModal() {
  const { user } = useAuth()
  const {
    isOpen, step, answers, dna, isSubmitting,
    close, next, back,
    setProfessions, setGoals, setAesthetics, setSkillLevel, setPlatforms,
    setDNA, setSubmitting, markComplete,
  } = useOnboardingStore()

  const dir = 1

  /* ── Toggle helpers ─────────────────────────────────────── */
  const toggleProfession = useCallback((id: ProfessionId) => {
    const curr = answers.professions ?? []
    setProfessions(curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id])
  }, [answers.professions, setProfessions])

  const toggleGoal = useCallback((id: GoalId) => {
    const curr = answers.goals ?? []
    if (curr.includes(id)) setGoals(curr.filter((x) => x !== id))
    else if (curr.length < 3) setGoals([...curr, id])
  }, [answers.goals, setGoals])

  const toggleAesthetic = useCallback((id: AestheticId) => {
    const curr = answers.aesthetics ?? []
    if (curr.includes(id)) setAesthetics(curr.filter((x) => x !== id))
    else if (curr.length < 3) setAesthetics([...curr, id])
  }, [answers.aesthetics, setAesthetics])

  const togglePlatform = useCallback((id: PlatformId) => {
    const curr = answers.platforms ?? []
    setPlatforms(curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id])
  }, [answers.platforms, setPlatforms])

  /* ── Validation ─────────────────────────────────────────── */
  const canAdvance = () => {
    if (step === 1) return (answers.professions?.length ?? 0) > 0
    if (step === 2) return (answers.goals?.length ?? 0) > 0
    if (step === 3) return (answers.aesthetics?.length ?? 0) > 0
    if (step === 4) return !!answers.skillLevel
    if (step === 5) return (answers.platforms?.length ?? 0) > 0
    return false
  }

  /* ── Submit onboarding ──────────────────────────────────── */
  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)

    try {
      const token = await user.getIdToken()
      const body: OnboardingAnswers = {
        professions: answers.professions ?? [],
        goals:       answers.goals       ?? [],
        aesthetics:  answers.aesthetics  ?? [],
        skillLevel:  answers.skillLevel  ?? "beginner",
        platforms:   answers.platforms   ?? [],
      }

      const res = await fetch("/api/onboarding/complete", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json() as { dna: StyleDNA; sections: PersonalizedSection[] }
        if (data.dna) setDNA(data.dna)
        next() // → step 6 (complete)
      }
    } catch (err) {
      console.error("[onboarding]", err)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Next button handler ────────────────────────────────── */
  function handleNext() {
    if (step < 5) next()
    else if (step === 5) handleSubmit()
  }

  if (!isOpen) return null

  const stepMeta = STEPS[step - 1]

  /* Show preview panel for steps 1-5 (not on completion screen) */
  const showPreview = step < 6

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          onClick={step < 6 ? close : undefined}
        />

        {/* Atmospheric gold glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none opacity-20"
          style={{ background: "radial-gradient(ellipse at 50% 0%, #C9A84C60, transparent 70%)" }}
        />

        {/* ── Outer wrapper: modal + preview side-by-side on lg+ ── */}
        <div className="relative z-10 flex items-start gap-4 w-full max-w-[940px] h-[90vh]">

          {/* ── Modal panel ── */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.94, opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative flex-1 w-full max-w-[640px] h-full flex flex-col
              rounded-2xl border border-border/60 bg-black/90 backdrop-blur-2xl
              shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(201,168,76,0.06)]
              overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

            {/* ── Header ── */}
            <div className="px-6 pt-6 pb-4 shrink-0">
              {step < 6 && (
                <div className="flex items-center gap-2 mb-5">
                  {[1,2,3,4,5].map((n) => (
                    <div
                      key={n}
                      className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                        n < step   ? "bg-gold"    :
                        n === step ? "bg-gold/60" : "bg-border"
                      }`}
                    />
                  ))}
                  <span className="text-[0.75rem] text-muted/50 ml-1 shrink-0">{step}/5</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  {step === 1 && (
                    <p className="text-[0.75rem] font-semibold tracking-widest text-gold/70 uppercase">
                      Customize Your Creative Universe
                    </p>
                  )}
                  <h2 className="font-display font-black text-[1.25rem] sm:text-[1.375rem] text-foreground leading-tight">
                    {stepMeta.headline}
                  </h2>
                  <p className="text-[0.875rem] text-muted/70">
                    {stepMeta.sub}
                  </p>
                </div>

                {step < 6 && (
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Skip onboarding"
                    className="ml-4 shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted/40 hover:text-muted hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* ── Step content ── */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0 overflow-y-auto px-6 pb-4
                    [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
                >
                  {step === 1 && (
                    <StepProfession selected={answers.professions ?? []} onToggle={toggleProfession} />
                  )}
                  {step === 2 && (
                    <StepGoals selected={answers.goals ?? []} onToggle={toggleGoal} />
                  )}
                  {step === 3 && (
                    <StepAesthetics selected={answers.aesthetics ?? []} onToggle={toggleAesthetic} />
                  )}
                  {step === 4 && (
                    <StepSkillLevel selected={answers.skillLevel} onSelect={setSkillLevel} />
                  )}
                  {step === 5 && (
                    <StepPlatforms selected={answers.platforms ?? []} onToggle={togglePlatform} />
                  )}
                  {step === 6 && (
                    <StepComplete dna={dna} sections={[]} onClose={markComplete} />
                  )}

                  {/* ── Live preview (inline below step content, mobile-only) ── */}
                  {showPreview && (
                    <div className="lg:hidden">
                      <LivePreviewPanel answers={answers} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Footer navigation ── */}
            {step < 6 && (
              <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between gap-3 shrink-0">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={back}
                    className="flex items-center gap-1.5 text-[0.875rem] text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={close}
                    className="text-[0.875rem] text-muted/40 hover:text-muted transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    Skip for now
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance() || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmitting ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden="true">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Building…
                    </>
                  ) : step === 5 ? (
                    "Build My Universe →"
                  ) : (
                    "Continue →"
                  )}
                </button>
              </div>
            )}
          </motion.div>

          {/* ── Desktop live preview panel (right side) ── */}
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
              className="hidden lg:flex flex-col w-[260px] shrink-0 rounded-2xl border border-border/40 bg-black/70 backdrop-blur-2xl p-4 self-start max-h-full overflow-y-auto
                [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-thumb]:rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel header */}
              <div className="mb-3">
                <p className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted/40">
                  Live Preview
                </p>
                <p className="text-[0.8125rem] font-bold text-foreground/80 mt-0.5">
                  Your Creative Universe
                </p>
              </div>

              {/* Empty state */}
              <AnimatePresence mode="wait">
                {(answers.professions?.length ?? 0) === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2 py-4"
                  >
                    <div className="h-2 w-3/4 rounded-full bg-surface-2 animate-pulse" />
                    <div className="h-2 w-1/2 rounded-full bg-surface-2 animate-pulse [animation-delay:100ms]" />
                    <div className="h-2 w-2/3 rounded-full bg-surface-2 animate-pulse [animation-delay:200ms]" />
                    <p className="text-[0.7rem] text-muted/30 mt-2">
                      Select your profession to see personalised picks…
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <LivePreviewPanel answers={answers} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  )
}



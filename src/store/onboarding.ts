/**
 * src/store/onboarding.ts
 *
 * Zustand store for the onboarding modal state.
 * Uses sessionStorage (not localStorage) so the modal can re-trigger
 * if the user refreshes mid-flow, but not on subsequent sessions.
 */

import { create } from "zustand"
import type {
  OnboardingState,
  OnboardingStep,
  OnboardingAnswers,
  StyleDNA,
  ProfessionId,
  GoalId,
  AestheticId,
  SkillLevelId,
  PlatformId,
} from "@/types/onboarding"

interface OnboardingActions {
  open:  ()  => void
  close: ()  => void
  goTo:  (step: OnboardingStep) => void
  next:  ()  => void
  back:  ()  => void

  /* Step setters */
  setProfessions: (ids: ProfessionId[])  => void
  setGoals:       (ids: GoalId[])        => void
  setAesthetics:  (ids: AestheticId[])   => void
  setSkillLevel:  (id:  SkillLevelId)    => void
  setPlatforms:   (ids: PlatformId[])    => void

  /* Completion */
  setDNA:         (dna: StyleDNA) => void
  setSubmitting:  (v:   boolean)  => void
  markComplete:   ()  => void
  reset:          ()  => void
}

type OnboardingStore = OnboardingState & OnboardingActions

const INITIAL_ANSWERS: Partial<OnboardingAnswers> = {
  professions: [],
  goals:       [],
  aesthetics:  [],
  skillLevel:  undefined,
  platforms:   [],
}

export const useOnboardingStore = create<OnboardingStore>()((set) => ({
  /* ── State ── */
  isOpen:       false,
  step:         1,
  answers:      INITIAL_ANSWERS,
  dna:          null,
  isSubmitting: false,
  isComplete:   false,

  /* ── Actions ── */
  open:  () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  goTo: (step) => set({ step }),

  next: () => set((s) => ({
    step: Math.min(s.step + 1, 6) as OnboardingStep,
  })),

  back: () => set((s) => ({
    step: Math.max(s.step - 1, 1) as OnboardingStep,
  })),

  /* Step setters */
  setProfessions: (ids) => set((s) => ({
    answers: { ...s.answers, professions: ids },
  })),

  setGoals: (ids) => set((s) => ({
    answers: { ...s.answers, goals: ids },
  })),

  setAesthetics: (ids) => set((s) => ({
    answers: { ...s.answers, aesthetics: ids },
  })),

  setSkillLevel: (id) => set((s) => ({
    answers: { ...s.answers, skillLevel: id },
  })),

  setPlatforms: (ids) => set((s) => ({
    answers: { ...s.answers, platforms: ids },
  })),

  setDNA:        (dna) => set({ dna }),
  setSubmitting: (v)   => set({ isSubmitting: v }),
  markComplete:  ()    => set({ isComplete: true, isOpen: false }),

  reset: () => set({
    isOpen:       false,
    step:         1,
    answers:      INITIAL_ANSWERS,
    dna:          null,
    isSubmitting: false,
    isComplete:   false,
  }),
}))

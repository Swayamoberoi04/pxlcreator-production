/**
 * src/store/currency.ts
 *
 * Zustand store for the user's preferred display currency.
 * Persisted in localStorage — survives page refreshes.
 *
 * Usage:
 *   const { currency, toggle } = useCurrencyStore()
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SupportedCurrency } from "@/types/commerce"

interface CurrencyStore {
  currency:      SupportedCurrency
  toggle:        () => void
  setCurrency:   (c: SupportedCurrency) => void
  detectLocale:  () => void
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      /* Default to INR; locale detection on first client load (see below) */
      currency: "INR",

      toggle: () =>
        set((s) => ({ currency: s.currency === "INR" ? "USD" : "INR" })),

      setCurrency: (c) => set({ currency: c }),

      /**
       * Call once on app mount (in layout or a top-level component) to auto-detect
       * locale. If localStorage already has a preference, this is a no-op so the
       * user's explicit choice is never overwritten.
       */
      detectLocale: () => {
        if (typeof window === "undefined") return
        const stored = localStorage.getItem("pxl-currency")
        if (stored) return                 // user already has an explicit preference

        const locale = navigator.language ?? ""
        const isIndia = locale.startsWith("hi") || locale === "en-IN"
        const auto: SupportedCurrency = isIndia ? "INR" : "USD"
        if (get().currency !== auto) set({ currency: auto })
      },
    }),
    {
      name: "pxl-currency",
    }
  )
)

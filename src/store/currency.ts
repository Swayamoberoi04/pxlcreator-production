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
  currency:    SupportedCurrency
  toggle:      () => void
  setCurrency: (c: SupportedCurrency) => void
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: "INR",

      toggle: () =>
        set((s) => ({ currency: s.currency === "INR" ? "USD" : "INR" })),

      setCurrency: (c) => set({ currency: c }),
    }),
    {
      name: "pxl-currency",
    }
  )
)

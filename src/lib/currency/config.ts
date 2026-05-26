/**
 * src/lib/currency/config.ts
 *
 * Exchange rate configuration for dual USD/INR display.
 * To update the rate, change USD_TO_INR below.
 * Future: fetch from an exchange rate API and cache.
 */

export const USD_TO_INR = 84 as const

export const CURRENCY_CONFIG = {
  USD: { code: "USD" as const, symbol: "$",  locale: "en-US" },
  INR: { code: "INR" as const, symbol: "₹",  locale: "en-IN" },
} satisfies Record<string, { code: "USD" | "INR"; symbol: string; locale: string }>

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CartStore } from "@/types/cart"
import type { Preset } from "@/types/product"

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      /* ── Initial state ── */
      items: [],
      isOpen: false,

      /* ── Actions ── */

      addItem: (preset: Preset) =>
        set((state) => {
          const existing = state.items.find((i) => i.preset.id === preset.id)
          if (existing) {
            // Preset already in cart — increment quantity
            return {
              items: state.items.map((i) =>
                i.preset.id === preset.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
              isOpen: true,
            }
          }
          // New item — add with quantity 1 and open drawer
          return {
            items: [...state.items, { preset, quantity: 1 }],
            isOpen: true,
          }
        }),

      removeItem: (presetId: string) =>
        set((state) => ({
          items: state.items.filter((i) => i.preset.id !== presetId),
        })),

      updateQty: (presetId: string, quantity: number) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.preset.id !== presetId) }
          }
          return {
            items: state.items.map((i) =>
              i.preset.id === presetId ? { ...i, quantity } : i
            ),
          }
        }),

      clearCart: () => set({ items: [] }),

      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "pxl-cart", // localStorage key
      // Only persist items — not the drawer open/close state
      partialize: (state) => ({ items: state.items }),
    }
  )
)

/* ── Selectors ── */
/* Use these instead of computing in every component */
export const selectItemCount = (state: CartStore) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0)

export const selectTotal = (state: CartStore) =>
  state.items.reduce((sum, i) => sum + i.preset.price * i.quantity, 0)

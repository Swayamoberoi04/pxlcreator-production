import type { Preset } from "@/types/product"

export interface CartItem {
  preset: Preset
  quantity: number
}

export interface CartStore {
  /* State */
  items: CartItem[]
  isOpen: boolean

  /* Derived (computed inside selectors — not stored) */
  // itemCount and total are computed via selectors below

  /* Actions */
  addItem:    (preset: Preset) => void
  removeItem: (presetId: string) => void
  updateQty:  (presetId: string, quantity: number) => void
  clearCart:  () => void
  openCart:   () => void
  closeCart:  () => void
}

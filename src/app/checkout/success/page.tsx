import type { Metadata } from "next"
import { CheckoutSuccessClient } from "@/components/checkout/CheckoutSuccessClient"

export const metadata: Metadata = {
  title:       "Order Confirmed — PXL Creator",
  description: "Your preset purchase was successful.",
  robots:      "noindex",
}

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessClient />
}

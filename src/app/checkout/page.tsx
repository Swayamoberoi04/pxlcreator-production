import type { Metadata } from "next"
import { CheckoutClient } from "@/components/checkout/CheckoutClient"

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your PXL Creator order — instant download after payment.",
}

export default function CheckoutPage() {
  return <CheckoutClient />
}

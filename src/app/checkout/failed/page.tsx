import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title:       "Payment Failed — PXL Creator",
  description: "Something went wrong with your payment.",
  robots:      "noindex",
}

export default function CheckoutFailedPage() {
  return (
    <div className="relative w-full bg-background overflow-hidden">
      <LuminousEnvironment variant="neutral" intensity={0.6} />
      <GrainOverlay opacity={0.015} zIndex={1} />
      <Container className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-md flex flex-col items-center text-center gap-6">

          {/* Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <FailIcon />
          </div>

          {/* Copy */}
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-2xl text-foreground">Payment Unsuccessful</h1>
            <p className="text-muted text-base leading-relaxed">
              Your payment could not be processed. No money was charged.
              Please try again — if the problem persists, contact us.
            </p>
          </div>

          {/* Help notice */}
          <div className="w-full rounded-xl border border-border bg-surface px-5 py-4 text-left">
            <p className="text-small text-muted font-medium mb-2">Common reasons:</p>
            <ul className="text-small text-muted space-y-1 list-disc list-inside">
              <li>Insufficient balance</li>
              <li>Card/UPI transaction limit exceeded</li>
              <li>Bank blocked the transaction</li>
              <li>Network timeout</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col w-full gap-3">
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-background hover:bg-gold-dim transition-colors"
            >
              <RetryIcon />
              Try Again
            </Link>
            <Link
              href="/store"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Back to Store
            </Link>
          </div>

          <p className="text-xs text-muted">
            Need help?{" "}
            <Link href="/contact" className="text-gold hover:underline">Contact support</Link>
          </p>

        </div>
      </Container>
    </div>
  )
}

function FailIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  )
}
function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}

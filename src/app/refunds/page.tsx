import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import Link from "next/link"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "PXL Creator's refund and return policy for preset packs, courses, and digital products.",
}

const LAST_UPDATED = "January 1, 2025"

const ELIGIBLE = [
  "The download link was broken or expired and we were unable to resolve it within 48 hours",
  "You were charged twice for the same product due to a technical error",
  "The product you received is materially different from what was described at the time of purchase",
] as const

const NOT_ELIGIBLE = [
  "You changed your mind after accessing the download",
  "The preset style does not match your personal taste or aesthetic",
  "You purchased the wrong product — please contact us first and we will help you swap",
  "Incompatibility with an unsupported software version (please check compatibility before purchase)",
] as const

export default function RefundsPage() {
  return (
    <div className="w-full bg-background">

      {/* ── Hero band ── */}
      <div className="relative w-full border-b border-border bg-surface overflow-hidden depth-section">
        <LuminousEnvironment variant="neutral" intensity={0.7} />
        <GrainOverlay opacity={0.015} zIndex={1} />
        <Container className="relative z-10 py-14 sm:py-20">
          <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
              <span className="text-label text-gold tracking-widest">Legal</span>
              <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
            </div>
            <h1 className="heading-2 text-foreground">Refund Policy</h1>
            <p className="text-small text-muted/60">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      {/* ── Content ── */}
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="Overview">
              <p>
                All PXL Creator products are <strong>digital downloads</strong>. Because files can be
                copied instantly upon delivery, we are generally unable to accept returns in the same
                way a physical goods store would. Please read this policy carefully before purchasing.
              </p>
            </Section>

            <Section title="When a refund IS eligible">
              <p>We will issue a full refund within <strong>7 days of purchase</strong> if:</p>
              <ul>
                {ELIGIBLE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>

            <Section title="When a refund is NOT eligible">
              <p>Refunds will not be issued if:</p>
              <ul>
                {NOT_ELIGIBLE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>

            {/* Visual callout */}
            <div className="rounded-xl border border-gold/20 bg-gold/5 px-6 py-5 flex gap-4">
              <span className="text-gold text-[1.25rem] leading-none mt-0.5 shrink-0">✦</span>
              <div className="flex flex-col gap-1.5">
                <p className="text-[0.9375rem] font-semibold text-foreground">Not sure? Just ask first.</p>
                <p className="text-[0.875rem] text-muted leading-relaxed">
                  If you&apos;re unsure whether a preset pack fits your style, reach out before buying.
                  We&apos;re happy to share sample exports or help you choose the right pack.
                </p>
              </div>
            </div>

            <Section title="Courses and Subscriptions">
              <p>
                Course purchases are non-refundable once you have accessed more than
                <strong> 20% of the course content</strong>. If you encounter a technical issue
                preventing you from accessing the course, contact us within 7 days of purchase.
              </p>
            </Section>

            <Section title="How to Request a Refund">
              <p>
                Email <a href="mailto:playsphereg@gmail.com">playsphereg@gmail.com</a> with:
              </p>
              <ul>
                <li>Your order number or receipt email</li>
                <li>The product name</li>
                <li>A brief description of the issue</li>
              </ul>
              <p>
                We aim to respond to all refund requests within <strong>2 business days</strong>.
                Approved refunds are issued to the original payment method and typically appear
                within 5–10 business days.
              </p>
            </Section>

            <Section title="Chargebacks">
              <p>
                If you initiate a chargeback before contacting us, we reserve the right to dispute
                it with evidence of product delivery. We strongly prefer to resolve issues directly —
                please <Link href="/contact" className="text-gold hover:underline">contact us first</Link>.
              </p>
            </Section>

          </LegalDoc>
        </div>
      </Container>

    </div>
  )
}

function LegalDoc({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-10">{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display font-bold text-foreground text-[1rem] tracking-wide">{title}</h2>
      <div className="flex flex-col gap-3 text-[0.9375rem] text-muted leading-relaxed [&_strong]:text-foreground/80 [&_strong]:font-medium [&_a]:text-gold [&_a]:hover:underline [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:marker:text-gold/50">
        {children}
      </div>
    </section>
  )
}

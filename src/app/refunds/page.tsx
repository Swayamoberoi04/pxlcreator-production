import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import Link from "next/link"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "PXL Creator's refund and return policy for preset packs, courses, and digital products.",
}

const LAST_UPDATED = "May 26, 2026"

const ELIGIBLE = [
  "The download link was broken or expired and we were unable to resolve it within 48 hours",
  "You were charged twice for the same product or subscription due to a verified technical error",
  "The product you received is materially different from what was described at the time of purchase",
  "You were charged for a subscription renewal after cancelling, provided the charge was within 24 hours",
] as const

const NOT_ELIGIBLE = [
  "You changed your mind after accessing the download or using the preset",
  "The preset style does not match your personal taste or aesthetic — please preview samples first",
  "You purchased the wrong product — reach out and we will help you find the right one",
  "Incompatibility with an unsupported or unlisted software version (check compatibility before buying)",
  "You forgot to cancel a subscription before the renewal date (more than 24 hours prior)",
  "Partial use of a course or subscription period",
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
                All PXL Creator products are <strong>digital downloads</strong> delivered instantly
                upon payment. Because files can be copied immediately upon delivery, we are generally
                unable to accept returns in the same way a physical goods retailer would. Please read
                this policy carefully and feel free to{" "}
                <Link href="/contact" className="text-gold hover:underline">contact us</Link>{" "}
                before purchasing if you have any questions.
              </p>
            </Section>

            <Section title="When a Refund IS Eligible">
              <p>
                We will issue a <strong>full refund within 7 days of the original purchase date</strong>{" "}
                if any of the following apply:
              </p>
              <ul>
                {ELIGIBLE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>

            <Section title="When a Refund is NOT Eligible">
              <p>Refunds will <strong>not</strong> be issued in the following circumstances:</p>
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
                  If you&apos;re unsure whether a preset pack fits your editing style, reach out before
                  buying. We&apos;re happy to share before/after samples, video previews, or help you
                  choose the right pack for your work.
                </p>
              </div>
            </div>

            <Section title="Courses">
              <p>
                Course purchases are <strong>non-refundable</strong> once you have accessed more than
                <strong> 20% of the course content</strong>, as this indicates substantial use of the
                educational material. If you encounter a technical issue preventing you from accessing
                the course at all, contact us within 7 days of purchase for a full refund.
              </p>
            </Section>

            <Section title="Subscriptions">
              <p>
                PXL Creator Premium subscriptions are billed on a monthly or annual basis via Razorpay.
                We do not offer pro-rated refunds for unused subscription time within an active billing
                period. If you cancel your subscription, you will retain access until the end of the
                current billing cycle.
              </p>
              <p>
                If you were charged for a subscription renewal that you cancelled more than
                24 hours prior, please contact us with proof of cancellation and we will review
                your case. Accidental renewals within 24 hours of the billing date may be eligible
                for a refund at our discretion.
              </p>
            </Section>

            <Section title="How to Request a Refund">
              <p>
                Email us at{" "}
                <a href="mailto:pxlcreator@gmail.com">pxlcreator@gmail.com</a> with the subject line
                <em> &ldquo;Refund Request — [Order Number]&rdquo;</em> and include:
              </p>
              <ul>
                <li>Your order number or the email address used at checkout</li>
                <li>The product name or subscription plan</li>
                <li>A brief description of the issue and why you are requesting a refund</li>
                <li>Any relevant screenshots or error messages if applicable</li>
              </ul>
              <p>
                We aim to respond to all refund requests within <strong>2 business days</strong>.
                Approved refunds are processed via Razorpay to the original payment method and
                typically appear within <strong>5–10 business days</strong>, depending on your
                bank or card issuer.
              </p>
            </Section>

            <Section title="Chargebacks">
              <p>
                If you initiate a chargeback or payment dispute without first contacting us, we
                reserve the right to dispute it with documented evidence of product delivery,
                download access, and these Terms. We strongly prefer to resolve all issues directly
                and amicably —{" "}
                <Link href="/contact" className="text-gold hover:underline">contact us first</Link>{" "}
                and we will do our best to make it right.
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

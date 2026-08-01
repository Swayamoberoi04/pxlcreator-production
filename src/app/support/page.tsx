import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Support Policy",
  description:
    "PXL Creator support scope, response times, and how to get help with presets, downloads, and account issues.",
}

const LAST_UPDATED = "June 26, 2026"

export default function SupportPage() {
  return (
    <div className="w-full bg-background">

      <div className="relative w-full border-b border-border bg-surface overflow-hidden depth-section">
        <LuminousEnvironment variant="neutral" intensity={0.7} />
        <GrainOverlay opacity={0.015} zIndex={1} />
        <Container className="relative z-10 py-14 sm:py-20">
          <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              <span className="text-label text-gold/80 tracking-widest">Help</span>
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
            </div>
            <h1 className="heading-2 text-foreground">Support Policy</h1>
            <p className="text-small text-muted/85">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. How to Contact Support">
              <p>
                All support requests must be submitted by email to{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a>.
              </p>
              <p>
                To help us resolve your issue as quickly as possible, please include the following
                in your email:
              </p>
              <ul>
                <li>The email address associated with your PXL Creator account</li>
                <li>Your order number or transaction ID (found in your order confirmation email)</li>
                <li>A clear description of the issue you are experiencing</li>
                <li>Screenshots or screen recordings where relevant</li>
                <li>Your version of Adobe Lightroom and your operating system (for preset issues)</li>
              </ul>
            </Section>

            <Section title="2. Response Times">
              <p>
                We aim to respond to all support emails within <strong>2 business days</strong>.
                Business days are Monday to Friday, excluding Indian public holidays. Response times
                may be longer during peak periods such as new product launches, sales events, or
                holiday periods.
              </p>
              <p>
                We do not offer live chat or phone support at this time. Email is our primary and
                only official support channel. Messages sent via social media (Instagram, YouTube
                comments, etc.) may not receive a timely response and should not be used for
                support requests involving account or payment issues.
              </p>
            </Section>

            <Section title="3. What We Can Help With">
              <p>Our support team can assist with the following:</p>
              <ul>
                <li>
                  <strong>Download issues</strong> — if your download link has expired, failed, or
                  did not arrive, we can regenerate it after verifying your purchase.
                </li>
                <li>
                  <strong>Account access</strong> — if you are unable to log in or cannot see your
                  purchased products in your account dashboard.
                </li>
                <li>
                  <strong>Payment issues</strong> — if a payment was deducted but your order was not
                  confirmed, or if you believe a duplicate charge occurred.
                </li>
                <li>
                  <strong>Wrong product delivered</strong> — if the files you received do not match
                  your order.
                </li>
                <li>
                  <strong>Preset installation</strong> — general guidance on how to import presets
                  into Adobe Lightroom Classic, Lightroom (cloud), or Lightroom Mobile.
                </li>
                <li>
                  <strong>Compatibility questions</strong> — confirming whether a specific preset
                  pack is compatible with your version of Lightroom.
                </li>
                <li>
                  <strong>Course access</strong> — if you cannot access course content after purchase.
                </li>
              </ul>
            </Section>

            <Section title="4. What Is Outside Our Support Scope">
              <p>The following are outside the scope of PXL Creator customer support:</p>
              <ul>
                <li>
                  <strong>General Lightroom tutorials</strong> — we cannot provide one-to-one
                  Lightroom training or personalised editing coaching via support email. Please
                  refer to our blog, YouTube channel, and courses for educational content.
                </li>
                <li>
                  <strong>Preset customisation</strong> — we cannot customise presets to match a
                  specific look on your behalf.
                </li>
                <li>
                  <strong>Third-party software</strong> — we do not provide support for presets
                  used in applications other than those listed as compatible on the product page.
                </li>
                <li>
                  <strong>Hardware or device issues</strong> — problems with your computer,
                  mobile device, or internet connection are outside our scope.
                </li>
                <li>
                  <strong>Refund requests outside our policy</strong> — we cannot process refund
                  requests that fall outside the conditions in our{" "}
                  <a href="/refunds">Refund Policy</a>.
                </li>
              </ul>
            </Section>

            <Section title="5. Download Link Renewal">
              <p>
                Purchase download links are valid for <strong>30 days</strong> from the date of
                purchase and allow a maximum of <strong>2 downloads</strong> per product. If your
                link has expired or you have exhausted your download limit, email us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> with your order
                number and we will manually verify your purchase and issue a new link.
              </p>
              <p>
                We honour reasonable renewal requests indefinitely — there is no time limit on
                requesting a link renewal for a product you have legitimately purchased.
              </p>
            </Section>

            <Section title="6. Abuse of Support">
              <p>
                We reserve the right to decline support requests that are abusive, harassing, or
                that repeatedly seek assistance with issues already resolved. We also reserve the
                right to terminate accounts that submit fraudulent support claims (for example,
                falsely claiming a payment failed in order to obtain a refund on a completed
                download).
              </p>
            </Section>

            <Section title="7. Escalations">
              <p>
                If you believe your support request has not been adequately addressed, you may
                reply to the original support thread to escalate. Please explain clearly why you
                believe the resolution provided was insufficient. We take all escalations seriously
                and will review them as promptly as possible.
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
      <div className="flex flex-col gap-3 text-[0.9375rem] text-muted leading-relaxed [&_strong]:text-foreground/92 [&_strong]:font-medium [&_a]:text-gold [&_a]:hover:underline [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:marker:text-gold/50">
        {children}
      </div>
    </section>
  )
}

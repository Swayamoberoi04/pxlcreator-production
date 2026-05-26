import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions governing your use of PXL Creator products and services.",
}

const LAST_UPDATED = "January 1, 2025"

export default function TermsPage() {
  return (
    <div className="w-full bg-background">

      {/* ── Hero band ── */}
      <div className="relative w-full border-b border-border bg-surface overflow-hidden depth-section">
        <LuminousEnvironment variant="neutral" intensity={0.7} />
        <GrainOverlay opacity={0.015} zIndex={1} />
        <Container className="relative z-10 py-14 sm:py-20">
          <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              <span className="text-label text-gold/80 tracking-widest">Legal</span>
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
            </div>
            <h1 className="heading-2 text-foreground">Terms of Service</h1>
            <p className="text-small text-muted/60">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      {/* ── Content ── */}
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or purchasing from PXL Creator (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), you agree to be
                bound by these Terms of Service. If you do not agree, please do not use our products or services.
              </p>
            </Section>

            <Section title="2. Digital Products — Licence">
              <p>
                All presets, LUTs, and digital resources sold by PXL Creator are licensed, not sold.
                Upon purchase you receive a <strong>personal, non-exclusive, non-transferable licence</strong> to:
              </p>
              <ul>
                <li>Install and use the product on up to <strong>5 personal devices</strong> you own</li>
                <li>Use the product in your own photography and video projects, including commercial client work</li>
              </ul>
              <p>You may <strong>not</strong>:</p>
              <ul>
                <li>Redistribute, re-sell, sublicense, or share the raw preset files with any third party</li>
                <li>Include the preset files in any product bundle sold or given away</li>
                <li>Claim authorship of or rebrand the preset files</li>
              </ul>
            </Section>

            <Section title="3. Courses and Educational Content">
              <p>
                Course access is granted to the individual purchaser only. Sharing login credentials,
                screen-recording course material, or distributing course content is strictly prohibited
                and may result in immediate termination of access without refund.
              </p>
            </Section>

            <Section title="4. Payment and Pricing">
              <p>
                All prices are listed in USD unless otherwise stated. We reserve the right to change
                prices at any time. Promotions and discount codes cannot be applied retroactively.
                Payments are processed securely via Stripe.
              </p>
            </Section>

            <Section title="5. Refunds">
              <p>
                Because our products are digital downloads, we generally do not offer refunds once
                the download link has been accessed. Please read our{" "}
                <a href="/refunds">Refund Policy</a> for full details and exceptions.
              </p>
            </Section>

            <Section title="6. Intellectual Property">
              <p>
                All content on this website — including text, graphics, logos, product images, and
                code — is the exclusive property of PXL Creator and is protected by copyright law.
                You may not reproduce, distribute, or create derivative works without express
                written permission.
              </p>
            </Section>

            <Section title="7. Disclaimer of Warranties">
              <p>
                Our products are provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
                We do not warrant that the products will be compatible with every version of Lightroom
                or every device. It is your responsibility to verify compatibility before purchase.
              </p>
            </Section>

            <Section title="8. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, PXL Creator shall not be liable for any
                indirect, incidental, or consequential damages arising from your use of our products
                or services. Our total liability shall not exceed the amount you paid for the product
                in question.
              </p>
            </Section>

            <Section title="9. Governing Law">
              <p>
                These Terms are governed by the laws of India. Any disputes shall be resolved
                exclusively in the courts of India.
              </p>
            </Section>

            <Section title="10. Changes to Terms">
              <p>
                We may update these Terms at any time. The &ldquo;Last updated&rdquo; date at the top of this
                page reflects the most recent revision. Continued use of our services constitutes
                acceptance of the updated Terms.
              </p>
            </Section>

            <Section title="11. Contact">
              <p>
                Questions about these Terms? Email us at{" "}
                <a href="mailto:playsphereg@gmail.com">playsphereg@gmail.com</a>.
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

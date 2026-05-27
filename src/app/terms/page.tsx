import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions governing your use of PXL Creator products and services.",
}

const LAST_UPDATED = "May 26, 2026"

export default function TermsPage() {
  return (
    <div className="w-full bg-background">

      {/* â”€â”€ Hero band â”€â”€ */}
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

      {/* â”€â”€ Content â”€â”€ */}
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. Acceptance of Terms">
              <p>
                By accessing, browsing, or purchasing from PXL Creator (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
                &ldquo;our&rdquo;), you confirm that you have read, understood, and agree to be bound by
                these Terms of Service and our Privacy Policy. If you do not agree to all of these
                terms, please do not use our website, products, or services.
              </p>
              <p>
                We reserve the right to modify these Terms at any time. Your continued use of our
                services after any change constitutes your acceptance of the revised Terms.
              </p>
            </Section>

            <Section title="2. Digital Products â€” Licence">
              <p>
                All presets, LUTs, and digital resources sold or included with a PXL Creator
                subscription are <strong>licensed, not sold</strong>. Upon purchase or subscription
                activation, you receive a <strong>personal, non-exclusive, non-transferable,
                revocable licence</strong> to:
              </p>
              <ul>
                <li>Install and use the files on up to <strong>5 personal devices</strong> you own or control</li>
                <li>Use the presets in your own photography, videography, and commercial client work</li>
                <li>Apply presets to images that are then delivered to clients as part of paid services</li>
              </ul>
              <p>You may <strong>not</strong>:</p>
              <ul>
                <li>Redistribute, re-sell, sublicense, share, or gift the raw preset or LUT files to any third party</li>
                <li>Include preset files in any product bundle that is sold, given away, or publicly shared</li>
                <li>Upload preset files to any file-sharing platform, cloud drive shared with others, or community repository</li>
                <li>Claim authorship of, rebrand, or rename the preset files</li>
                <li>Use the presets to create competing preset products or derivative filter packs</li>
              </ul>
              <p>
                Violation of these licence terms will result in immediate termination of your licence
                without refund and may result in legal action.
              </p>
            </Section>

            <Section title="3. AI-Powered Studio Feature">
              <p>
                PXL Creator includes an AI-powered preset recommendation feature (&ldquo;Studio&rdquo;).
                This feature uses machine learning to suggest presets based on image analysis and your
                stated preferences. By using the Studio feature, you agree that:
              </p>
              <ul>
                <li>Images you upload for analysis are processed to generate recommendations and are not stored permanently</li>
                <li>AI recommendations are suggestions only â€” results may vary depending on your specific photos</li>
                <li>We do not use uploaded images for model training without explicit consent</li>
                <li>The AI feature is provided as a convenience and carries no guarantee of specific outcomes</li>
              </ul>
            </Section>

            <Section title="4. Courses and Educational Content">
              <p>
                Course access is granted to the individual purchaser only. Sharing login credentials,
                screen-recording course material, or distributing course content in any form is strictly
                prohibited and will result in immediate termination of access without refund. Each
                account is for a single user only.
              </p>
            </Section>

            <Section title="5. Premium Subscriptions">
              <p>
                PXL Creator Premium is a recurring subscription service billed on a monthly or annual
                basis. By subscribing, you authorise us to charge your payment method at the start of
                each billing cycle until you cancel. Subscription benefits include:
              </p>
              <ul>
                <li>Access to all current and future preset packs for the duration of the subscription</li>
                <li>Full course library access</li>
                <li>Early access to new releases and exclusive drops</li>
                <li>Additional plan-specific benefits as described on the Premium page</li>
              </ul>
              <p>
                Subscriptions do not grant permanent ownership of preset files. Upon cancellation or
                expiry, access to subscription-only content will end. Any presets downloaded during
                an active subscription may continue to be used under the personal licence terms in
                Section&nbsp;2.
              </p>
            </Section>

            <Section title="6. Payment and Pricing">
              <p>
                Prices are displayed in USD and INR as applicable. Payments are processed securely
                via <strong>Razorpay</strong> â€” a PCI-DSS compliant payment gateway. We do not store
                your card details on our servers. By completing a purchase, you agree to Razorpay&apos;s
                terms of service and privacy policy.
              </p>
              <p>
                We reserve the right to change prices at any time. Promotions and discount codes
                cannot be applied retroactively to completed orders. Price changes will not affect
                active subscription billing cycles already in progress.
              </p>
            </Section>

            <Section title="7. Refunds">
              <p>
                Because our products are digital downloads, we generally do not offer refunds once
                the download link has been accessed or a subscription has been used. Please read our{" "}
                <a href="/refunds">Refund Policy</a> for complete details, eligible scenarios, and
                the process for submitting a refund request.
              </p>
            </Section>

            <Section title="8. Download Links and Access">
              <p>
                Download links generated for individual preset purchases are valid for
                <strong> 30 days</strong> from the date of purchase. After expiry, please contact us
                to request a link renewal â€” we will honour reasonable requests where purchase can be
                verified. Links are single-use and tied to the purchasing account.
              </p>
            </Section>

            <Section title="9. Intellectual Property">
              <p>
                All content on this website â€” including text, graphics, logos, product images,
                preset files, course videos, and code â€” is the exclusive intellectual property of
                PXL Creator and is protected by copyright and applicable law. You may not reproduce,
                distribute, publicly display, or create derivative works without express written
                permission from us.
              </p>
            </Section>

            <Section title="10. User Accounts">
              <p>
                You are responsible for maintaining the confidentiality of your account credentials
                and for all activity that occurs under your account. Notify us immediately at{" "}
                <a href="mailto:pxlcreator@gmail.com">pxlcreator@gmail.com</a> if you suspect
                unauthorised access to your account. We reserve the right to suspend or terminate
                accounts that violate these Terms.
              </p>
            </Section>

            <Section title="11. Disclaimer of Warranties">
              <p>
                Our products and services are provided &ldquo;as is&rdquo; without warranties of any kind,
                express or implied. We do not warrant that our products will be compatible with every
                version of Adobe Lightroom, every operating system, or every device. It is your
                responsibility to verify compatibility with your specific software version before
                purchasing. Lightroom compatibility information is listed on each product page.
              </p>
            </Section>

            <Section title="12. Limitation of Liability">
              <p>
                To the maximum extent permitted by applicable law, PXL Creator shall not be liable
                for any indirect, incidental, special, or consequential damages arising from your
                use of our products, services, or website â€” including but not limited to loss of
                data, loss of profits, or business interruption â€” even if we have been advised of
                the possibility of such damages. Our total aggregate liability shall not exceed the
                amount you paid for the specific product or service giving rise to the claim.
              </p>
            </Section>

            <Section title="13. Governing Law and Disputes">
              <p>
                These Terms are governed by and construed in accordance with the laws of India.
                Any dispute arising out of or relating to these Terms or your use of our products
                shall be resolved exclusively through the courts of India. If you are a consumer
                in the European Union, you may also have rights under your local consumer protection
                laws that cannot be waived by contract.
              </p>
            </Section>

            <Section title="14. Changes to Terms">
              <p>
                We may update these Terms at any time. The &ldquo;Last updated&rdquo; date at the top of
                this page reflects the most recent revision. For material changes, we will make
                reasonable efforts to notify active subscribers via email. Continued use of our
                services after the effective date of changes constitutes your acceptance of the
                updated Terms.
              </p>
            </Section>

            <Section title="15. Contact">
              <p>
                Questions about these Terms? Email us at{" "}
                <a href="mailto:pxlcreator@gmail.com">pxlcreator@gmail.com</a>. We aim to respond
                within 2 business days.
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

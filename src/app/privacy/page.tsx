import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PXL Creator collects, uses, and protects your personal information.",
}

const LAST_UPDATED = "January 1, 2025"

export default function PrivacyPage() {
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
            <h1 className="heading-2 text-foreground">Privacy Policy</h1>
            <p className="text-small text-muted/60">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      {/* ── Content ── */}
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. Information We Collect">
              <p>When you visit our website or make a purchase, we may collect:</p>
              <ul>
                <li><strong>Personal identifiers</strong> — name, email address, billing address</li>
                <li><strong>Payment information</strong> — processed securely via our payment provider; we do not store card numbers</li>
                <li><strong>Usage data</strong> — pages visited, time on site, browser type, IP address (anonymised)</li>
                <li><strong>Communications</strong> — messages you send via our contact form or email</li>
              </ul>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>We use collected information to:</p>
              <ul>
                <li>Process and fulfil your orders, including delivering digital download links</li>
                <li>Send transactional emails (receipts, download links, support replies)</li>
                <li>Send our newsletter — only if you explicitly subscribe</li>
                <li>Improve our website, products, and customer experience</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p>We do <strong>not</strong> sell, rent, or trade your personal data to third parties for marketing purposes.</p>
            </Section>

            <Section title="3. Cookies">
              <p>
                We use essential cookies to keep the shopping cart functional and to maintain your session.
                We may also use analytics cookies (e.g., Google Analytics) to understand how visitors use
                the site. You can disable cookies in your browser settings; doing so may affect checkout functionality.
              </p>
            </Section>

            <Section title="4. Data Storage and Security">
              <p>
                Your data is stored on servers located in the European Union and/or the United States.
                We use industry-standard SSL encryption for all data transmitted to and from our site.
                Access to personal data is restricted to authorised team members only.
              </p>
            </Section>

            <Section title="5. Your Rights">
              <p>You have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Withdraw consent for marketing emails at any time via the unsubscribe link</li>
                <li>Lodge a complaint with your local data protection authority</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:playsphereg@gmail.com">playsphereg@gmail.com</a>.</p>
            </Section>

            <Section title="6. Third-Party Services">
              <p>We integrate with the following third-party services which have their own privacy policies:</p>
              <ul>
                <li><strong>Stripe</strong> — payment processing</li>
                <li><strong>Google Analytics</strong> — website analytics (anonymised)</li>
                <li><strong>YouTube / Google</strong> — embedded video content</li>
              </ul>
            </Section>

            <Section title="7. Children's Privacy">
              <p>
                Our services are not directed to children under 13. We do not knowingly collect personal
                information from children. If you believe a child has provided us with personal data,
                please contact us immediately.
              </p>
            </Section>

            <Section title="8. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date
                at the top of this page reflects the most recent revision. Continued use of the site
                after changes constitutes acceptance of the updated policy.
              </p>
            </Section>

            <Section title="9. Contact">
              <p>
                Questions about this policy? Email us at{" "}
                <a href="mailto:playsphereg@gmail.com">playsphereg@gmail.com</a>.
              </p>
            </Section>

          </LegalDoc>
        </div>
      </Container>

    </div>
  )
}

/* ── Shared legal prose components ── */
function LegalDoc({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      {children}
    </div>
  )
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

import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PXL Creator collects, uses, and protects your personal information.",
}

const LAST_UPDATED = "May 26, 2026"

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

            <Section title="1. Who We Are">
              <p>
                PXL Creator (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the website pxlcreator.com,
                offering Lightroom presets, LUTs, educational courses, and an AI-powered studio
                feature for photographers and content creators. This policy explains how we collect,
                use, and protect your personal data.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>When you visit our website or make a purchase, we may collect:</p>
              <ul>
                <li>
                  <strong>Account information</strong> — name, email address, and profile data
                  collected when you sign in with Google or register with email and password
                  via Firebase Authentication
                </li>
                <li>
                  <strong>Purchase information</strong> — order details, product names, billing
                  amounts, and transaction IDs. Card numbers and payment credentials are processed
                  exclusively by Razorpay — we never receive or store them
                </li>
                <li>
                  <strong>Download and usage data</strong> — which presets you have purchased,
                  downloaded, or accessed via subscription, stored in our database to manage
                  your library
                </li>
                <li>
                  <strong>Studio feature data</strong> — images uploaded for AI preset
                  recommendations are processed in real time and are not stored permanently
                  on our servers beyond the duration of the session
                </li>
                <li>
                  <strong>Usage analytics</strong> — pages visited, time on site, browser type,
                  and anonymised IP address for improving our products and services
                </li>
                <li>
                  <strong>Communications</strong> — messages you send via our contact form or
                  directly to our support email
                </li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use collected information to:</p>
              <ul>
                <li>Authenticate your account and maintain secure sessions</li>
                <li>Process and fulfil orders, including issuing download links and activating subscriptions</li>
                <li>Send transactional emails — purchase receipts, download confirmations, and support replies</li>
                <li>Deliver AI-powered preset recommendations via the Studio feature</li>
                <li>Send our newsletter or product announcements — only if you have explicitly subscribed</li>
                <li>Improve our website, products, and overall creator experience</li>
                <li>Detect and prevent fraudulent transactions or abuse of our platform</li>
                <li>Comply with applicable legal obligations</li>
              </ul>
              <p>
                We do <strong>not</strong> sell, rent, or trade your personal data to third parties
                for advertising or marketing purposes.
              </p>
            </Section>

            <Section title="4. Cookies and Tracking">
              <p>
                We use cookies and similar technologies to:
              </p>
              <ul>
                <li>Maintain your shopping cart state between pages</li>
                <li>Persist your authentication session so you stay signed in</li>
                <li>Remember your currency preference</li>
                <li>Collect anonymised analytics data to understand how visitors use the site</li>
              </ul>
              <p>
                Essential cookies are required for the site to function correctly. Analytics cookies
                can be disabled in your browser settings, though doing so may affect certain features
                such as checkout. We do not use advertising cookies or sell data to ad networks.
              </p>
            </Section>

            <Section title="5. Data Storage and Security">
              <p>
                Your account and purchase data is stored in Supabase (PostgreSQL), with servers
                located in the European Union and/or the United States. Authentication is handled
                by Firebase (Google), which operates under Google&apos;s security infrastructure.
                All data transmitted to and from our site is encrypted via TLS/SSL. Access to
                personal data is restricted to authorised team members only and protected by
                role-based access controls.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                We retain your account and purchase records for as long as your account is active
                or as required to fulfil legal obligations (such as tax and accounting requirements).
                If you request account deletion, we will remove your personal data within
                30 days, except where retention is required by law. Anonymised analytics data
                may be retained indefinitely.
              </p>
            </Section>

            <Section title="7. Your Rights">
              <p>Depending on your location, you may have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate or incomplete data</li>
                <li>Request deletion of your personal data (&ldquo;right to be forgotten&rdquo;)</li>
                <li>Object to or restrict the processing of your data</li>
                <li>Data portability — receive a copy of your data in a structured format</li>
                <li>Withdraw consent for marketing emails at any time via the unsubscribe link</li>
                <li>Lodge a complaint with your local data protection authority</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:pxlcreator@gmail.com">pxlcreator@gmail.com</a>. We will respond
                within 30 days.
              </p>
            </Section>

            <Section title="8. Third-Party Services">
              <p>
                We integrate with the following third-party services. Each has its own privacy
                policy governing their handling of your data:
              </p>
              <ul>
                <li>
                  <strong>Razorpay</strong> — payment processing (PCI-DSS compliant);
                  handles all card and UPI transactions
                </li>
                <li>
                  <strong>Firebase / Google</strong> — authentication (Google Sign-In),
                  identity management, and secure token issuance
                </li>
                <li>
                  <strong>Supabase</strong> — database and file storage for your account,
                  orders, and subscription data
                </li>
                <li>
                  <strong>YouTube / Google</strong> — embedded course preview and tutorial videos
                </li>
                <li>
                  <strong>Vercel</strong> — website hosting and serverless function execution
                </li>
              </ul>
            </Section>

            <Section title="9. Children's Privacy">
              <p>
                Our services are not directed to individuals under the age of 13. We do not
                knowingly collect personal information from children. If you believe a child
                has provided us with personal data, please contact us immediately at{" "}
                <a href="mailto:pxlcreator@gmail.com">pxlcreator@gmail.com</a> so we can
                investigate and remove the data promptly.
              </p>
            </Section>

            <Section title="10. International Transfers">
              <p>
                Your data may be processed and stored outside of your country of residence,
                including in the United States and the European Union, by our third-party service
                providers. By using PXL Creator, you consent to such transfers. We ensure
                appropriate safeguards are in place to protect your data in accordance with
                applicable law.
              </p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date
                at the top of this page reflects the most recent revision. For material changes
                affecting how we use your personal data, we will notify active account holders
                via email before the changes take effect.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                Questions or concerns about this policy? Email us at{" "}
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

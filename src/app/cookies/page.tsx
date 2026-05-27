import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How PXL Creator uses cookies and similar tracking technologies.",
}

const LAST_UPDATED = "May 26, 2026"

export default function CookiePolicyPage() {
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
            <h1 className="heading-2 text-foreground">Cookie Policy</h1>
            <p className="text-small text-muted/60">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      {/* â”€â”€ Content â”€â”€ */}
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. What Are Cookies?">
              <p>
                Cookies are small text files that websites store on your device when you visit them.
                They are widely used to make websites work efficiently, improve user experience, and
                provide reporting information. Cookies set by us are called &ldquo;first-party cookies.&rdquo;
                Cookies set by external parties are called &ldquo;third-party cookies.&rdquo;
              </p>
            </Section>

            <Section title="2. How We Use Cookies">
              <p>
                PXL Creator uses cookies to:
              </p>
              <ul>
                <li>Keep you signed in to your account across browser sessions</li>
                <li>Maintain your shopping cart state between pages</li>
                <li>Remember your currency preference (USD or INR)</li>
                <li>Understand how visitors interact with our website (analytics)</li>
                <li>Ensure secure payment processing</li>
              </ul>
            </Section>

            <Section title="3. Types of Cookies We Use">
              <p><strong>Strictly Necessary Cookies</strong></p>
              <p>
                These cookies are essential for the website to function. Without them, you cannot
                complete purchases, stay signed in, or use core features. They do not require your
                consent as they are necessary to provide a service you have requested.
              </p>
              <ul>
                <li><strong>Session cookie</strong> â€” Maintains your Firebase authentication session</li>
                <li><strong>Cart cookie</strong> â€” Persists your shopping cart between page loads</li>
                <li><strong>Currency preference</strong> â€” Stores your selected display currency</li>
                <li><strong>CSRF token</strong> â€” Protects against cross-site request forgery</li>
              </ul>

              <p className="mt-3"><strong>Analytics Cookies</strong></p>
              <p>
                We use anonymised analytics to understand how visitors use our site and identify
                areas for improvement. These cookies collect information about pages visited,
                time spent, and general location data â€” never personally identifiable information.
              </p>
              <ul>
                <li><strong>Google Analytics</strong> â€” Anonymised traffic and behaviour analytics</li>
              </ul>

              <p className="mt-3"><strong>Payment Processing Cookies</strong></p>
              <p>
                When you initiate a purchase, our payment provider (Razorpay) sets cookies
                to facilitate secure payment processing and fraud detection. These cookies
                are governed by Razorpay&apos;s own cookie and privacy policies.
              </p>
            </Section>

            <Section title="4. Third-Party Cookies">
              <p>
                Certain third-party services we use may set their own cookies on your device.
                These are governed by the respective third party&apos;s privacy and cookie policies,
                not ours:
              </p>
              <ul>
                <li>
                  <strong>Firebase / Google</strong> â€” Sets cookies to maintain authentication
                  state and Google Sign-In sessions
                </li>
                <li>
                  <strong>Razorpay</strong> â€” Sets cookies for secure payment processing
                  and fraud prevention
                </li>
                <li>
                  <strong>YouTube</strong> â€” If you view embedded videos on our site, YouTube
                  may set cookies to track views and personalise content
                </li>
              </ul>
            </Section>

            <Section title="5. How to Control Cookies">
              <p>
                You can control or delete cookies at any time through your browser settings.
                Here is how to manage cookies in popular browsers:
              </p>
              <ul>
                <li>
                  <strong>Chrome</strong> â€” Settings â†’ Privacy and Security â†’ Cookies and other
                  site data
                </li>
                <li>
                  <strong>Safari</strong> â€” Preferences â†’ Privacy â†’ Manage Website Data
                </li>
                <li>
                  <strong>Firefox</strong> â€” Options â†’ Privacy & Security â†’ Cookies and Site Data
                </li>
                <li>
                  <strong>Edge</strong> â€” Settings â†’ Cookies and site permissions
                </li>
              </ul>
              <p>
                Please note that disabling strictly necessary cookies will prevent core features
                of our website from working correctly â€” including sign-in, cart, and checkout.
                Disabling analytics cookies will not affect your ability to use the site.
              </p>
            </Section>

            <Section title="6. Cookie Lifespan">
              <p>
                Cookies on our website have different expiration periods depending on their purpose:
              </p>
              <ul>
                <li>
                  <strong>Session cookies</strong> â€” Expire when you close your browser
                </li>
                <li>
                  <strong>Authentication cookies</strong> â€” Expire after 30 days of inactivity,
                  or immediately upon sign-out
                </li>
                <li>
                  <strong>Preference cookies</strong> â€” Persist for up to 1 year to avoid
                  having to re-set your preferences on every visit
                </li>
                <li>
                  <strong>Analytics cookies</strong> â€” Typically expire after 2 years
                  (Google Analytics default)
                </li>
              </ul>
            </Section>

            <Section title="7. Your Consent">
              <p>
                By continuing to use our website, you consent to the use of strictly necessary
                cookies. For analytics cookies, your consent is sought separately and you may
                opt out at any time via your browser settings or by contacting us. We do not
                sell or share cookie data with advertisers.
              </p>
            </Section>

            <Section title="8. Changes to This Policy">
              <p>
                We may update this Cookie Policy from time to time to reflect changes in
                technology, law, or our data practices. The &ldquo;Last updated&rdquo; date at the top
                of this page reflects the most recent revision.
              </p>
            </Section>

            <Section title="9. Contact">
              <p>
                Questions about our use of cookies? Email us at{" "}
                <a href="mailto:pxlcreator@gmail.com">pxlcreator@gmail.com</a>.
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

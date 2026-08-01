import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PXL Creator collects, uses, stores, and protects your personal information.",
}

const LAST_UPDATED = "June 26, 2026"

export default function PrivacyPage() {
  return (
    <div className="w-full bg-background">

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
            <p className="text-small text-muted/85">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. Who We Are">
              <p>
                PXL Creator (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is operated by
                Swayam Oberoi, based in Mumbai, Maharashtra, India. Our website is located at{" "}
                <strong>pxlcreator.space</strong>. We offer Lightroom presets, digital preset
                bundles, educational courses, and an AI-powered studio feature for photographers
                and content creators.
              </p>
              <p>
                This Privacy Policy explains what personal data we collect, why we collect it, how
                we use and store it, and your rights in relation to it. PXL Creator is not currently
                registered for GST in India.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>When you visit our website, create an account, or make a purchase, we collect:</p>
              <ul>
                <li>
                  <strong>Account information</strong> — your name and email address, collected
                  when you register with email and password or sign in with Google via Firebase
                  Authentication. Your Firebase UID is stored alongside your profile in our
                  Supabase database.
                </li>
                <li>
                  <strong>Purchase information</strong> — your order details, the products
                  purchased, the amounts paid (in INR or USD), Razorpay order IDs, payment IDs,
                  and transaction timestamps. Card numbers, UPI handles, and other payment
                  credentials are processed exclusively by Razorpay and are never transmitted
                  to or stored on our servers.
                </li>
                <li>
                  <strong>Download and access data</strong> — which products you have purchased
                  or unlocked, your download token records (including download counts and expiry
                  dates), and your subscription status.
                </li>
                <li>
                  <strong>Images submitted to AI Studio</strong> — images you upload to the AI
                  Studio feature are resized and transmitted to OpenAI for colour analysis.
                  Neither your original image nor the processed output is stored on our servers
                  beyond the duration of your session. See Section&nbsp;8 for more detail.
                </li>
                <li>
                  <strong>Community content</strong> — if you use the community features
                  (posts, comments, messages, project submissions, team participation), that
                  content is stored in our database and associated with your account.
                </li>
                <li>
                  <strong>Support communications</strong> — emails you send to{" "}
                  <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a>, including
                  any order details, screenshots, or other information you include.
                </li>
                <li>
                  <strong>Browser storage</strong> — we store your shopping cart contents
                  (<code>pxl-cart</code>) and your preferred display currency (<code>pxl-currency</code>)
                  in your browser&apos;s localStorage. This data stays on your device and is
                  not transmitted to our servers.
                </li>
              </ul>
              <p>
                We do <strong>not</strong> use Google Analytics, Meta Pixel, or any third-party
                advertising or tracking scripts.
              </p>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul>
                <li>Authenticate your account and maintain secure login sessions</li>
                <li>Process and fulfil your orders, including generating and delivering download links</li>
                <li>Activate and manage subscription access</li>
                <li>Send transactional emails — purchase receipts and support replies</li>
                <li>Deliver AI-powered preset recommendations via the Studio feature</li>
                <li>Send newsletter updates — only if you have explicitly opted in</li>
                <li>Provide and moderate community features</li>
                <li>Detect and prevent fraudulent transactions or platform abuse</li>
                <li>Comply with applicable legal obligations including tax and accounting requirements</li>
              </ul>
              <p>
                We do <strong>not</strong> sell, rent, or share your personal data with third
                parties for advertising or marketing purposes.
              </p>
            </Section>

            <Section title="4. Cookies and Browser Storage">
              <p>
                We use the following storage mechanisms:
              </p>
              <ul>
                <li>
                  <strong>Firebase Authentication session cookies</strong> — set automatically
                  by Firebase to maintain your logged-in state across browser sessions. These
                  are essential for account access and cannot be disabled without logging out.
                </li>
                <li>
                  <strong>Supabase session storage</strong> — used by our database client to
                  maintain your authenticated API session. Essential for accessing your account,
                  purchases, and downloads.
                </li>
                <li>
                  <strong>localStorage: <code>pxl-cart</code></strong> — stores your shopping
                  cart locally on your device so items persist if you close the browser tab.
                  Not transmitted to our servers until checkout.
                </li>
                <li>
                  <strong>localStorage: <code>pxl-currency</code></strong> — stores your
                  preferred display currency (INR or USD). Not transmitted to our servers.
                </li>
              </ul>
              <p>
                We do not use advertising cookies, third-party tracking cookies, or analytics
                cookies. For full details, see our <a href="/cookies">Cookie Policy</a>.
              </p>
            </Section>

            <Section title="5. Data Storage and Security">
              <p>
                Your account and purchase data is stored in <strong>Supabase</strong> (PostgreSQL),
                hosted on servers in the European Union and/or the United States. Authentication
                and identity management is handled by <strong>Firebase</strong> (Google). Our
                website is hosted on <strong>Vercel</strong>.
              </p>
              <p>
                All data transmitted between your browser and our servers is encrypted using
                TLS/SSL. Access to personal data within our systems is restricted to authorised
                personnel only, protected by row-level security policies in Supabase and Firebase
                Admin SDK token verification for server-side operations.
              </p>
              <p>
                While we implement industry-standard security measures, no method of transmission
                over the internet is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                We retain your account information, order history, payment transaction records,
                download access records, and related data for <strong>up to 5 years</strong> from
                the date of collection or your last transaction. This retention period is necessary
                for:
              </p>
              <ul>
                <li><strong>Tax and accounting compliance</strong> — records required under Indian financial regulations</li>
                <li><strong>Fraud prevention</strong> — maintaining a history to detect and investigate fraudulent activity</li>
                <li><strong>Customer support</strong> — verifying historical purchases for download link renewals and account queries</li>
                <li><strong>Legal compliance</strong> — responding to lawful requests from courts or regulatory authorities</li>
              </ul>
              <p>
                If you request deletion of your account, we will delete or anonymise your personal
                identifiers (name, email address) within 30 days. Order and payment records may be
                retained in anonymised form for the remainder of the 5-year period to satisfy legal
                and accounting obligations.
              </p>
              <p>
                Community content you have posted (posts, comments, messages) will be deleted
                or anonymised upon an account deletion request unless required by law to be retained.
              </p>
            </Section>

            <Section title="7. Your Rights">
              <p>
                You have the following rights in relation to your personal data:
              </p>
              <ul>
                <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
                <li><strong>Correction</strong> — request that we correct inaccurate or incomplete data</li>
                <li><strong>Deletion</strong> — request deletion of your account and personal data, subject to retention requirements in Section&nbsp;6</li>
                <li><strong>Restriction</strong> — request that we stop or limit processing of your data in certain circumstances</li>
                <li><strong>Portability</strong> — receive a copy of your data in a structured, machine-readable format</li>
                <li><strong>Objection</strong> — object to processing based on legitimate interests</li>
                <li><strong>Withdraw consent</strong> — unsubscribe from marketing emails at any time via the unsubscribe link in any email we send</li>
              </ul>
              <p>
                To exercise any of these rights, contact our Grievance Officer (see Section&nbsp;12).
                We will respond within <strong>30 days</strong>.
              </p>
            </Section>

            <Section title="8. Third-Party Services">
              <p>
                We use the following third-party services. Each processes data under their own
                privacy policy:
              </p>
              <ul>
                <li>
                  <strong>Razorpay</strong> (razorpay.com) — payment processing. Razorpay is
                  PCI-DSS compliant. They receive your payment method details, billing amount,
                  and contact information at checkout. We receive only the payment confirmation
                  and transaction ID.
                </li>
                <li>
                  <strong>Firebase / Google</strong> (firebase.google.com) — authentication
                  and identity management. Google processes your email and name when you sign in.
                </li>
                <li>
                  <strong>Supabase</strong> (supabase.com) — database and backend. Stores your
                  account profile, orders, download records, and community content.
                </li>
                <li>
                  <strong>OpenAI</strong> (openai.com) — AI image analysis for the Studio feature.
                  When you use AI Studio, a resized thumbnail of your uploaded image is sent to
                  OpenAI&apos;s API. OpenAI does not use API-submitted images to train their models,
                  per their API usage policy. Images are not retained on our servers after processing.
                </li>
                <li>
                  <strong>Vercel</strong> (vercel.com) — website hosting and edge network. Vercel
                  may log request metadata (IP address, user agent, URL) for security and
                  operational purposes.
                </li>
                <li>
                  <strong>YouTube / Google</strong> (youtube.com) — embedded tutorial and
                  promotional videos. If you watch an embedded YouTube video on our site, Google
                  may set cookies subject to Google&apos;s Privacy Policy.
                </li>
              </ul>
            </Section>

            <Section title="9. AI Studio — Special Note on Image Data">
              <p>
                The AI Studio feature sends a resized thumbnail of your uploaded image to OpenAI
                for colour analysis. This is the only circumstance in which image data leaves our
                servers in a way that includes your content. Specifically:
              </p>
              <ul>
                <li>Your image is resized to a maximum of 512 pixels and converted to JPEG before transmission to OpenAI</li>
                <li>The thumbnail is transmitted over an encrypted HTTPS connection</li>
                <li>Neither the original nor the resized image is stored on our servers after processing is complete</li>
                <li>We do not use your images for any purpose other than generating the colour grading recommendations you requested</li>
                <li>We do not submit your images to OpenAI for model training</li>
              </ul>
              <p>
                By using AI Studio, you consent to this processing. Do not upload images containing
                sensitive personal information, images of identifiable individuals who have not
                consented, or images you do not have the right to upload.
              </p>
            </Section>

            <Section title="10. Children's Privacy">
              <p>
                Our services are not directed to individuals under the age of 13. We do not
                knowingly collect personal information from children under 13. If you believe a
                child has created an account or submitted personal data to us, please contact
                our Grievance Officer at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> and we will
                promptly investigate and delete the data.
              </p>
            </Section>

            <Section title="11. International Data Transfers">
              <p>
                Your data may be stored and processed outside India, including in the United States
                and the European Union, by our third-party service providers (Supabase, Firebase,
                Vercel, OpenAI). By using pxlcreator.space, you consent to your data being
                transferred to and processed in these locations. Our service providers maintain
                appropriate data protection standards for cross-border transfers.
              </p>
            </Section>

            <Section title="12. Grievance Officer">
              <p>
                In accordance with the Information Technology Act, 2000, and the Information
                Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021,
                the details of our Grievance Officer are as follows:
              </p>
              <p>
                <strong>Name:</strong> Swayam Oberoi<br />
                <strong>Designation:</strong> Grievance Officer<br />
                <strong>Email:</strong>{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a><br />
                <strong>Address:</strong> Mumbai, Maharashtra, India<br />
                <strong>Response time:</strong> Within 7 business days of receipt of a complaint
              </p>
              <p>
                You may contact the Grievance Officer to raise any complaint or concern about
                the processing of your personal data, to exercise your data rights under
                Section&nbsp;7, or to report content on our platform that you believe violates
                applicable law or our policies.
              </p>
            </Section>

            <Section title="13. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo;
                date at the top of this page reflects the most recent revision. For material changes
                that affect how we use your personal data, we will notify active account holders
                via email before the changes take effect. Your continued use of pxlcreator.space
                after the effective date of any update constitutes your acceptance of the
                revised Policy.
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
      <div className="flex flex-col gap-3 text-[0.9375rem] text-muted leading-relaxed [&_strong]:text-foreground/92 [&_strong]:font-medium [&_a]:text-gold [&_a]:hover:underline [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:marker:text-gold/50 [&_code]:bg-white/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:text-foreground/92">
        {children}
      </div>
    </section>
  )
}

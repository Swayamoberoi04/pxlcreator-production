import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Digital Download Policy",
  description:
    "How digital downloads work at PXL Creator — link expiry, download limits, renewal, and supported file formats.",
}

const LAST_UPDATED = "June 26, 2026"

export default function DownloadPolicyPage() {
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
            <h1 className="heading-2 text-foreground">Digital Download Policy</h1>
            <p className="text-small text-muted/60">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. How Downloads Work">
              <p>
                When you successfully complete a purchase on pxlcreator.space, your order is
                processed by Razorpay. Once payment is confirmed, our system generates a secure
                download link tied to your account. You can access your downloads at any time
                from your account dashboard.
              </p>
              <p>
                Download links are secured with unique tokens. Each token is associated with your
                specific order and Firebase account. Sharing download links with others is a breach
                of your <a href="/license">Licence Agreement</a>.
              </p>
            </Section>

            <Section title="2. Download Link Validity">
              <p>
                Each download link is valid for <strong>30 days</strong> from the date of purchase.
                Within this window, each product may be downloaded a maximum of{" "}
                <strong>2 times</strong>. This limit exists to protect against link sharing while
                accommodating legitimate use cases such as switching devices.
              </p>
              <p>
                If you exhaust your download count or your link expires before you have successfully
                saved your files, contact us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> with your order
                number and we will issue a renewed link after verifying your purchase.
              </p>
            </Section>

            <Section title="3. Link Renewal">
              <p>
                We will issue a renewed download link for any verified purchase, regardless of how
                much time has passed since your original purchase. There is no time limit on
                requesting a renewal. To request a renewal, email us with:
              </p>
              <ul>
                <li>The email address on your PXL Creator account</li>
                <li>Your Razorpay order ID or payment confirmation number</li>
                <li>The product name you need to re-download</li>
              </ul>
            </Section>

            <Section title="4. File Formats">
              <p>
                Preset packs are delivered as <strong>.zip archives</strong> containing the
                relevant preset files:
              </p>
              <ul>
                <li>
                  <strong>Lightroom Classic presets</strong> — delivered as <code>.xmp</code> files,
                  importable directly into Lightroom Classic via the Develop module preset panel.
                </li>
                <li>
                  <strong>Lightroom Mobile / Lightroom (cloud) presets</strong> — delivered as
                  <code>.xmp</code> files, importable via Lightroom&apos;s preset import function
                  on desktop, then synced to mobile automatically.
                </li>
                <li>
                  <strong>DNG files</strong> — some packs include <code>.dng</code> files for
                  direct import into Lightroom Mobile.
                </li>
              </ul>
              <p>
                File format availability varies by product and is specified on each product page.
                Refer to our <a href="/install">Installation Guide</a> for step-by-step import
                instructions.
              </p>
            </Section>

            <Section title="5. Technical Requirements for Download">
              <p>
                To successfully download your files you will need:
              </p>
              <ul>
                <li>A stable internet connection</li>
                <li>A modern web browser (Chrome, Firefox, Safari, or Edge)</li>
                <li>Sufficient storage space on your device</li>
                <li>An application capable of extracting .zip archives (built into macOS, Windows 10+, iOS, and Android)</li>
              </ul>
            </Section>

            <Section title="6. Failed or Corrupted Downloads">
              <p>
                If a downloaded file is corrupted or fails to extract, please try the following
                before contacting support:
              </p>
              <ul>
                <li>Use your second available download to re-download the file</li>
                <li>Try a different browser or switch from Wi-Fi to a wired connection</li>
                <li>Disable browser extensions that might interfere with downloads</li>
                <li>Clear your browser cache and try again</li>
              </ul>
              <p>
                If the problem persists after attempting both downloads, contact us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> and we will
                investigate and issue a fresh link.
              </p>
            </Section>

            <Section title="7. Delivery by Payment Method">
              <p>
                Payments are processed exclusively through <strong>Razorpay</strong>. Download
                access is provisioned automatically via our webhook integration with Razorpay once
                payment status is confirmed as captured. In rare cases, webhook delivery may be
                delayed by up to 10 minutes. If your downloads do not appear in your dashboard
                within 15 minutes of a successful payment, contact us with your payment
                confirmation screenshot.
              </p>
            </Section>

            <Section title="8. No Refunds After Download">
              <p>
                Because digital files can be copied, we cannot offer refunds once a download link
                has been accessed. Please read our <a href="/refunds">Refund Policy</a> for the
                limited circumstances in which refunds may be considered.
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

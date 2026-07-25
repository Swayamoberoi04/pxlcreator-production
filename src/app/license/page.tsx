import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Licensing Agreement & Preset Usage Terms",
  description:
    "Understand your licence rights when purchasing PXL Creator presets — personal use, commercial use, and prohibited actions.",
}

const LAST_UPDATED = "June 26, 2026"

export default function LicensePage() {
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
            <h1 className="heading-2 text-foreground">Licensing Agreement &amp; Preset Usage Terms</h1>
            <p className="text-small text-muted/85">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. Who This Licence Covers">
              <p>
                This Licensing Agreement (&ldquo;Licence&rdquo;) is a legal agreement between you
                (&ldquo;Licensee&rdquo;) and PXL Creator, operated by Swayam Oberoi, Mumbai,
                Maharashtra, India (&ldquo;Licensor&rdquo;). It governs your rights to use any
                preset files, LUT files, adjustment settings, or digital editing resources
                (&ldquo;Presets&rdquo;) purchased or downloaded from pxlcreator.space.
              </p>
              <p>
                By completing a purchase, downloading a Preset, or accessing a Preset through a
                Premium subscription, you agree to the terms of this Licence. If you do not agree,
                do not download or use the Presets.
              </p>
            </Section>

            <Section title="2. Licence Grant — What You May Do">
              <p>
                Subject to the restrictions in Section&nbsp;3, PXL Creator grants you a
                <strong> personal, non-exclusive, non-transferable, revocable licence</strong> to:
              </p>
              <ul>
                <li>
                  <strong>Personal use</strong> — install and use the Presets on up to five (5)
                  personal devices that you own or control (e.g. laptop, desktop, tablet, mobile
                  phone).
                </li>
                <li>
                  <strong>Commercial client work</strong> — apply Presets to photographs or videos
                  that you produce and deliver to paying clients as part of professional photography
                  or videography services. The final edited images or videos may be shared publicly,
                  including on social media, in portfolios, in advertising campaigns, and in client
                  publications.
                </li>
                <li>
                  <strong>Online content</strong> — use Presets to edit images or videos published
                  to your own website, social media channels, YouTube, or other digital platforms.
                </li>
                <li>
                  <strong>Editorial and journalistic work</strong> — apply Presets to images
                  published in online or print publications in an editorial context.
                </li>
              </ul>
            </Section>

            <Section title="3. Restrictions — What You May Not Do">
              <p>
                The following uses are <strong>strictly prohibited</strong> and constitute a material
                breach of this Licence:
              </p>
              <ul>
                <li>
                  <strong>No redistribution</strong> — you may not distribute, share, send, upload,
                  or make the raw Preset files available to any other person or entity, whether for
                  free or for payment.
                </li>
                <li>
                  <strong>No resale</strong> — you may not sell, sublicense, transfer, or assign
                  the Presets or any rights under this Licence to any third party.
                </li>
                <li>
                  <strong>No sharing</strong> — sharing Preset files with friends, family members,
                  colleagues, or online communities (including Discord servers, WhatsApp groups,
                  Telegram channels, Facebook groups, Reddit, or any similar platform) is not
                  permitted regardless of whether money changes hands.
                </li>
                <li>
                  <strong>No derivative preset products</strong> — you may not use PXL Creator
                  Presets as a base or starting point to create and distribute or sell competing
                  preset products, filter packs, or LUT collections.
                </li>
                <li>
                  <strong>No rebranding</strong> — you may not rename, rebrand, or remove PXL
                  Creator branding from the Preset files.
                </li>
                <li>
                  <strong>No cloud sharing</strong> — storing Presets in shared cloud folders
                  (Google Drive folders shared with others, Dropbox shared links, OneDrive shared
                  access, iCloud shared albums, etc.) is not permitted.
                </li>
                <li>
                  <strong>No AI training</strong> — you may not use the Preset files or the
                  colour-grading styles derived from them to train, fine-tune, or develop artificial
                  intelligence or machine learning models.
                </li>
                <li>
                  <strong>No use after termination</strong> — if your Licence is terminated for any
                  reason, all rights granted under this Licence immediately cease and you must delete
                  all copies of the Presets from your devices.
                </li>
              </ul>
            </Section>

            <Section title="4. Commercial Usage Policy">
              <p>
                PXL Creator presets are cleared for commercial use within the scope of this Licence.
                You do not need to pay an additional fee or obtain a separate commercial licence to:
              </p>
              <ul>
                <li>Edit and deliver photos or videos for paying clients</li>
                <li>Use edited images in advertising, marketing campaigns, or product photography</li>
                <li>Include edited images in client-owned publications, websites, or social media</li>
                <li>Use edited images in editorial features, magazine spreads, or news articles</li>
                <li>Monetise video content on YouTube or other platforms where Presets were applied</li>
              </ul>
              <p>
                Commercial use does <strong>not</strong> include using the Preset files themselves
                as part of a commercial product, bundle, course, or service that you sell, distribute,
                or provide to others.
              </p>
            </Section>

            <Section title="5. Ownership and Intellectual Property">
              <p>
                All Presets remain the exclusive intellectual property of PXL Creator. This Licence
                does not constitute a sale of the Preset files. You receive a limited right to use
                them — ownership never transfers. All copyright and intellectual property rights in
                the Presets remain with Swayam Oberoi / PXL Creator.
              </p>
            </Section>

            <Section title="6. Licence per Account">
              <p>
                Each purchase is tied to a single purchaser account (identified by the email address
                used at checkout). The Licence covers one individual only. Businesses, studios, or
                teams requiring multi-seat access must contact us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> to discuss team
                licensing arrangements.
              </p>
            </Section>

            <Section title="7. Enforcement and Termination">
              <p>
                PXL Creator reserves the right to terminate this Licence immediately and without
                notice if you breach any of its terms. Upon termination:
              </p>
              <ul>
                <li>All rights granted under this Licence immediately cease</li>
                <li>You must delete all copies of the Presets from all devices and storage</li>
                <li>No refund will be issued as a consequence of termination for breach</li>
                <li>PXL Creator reserves the right to pursue legal remedies including injunctive relief and damages</li>
              </ul>
            </Section>

            <Section title="8. No Warranty">
              <p>
                Presets are provided &ldquo;as is&rdquo; without warranties of any kind. PXL Creator
                does not warrant that Presets will be compatible with every version of Adobe Lightroom,
                every device, or every operating system. Compatibility information is listed on each
                product page — it is your responsibility to verify compatibility before purchasing.
              </p>
            </Section>

            <Section title="9. Governing Law">
              <p>
                This Licence is governed by the laws of India. Any disputes arising under or in
                connection with this Licence shall be subject to the exclusive jurisdiction of the
                courts of Mumbai, Maharashtra, India.
              </p>
            </Section>

            <Section title="10. Questions">
              <p>
                If you have questions about what your Licence permits, contact us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> before using the
                Presets in any way not expressly described above.
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

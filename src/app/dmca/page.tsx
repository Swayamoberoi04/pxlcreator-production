import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Copyright & DMCA Policy",
  description:
    "PXL Creator copyright ownership statement and DMCA takedown procedure for reporting infringing content.",
}

const LAST_UPDATED = "June 26, 2026"

export default function DmcaPage() {
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
            <h1 className="heading-2 text-foreground">Copyright &amp; DMCA Policy</h1>
            <p className="text-small text-muted/85">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. Copyright Ownership">
              <p>
                All content published on pxlcreator.space is the exclusive intellectual property of
                PXL Creator, operated by Swayam Oberoi, Mumbai, Maharashtra, India, unless expressly
                stated otherwise. This includes, without limitation:
              </p>
              <ul>
                <li>All Lightroom preset files and LUT files</li>
                <li>All product photography, before/after sample images, and visual demonstrations</li>
                <li>All written content including product descriptions, blog posts, tutorials, and course material</li>
                <li>All video content including tutorials and promotional videos</li>
                <li>The PXL Creator name, logo, and branding elements</li>
                <li>The source code, design, and structure of this website</li>
                <li>All AI Studio outputs and methodology</li>
              </ul>
              <p>
                No content from this website may be reproduced, copied, publicly displayed, distributed,
                modified, or used to create derivative works without our prior written permission.
              </p>
            </Section>

            <Section title="2. Permitted Uses">
              <p>
                The following limited uses are permitted without prior written authorisation:
              </p>
              <ul>
                <li>
                  <strong>Press and media</strong> — journalists and bloggers may reproduce a
                  reasonable excerpt (up to two paragraphs) from our blog posts with a clear
                  attribution link to the original page on pxlcreator.space.
                </li>
                <li>
                  <strong>Social sharing</strong> — sharing links to our pages on social media
                  platforms is encouraged.
                </li>
                <li>
                  <strong>Personal screenshots</strong> — taking screenshots for personal reference
                  or non-commercial educational discussion is permitted.
                </li>
              </ul>
              <p>
                All other uses require our express written permission. To request permission, email
                us at <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a>.
              </p>
            </Section>

            <Section title="3. Infringement of Our Copyright">
              <p>
                PXL Creator actively monitors for unauthorised distribution of our preset files and
                other copyrighted content. If we discover infringement, we will:
              </p>
              <ul>
                <li>Issue a takedown notice to the infringing platform or hosting provider</li>
                <li>Terminate the Licence of any PXL Creator customer found to be distributing our files</li>
                <li>Pursue civil and, where applicable, criminal remedies under Indian copyright law</li>
              </ul>
              <p>
                Redistribution of PXL Creator preset files — whether free or paid — without authorisation
                is a breach of both this policy and our{" "}
                <a href="/license">Licensing Agreement</a>. We take copyright infringement seriously
                and will not issue refunds to accounts terminated for this reason.
              </p>
            </Section>

            <Section title="4. Reporting Infringement of Your Copyright (DMCA / Takedown Notice)">
              <p>
                If you believe that content on pxlcreator.space infringes your copyright, you may
                submit a takedown notice to us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> with the subject
                line <strong>&ldquo;Copyright Takedown Notice&rdquo;</strong>.
              </p>
              <p>Your notice must include:</p>
              <ul>
                <li>Your full legal name and contact information (email address and phone number)</li>
                <li>A description of the copyrighted work you claim has been infringed</li>
                <li>The specific URL or location on our website where the infringing content appears</li>
                <li>A statement that you have a good faith belief that the use is not authorised by the copyright owner, its agent, or the law</li>
                <li>A statement that the information in your notice is accurate and, under penalty of perjury, that you are the copyright owner or are authorised to act on behalf of the owner</li>
                <li>Your physical or electronic signature</li>
              </ul>
              <p>
                Incomplete notices cannot be processed. We will acknowledge valid notices within
                5 business days and take appropriate action.
              </p>
            </Section>

            <Section title="5. Counter-Notice">
              <p>
                If content you submitted to PXL Creator has been removed following a takedown notice
                and you believe the removal was in error, you may submit a counter-notice to{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> with:
              </p>
              <ul>
                <li>Your full legal name and contact information</li>
                <li>Identification of the content that was removed and its location before removal</li>
                <li>A statement under penalty of perjury that you have a good faith belief that the content was removed as a result of mistake or misidentification</li>
                <li>Your physical or electronic signature</li>
              </ul>
            </Section>

            <Section title="6. Repeat Infringers">
              <p>
                PXL Creator will terminate the accounts of users who are found to be repeat copyright
                infringers. We may also report repeat infringers to relevant authorities.
              </p>
            </Section>

            <Section title="7. Contact">
              <p>
                All copyright and DMCA matters should be directed to:{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a>
              </p>
              <p>
                Swayam Oberoi / PXL Creator<br />
                Mumbai, Maharashtra, India
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

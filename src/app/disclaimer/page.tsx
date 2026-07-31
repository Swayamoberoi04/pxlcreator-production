import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important disclaimers about PXL Creator products, AI Studio outputs, affiliate links, and limitation of liability.",
}

const LAST_UPDATED = "June 26, 2026"

export default function DisclaimerPage() {
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
            <h1 className="heading-2 text-foreground">Disclaimer</h1>
            <p className="text-small text-muted/85">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. General Disclaimer">
              <p>
                The information, products, and services provided by PXL Creator on pxlcreator.space
                are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without any representation
                or endorsement made, and without warranty of any kind, whether express or implied.
              </p>
              <p>
                PXL Creator makes no warranties, representations, or guarantees of any kind,
                expressed or implied, about the completeness, accuracy, reliability, suitability,
                or availability of the website, or of the information, products, services, or related
                graphics contained on this website for any purpose.
              </p>
            </Section>

            <Section title="2. Product Results Disclaimer">
              <p>
                PXL Creator presets, LUTs, and editing tools are designed to enhance your photography
                and videography workflow. However, results will vary depending on:
              </p>
              <ul>
                <li>Your source image or video quality, resolution, and exposure</li>
                <li>Your camera sensor, white balance settings, and colour profile</li>
                <li>Your version of Adobe Lightroom, Lightroom Mobile, or other supported software</li>
                <li>Your monitor calibration and colour profile</li>
                <li>The specific subject, lighting conditions, and environment in your images</li>
              </ul>
              <p>
                Before/after sample images shown on our website are illustrative examples created
                under specific conditions. Your results may differ. We strongly recommend downloading
                and testing presets on your own images before making purchasing decisions based solely
                on sample imagery.
              </p>
            </Section>

            <Section title="3. Software Compatibility Disclaimer">
              <p>
                PXL Creator presets are developed and tested with specific versions of Adobe Lightroom
                Classic, Lightroom (cloud), and Lightroom Mobile. Compatibility information is listed
                on each product page. We cannot guarantee that presets will function identically —
                or at all — with:
              </p>
              <ul>
                <li>Future versions of Adobe Lightroom or Adobe Creative Cloud applications</li>
                <li>Third-party applications that claim Lightroom preset compatibility</li>
                <li>Older versions of Lightroom not listed as supported on the product page</li>
                <li>Non-Adobe photo editing software</li>
              </ul>
              <p>
                Adobe Inc. is not affiliated with PXL Creator. Lightroom is a trademark of Adobe Inc.
                Any mention of Adobe or Lightroom on this website is solely for descriptive and
                compatibility purposes.
              </p>
            </Section>

            <Section title="4. AI Studio Disclaimer">
              <p>
                The AI Studio feature on pxlcreator.space uses the OpenAI GPT-4o model to analyse
                uploaded images and generate colour grading suggestions and preset recommendations.
                By using AI Studio, you acknowledge that:
              </p>
              <ul>
                <li>AI-generated recommendations are algorithmic suggestions, not professional photographic advice</li>
                <li>Results may not always accurately represent the ideal editing approach for your specific image</li>
                <li>AI analysis is based on general image characteristics and cannot account for your creative intent</li>
                <li>Recommended presets may require manual adjustment after application to achieve your desired result</li>
                <li>The AI system has a rate limit of 5 analyses per hour per IP address to ensure fair access</li>
              </ul>
              <p>
                AI Studio is provided as a convenience tool. PXL Creator does not guarantee the
                accuracy of AI-generated recommendations and accepts no responsibility for editing
                decisions made based on AI Studio outputs.
              </p>
            </Section>

            <Section title="5. External Links Disclaimer">
              <p>
                This website may contain links to external websites, including YouTube tutorials,
                social media profiles, and third-party resources. These links are provided for
                convenience and informational purposes only. PXL Creator does not endorse, control,
                or take responsibility for the content, privacy practices, or availability of any
                external website. Accessing external links is entirely at your own risk.
              </p>
            </Section>

            <Section title="6. No Professional Advice">
              <p>
                Nothing on this website constitutes legal, financial, tax, or business advice. Any
                information about earning income from photography, using presets in commercial work,
                or building a creative business is for general informational purposes only. You should
                seek independent professional advice tailored to your specific circumstances before
                making business or financial decisions.
              </p>
            </Section>

            <Section title="7. Limitation of Liability">
              <p>
                To the fullest extent permitted by applicable law, PXL Creator, its owner, employees,
                and affiliates shall not be liable for any direct, indirect, incidental, special,
                consequential, or punitive damages arising from:
              </p>
              <ul>
                <li>Your use or inability to use our products, services, or website</li>
                <li>Errors, omissions, or inaccuracies in our content</li>
                <li>Unauthorised access to your personal data or account</li>
                <li>Any bugs, viruses, or harmful code introduced by third parties</li>
                <li>Any loss or damage to your files, data, or equipment</li>
              </ul>
              <p>
                In no event shall PXL Creator&apos;s aggregate liability exceed the total amount
                you paid for the specific product or service directly giving rise to the claim.
              </p>
            </Section>

            <Section title="8. Accuracy of Information">
              <p>
                We make reasonable efforts to ensure that information on this website is accurate
                and up to date. However, we do not warrant that product descriptions, pricing,
                compatibility details, or other content is error-free. We reserve the right to
                correct any errors and to update information at any time without prior notice.
              </p>
            </Section>

            <Section title="9. Contact">
              <p>
                If you have questions about this Disclaimer, please contact us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a>.
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

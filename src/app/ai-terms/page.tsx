import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "AI Studio Terms of Use",
  description:
    "Terms governing your use of the PXL Creator AI Studio feature, including data handling, rate limits, and acceptable use.",
}

const LAST_UPDATED = "June 26, 2026"

export default function AiTermsPage() {
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
            <h1 className="heading-2 text-foreground">AI Studio Terms of Use</h1>
            <p className="text-small text-muted/60">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. What Is AI Studio">
              <p>
                PXL Creator AI Studio (&ldquo;Studio&rdquo;) is a feature available at{" "}
                <a href="/studio">pxlcreator.space/studio</a> that allows you to upload an image
                and receive AI-powered colour grading suggestions and preset recommendations tailored
                to your image and stated aesthetic preferences.
              </p>
              <p>
                Studio is powered by OpenAI&apos;s GPT-4o model, which performs visual analysis of
                your uploaded image. The results are processed entirely server-side by PXL Creator
                using our own colour adjustment pipeline and preset-matching algorithm.
              </p>
            </Section>

            <Section title="2. How Your Image Is Processed">
              <p>
                When you upload an image to AI Studio, the following happens:
              </p>
              <ul>
                <li>
                  Your image is resized to a maximum of 512 pixels on its longest side and
                  converted to JPEG format for transmission to OpenAI&apos;s API.
                </li>
                <li>
                  The resized thumbnail is sent to OpenAI for analysis. OpenAI processes the image
                  and returns structured colour grading data to our server.
                </li>
                <li>
                  Our server applies the colour adjustments to your original uploaded image using
                  the Sharp image processing library and generates a before/after preview.
                </li>
                <li>
                  Neither your original image nor the processed output is stored permanently on our
                  servers. Both are held in memory only for the duration of your session and
                  discarded once processing is complete.
                </li>
              </ul>
              <p>
                By using AI Studio, you consent to your image being transmitted to OpenAI for
                analysis. OpenAI&apos;s use of images submitted via API is governed by their
                Privacy Policy and API usage policies. OpenAI states that images submitted via
                the API are not used to train their models.
              </p>
            </Section>

            <Section title="3. Acceptable Use">
              <p>
                You may use AI Studio for any lawful creative, professional, or personal photography
                or videography purpose. You may <strong>not</strong> upload images that:
              </p>
              <ul>
                <li>Contain nudity, sexually explicit content, or content involving minors</li>
                <li>Depict violence, gore, or illegal activity</li>
                <li>Are intended to harass, defame, or harm any individual</li>
                <li>Violate the intellectual property rights of any third party</li>
                <li>You do not have the right to upload or process</li>
              </ul>
              <p>
                Uploading prohibited content may result in immediate termination of your account
                without refund. We reserve the right to report illegal content to relevant
                authorities.
              </p>
            </Section>

            <Section title="4. Rate Limits">
              <p>
                AI Studio is rate-limited to <strong>5 analysis requests per hour</strong> per IP
                address to ensure fair access for all users. Attempts to circumvent rate limits
                through proxies, VPNs, or automated scripts are prohibited and may result in
                your IP being blocked.
              </p>
            </Section>

            <Section title="5. Accuracy and Limitations">
              <p>
                AI Studio recommendations are generated algorithmically and are intended as a
                creative starting point, not a definitive editing prescription. Results depend on
                image quality, subject matter, lighting conditions, and the specificity of your
                prompt. PXL Creator does not guarantee that any specific aesthetic or colour profile
                will be achieved through AI Studio recommendations.
              </p>
              <p>
                If the OpenAI API is unavailable, Studio falls back to a prompt-based heuristic
                system that generates colour adjustments based on your text description only,
                without image analysis. This fallback is designed to ensure continued availability
                but may produce less accurate results.
              </p>
            </Section>

            <Section title="6. Intellectual Property of Outputs">
              <p>
                The colour-adjusted preview images generated by AI Studio are derived from your
                original uploaded image. Ownership of the output image remains with you (subject
                to any third-party rights in your original image). PXL Creator does not claim
                any ownership of images processed through AI Studio.
              </p>
            </Section>

            <Section title="7. No Warranty">
              <p>
                AI Studio is provided as a convenience feature on an &ldquo;as is&rdquo; basis.
                PXL Creator makes no warranties regarding the accuracy, completeness, or fitness
                for a particular purpose of AI Studio outputs. Reliance on AI Studio recommendations
                is at your sole risk.
              </p>
            </Section>

            <Section title="8. Changes to AI Studio">
              <p>
                We may update, modify, restrict, or discontinue AI Studio at any time without
                prior notice. Access to AI Studio is provided as an additional feature of
                pxlcreator.space and is not guaranteed to remain available.
              </p>
            </Section>

            <Section title="9. Questions">
              <p>
                For questions about AI Studio or these Terms, email us at{" "}
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
      <div className="flex flex-col gap-3 text-[0.9375rem] text-muted leading-relaxed [&_strong]:text-foreground/80 [&_strong]:font-medium [&_a]:text-gold [&_a]:hover:underline [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:marker:text-gold/50">
        {children}
      </div>
    </section>
  )
}

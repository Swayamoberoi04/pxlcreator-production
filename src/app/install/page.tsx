import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Preset Installation Guide",
  description:
    "Step-by-step instructions for installing PXL Creator presets in Lightroom Classic, Lightroom (cloud), and Lightroom Mobile.",
}

export default function InstallPage() {
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
            <h1 className="heading-2 text-foreground">Preset Installation Guide</h1>
            <p className="body-text text-muted max-w-lg">
              Follow these steps to import your PXL Creator presets into Lightroom. If you run
              into any issues, see our <a href="/troubleshooting" className="text-gold hover:underline">Troubleshooting Guide</a>.
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="Before You Begin">
              <p>
                After purchase, go to your account dashboard and download the .zip file for your
                preset pack. Save it somewhere you can find it — your Downloads folder is fine.
                Extract (unzip) the archive before proceeding. macOS and Windows both have built-in
                zip extraction: right-click the file and choose &ldquo;Extract All&rdquo; (Windows)
                or double-click it (macOS).
              </p>
              <p>
                Inside the extracted folder you will find <code>.xmp</code> preset files, and
                possibly <code>.dng</code> files for mobile import. Both are explained below.
              </p>
            </Section>

            <Section title="Option A — Lightroom Classic (Desktop)">
              <ol>
                <li>Open <strong>Adobe Lightroom Classic</strong> on your computer.</li>
                <li>Switch to the <strong>Develop</strong> module (press <code>D</code>).</li>
                <li>In the left panel, find the <strong>Presets</strong> section. Click the
                  <strong>+</strong> icon next to &ldquo;Presets&rdquo;.</li>
                <li>Select <strong>&ldquo;Import Presets&hellip;&rdquo;</strong>.</li>
                <li>Navigate to your extracted preset folder and select all the <code>.xmp</code>
                  files. On Windows, press <code>Ctrl+A</code> to select all. On macOS, press
                  <code>Cmd+A</code>.</li>
                <li>Click <strong>Import</strong>.</li>
                <li>The presets will now appear in a new folder inside your Presets panel,
                  labelled with the pack name.</li>
                <li>Open any photo and click a preset to apply it.</li>
              </ol>
              <p>
                <strong>Alternative method:</strong> You can also paste the <code>.xmp</code> files
                directly into Lightroom&apos;s presets folder on your hard drive. The folder
                location is: <code>User / AppData / Roaming / Adobe / Lightroom / Develop Presets</code>{" "}
                on Windows, or{" "}
                <code>User / Library / Application Support / Adobe / Lightroom / Develop Presets</code>{" "}
                on macOS. Restart Lightroom after pasting.
              </p>
            </Section>

            <Section title="Option B — Lightroom (cloud version, desktop)">
              <ol>
                <li>Open <strong>Adobe Lightroom</strong> (not Lightroom Classic) on your computer.</li>
                <li>Click <strong>File</strong> in the menu bar, then select{" "}
                  <strong>&ldquo;Import Profiles &amp; Presets&hellip;&rdquo;</strong>.</li>
                <li>Navigate to your extracted preset folder and select the <code>.xmp</code> files.</li>
                <li>Click <strong>Import</strong>.</li>
                <li>Your presets will appear in the <strong>Presets</strong> panel on the right
                  side of the Edit view.</li>
                <li>If you are signed into Creative Cloud, presets will sync automatically to
                  Lightroom Mobile on your phone or tablet.</li>
              </ol>
            </Section>

            <Section title="Option C — Lightroom Mobile (iOS and Android) via DNG">
              <p>
                If your preset pack includes <code>.dng</code> files, you can import them directly
                into Lightroom Mobile without needing the desktop app:
              </p>
              <ol>
                <li>Transfer the <code>.dng</code> files from your preset pack to your phone.
                  You can email them to yourself, use AirDrop (iOS), or copy them from your
                  computer via USB.</li>
                <li>Open <strong>Lightroom Mobile</strong> on your phone.</li>
                <li>Import the <code>.dng</code> files into your Lightroom Mobile library
                  as you would any photo.</li>
                <li>Open one of the imported <code>.dng</code> files.</li>
                <li>Tap the <strong>three-dot menu</strong> (top right), then tap{" "}
                  <strong>&ldquo;Create Preset&rdquo;</strong>.</li>
                <li>Name the preset and save it. It will now appear in your preset list for
                  any photo.</li>
                <li>Repeat for each <code>.dng</code> file in the pack.</li>
              </ol>
            </Section>

            <Section title="Option D — Lightroom Mobile (iOS and Android) via XMP + Desktop Sync">
              <p>
                If you have Lightroom (cloud) installed on your desktop, the easiest method for
                mobile is:
              </p>
              <ol>
                <li>Import the <code>.xmp</code> presets into Lightroom (cloud) on your desktop
                  using Option B above.</li>
                <li>Make sure you are signed into the same Adobe account on both your desktop and
                  your mobile device.</li>
                <li>Open Lightroom Mobile — presets will sync automatically via Creative Cloud
                  within a few minutes.</li>
              </ol>
            </Section>

            <Section title="Applying a Preset to Your Photo">
              <p>
                Once installed, applying a preset takes one tap or click:
              </p>
              <ul>
                <li>
                  <strong>Lightroom Classic:</strong> Open a photo in the Develop module and click
                  the preset name in the Presets panel on the left.
                </li>
                <li>
                  <strong>Lightroom (cloud, desktop):</strong> Open a photo and click the preset
                  in the Presets panel on the right side of the Edit view.
                </li>
                <li>
                  <strong>Lightroom Mobile:</strong> Open a photo, tap <strong>Presets</strong>
                  in the bottom toolbar, and tap the preset name.
                </li>
              </ul>
              <p>
                After applying, you can use the sliders to adjust the intensity or tweak
                individual settings to suit your specific photo.
              </p>
            </Section>

            <Section title="Still Stuck?">
              <p>
                If you cannot get the presets working after following these steps, see our{" "}
                <a href="/troubleshooting">Troubleshooting Guide</a> or email us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> with your
                Lightroom version and operating system and we will help you get set up.
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
      <div className="flex flex-col gap-3 text-[0.9375rem] text-muted leading-relaxed [&_strong]:text-foreground/80 [&_strong]:font-medium [&_a]:text-gold [&_a]:hover:underline [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:list-decimal [&_li]:marker:text-gold/50 [&_ul>li]:list-disc [&_code]:bg-white/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:text-foreground/70">
        {children}
      </div>
    </section>
  )
}

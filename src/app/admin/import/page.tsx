/**
 * /admin/import — YouTube import wizard
 */

import type { Metadata }       from "next"
import { PresetImporter }      from "@/components/admin/PresetImporter"

export const metadata: Metadata = { title: "Import YouTube" }

export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( YOUTUBE IMPORT )</span>
        </div>
        <h1 className="font-display font-bold text-[1.75rem] text-white/90">
          Import from YouTube
        </h1>
        <p className="text-[0.875rem] text-white/70 max-w-lg">
          Paste a YouTube video URL. The system will automatically fetch the title, thumbnail,
          description, detect the preset category, extract download links, and pre-fill all fields.
          You review and save.
        </p>
      </div>

      {/* ── How it works ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: "01", label: "Paste URL",       desc: "Any youtube.com or youtu.be link" },
          { step: "02", label: "Auto-detect",     desc: "Category, mood, links, tags"       },
          { step: "03", label: "Review & Save",   desc: "Edit fields, publish instantly"    },
        ].map(({ step, label, desc }) => (
          <div key={step} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-1.5">
            <span className="font-display font-bold text-[1.5rem] text-white/70">{step}</span>
            <span className="text-[0.875rem] font-semibold text-white/92">{label}</span>
            <span className="text-[0.75rem] text-white/70">{desc}</span>
          </div>
        ))}
      </div>

      {/* ── Import wizard ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <PresetImporter />
      </div>

    </div>
  )
}

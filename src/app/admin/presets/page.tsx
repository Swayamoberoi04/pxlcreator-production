/**
 * /admin/presets — Preset management table
 */

import type { Metadata } from "next"
import Link              from "next/link"
import { PresetTable }   from "@/components/admin/PresetTable"

export const metadata: Metadata = { title: "Presets" }

export default function AdminPresetsPage() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl w-full">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-5 bg-gold/50" />
            <span className="text-[0.7rem] text-gold/60 tracking-widest">( PRESET LIBRARY )</span>
          </div>
          <h1 className="font-display font-black text-[1.75rem] text-white/90">
            Presets
          </h1>
          <p className="text-[0.875rem] text-white/30">
            Edit, publish, and manage your preset library.
          </p>
        </div>

        <Link
          href="/admin/import"
          className="shrink-0 flex items-center gap-2 rounded-xl bg-gold text-background font-semibold px-5 py-2.5 text-[0.875rem] hover:bg-gold-dim transition-all active:scale-95"
        >
          <span>+</span>
          Import YouTube
        </Link>
      </div>

      {/* ── Table ── */}
      <PresetTable />

    </div>
  )
}

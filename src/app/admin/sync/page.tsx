"use client"

/**
 * /admin/sync — YouTube channel sync
 *
 * Crawls all videos from the configured YouTube channel and inserts
 * any new ones as presets (live, price=0, admin sets price later).
 */

import { useState, useEffect } from "react"
import Link                    from "next/link"
import { cn }                  from "@/lib/utils"

interface SyncStatus {
  channelId:     string | null
  importedCount: number
  apiKeySet:     boolean
}

interface SyncResult {
  inserted: number
  skipped:  number
  total:    number
  errors?:  string[]
}

export default function AdminSyncPage() {
  const [status,   setStatus]   = useState<SyncStatus | null>(null)
  const [result,   setResult]   = useState<SyncResult | null>(null)
  const [running,  setRunning]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/youtube-sync")
      .then((r) => r.json())
      .then((j) => { if (j.success) setStatus(j) })
      .catch(() => {})
  }, [result]) // re-fetch count after each sync

  async function handleSync() {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const res  = await fetch("/api/admin/youtube-sync", { method: "POST" })
      const json = await res.json()
      if (json.success) {
        setResult(json)
      } else {
        setError(json.error ?? "Sync failed.")
      }
    } catch {
      setError("Network error — could not reach the sync API.")
    } finally {
      setRunning(false)
    }
  }

  const canSync = !running && !!status?.channelId && status.apiKeySet

  return (
    <div className="flex flex-col gap-8 p-8 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( YOUTUBE CHANNEL SYNC )</span>
        </div>
        <h1 className="font-display font-bold text-[1.75rem] text-white/90">
          Sync Channel
        </h1>
        <p className="text-[0.875rem] text-white/70 max-w-lg">
          Scan every video on your YouTube channel and automatically create a preset
          for any video not yet in the store. New presets go live immediately — set prices
          in the Presets table afterwards.
        </p>
      </div>

      {/* ── How it works ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: "01", label: "Crawl Channel",  desc: "All videos fetched via YouTube API"   },
          { step: "02", label: "Diff DB",         desc: "Only new videos are inserted"         },
          { step: "03", label: "Live Instantly",  desc: "Set price in Presets when ready"      },
        ].map(({ step, label, desc }) => (
          <div key={step} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-1.5">
            <span className="font-display font-bold text-[1.5rem] text-white/70">{step}</span>
            <span className="text-[0.875rem] font-semibold text-white/92">{label}</span>
            <span className="text-[0.75rem] text-white/70">{desc}</span>
          </div>
        ))}
      </div>

      {/* ── Channel status ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col gap-4">
        <h2 className="text-[0.8125rem] text-white/70 tracking-widest">( Channel Status )</h2>

        {status === null ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-5 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[
              {
                label:      "Channel ID",
                value:      status.channelId ?? "—",
                ok:         !!status.channelId,
                missing:    "Set YOUTUBE_CHANNEL_ID in .env.local",
              },
              {
                label:      "YouTube API Key",
                value:      status.apiKeySet ? "Configured" : "Not set",
                ok:         status.apiKeySet,
                missing:    "Set YOUTUBE_API_KEY in .env.local",
              },
              {
                label:      "Already imported",
                value:      `${status.importedCount} preset${status.importedCount !== 1 ? "s" : ""}`,
                ok:         true,
                missing:    "",
              },
            ].map(({ label, value, ok, missing }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={ok ? "text-emerald-400" : "text-red-400/70"}>
                  {ok ? "✓" : "○"}
                </span>
                <span className="text-[0.8125rem] text-white/85 w-40 shrink-0">{label}</span>
                <span className={cn("text-[0.8125rem] font-mono", ok ? "text-white/85" : "text-white/70")}>
                  {value}
                </span>
                {!ok && missing && (
                  <span className="text-[0.7rem] text-red-400/50 ml-auto">{missing}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sync action ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[0.9375rem] font-semibold text-white/92">Run Sync Now</h2>
            <p className="text-[0.8125rem] text-white/70">
              Fetches your full channel, inserts only new videos. Safe to re-run — duplicates are skipped.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={!canSync}
            className={cn(
              "shrink-0 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[0.875rem] font-semibold transition-all",
              canSync
                ? "bg-gold text-black hover:bg-gold/90 active:scale-[0.98]"
                : "bg-white/[0.06] text-white/70 cursor-not-allowed"
            )}
          >
            {running ? <SpinIcon /> : <SyncIcon />}
            {running ? "Syncing…" : "Sync Channel"}
          </button>
        </div>

        {/* Progress note */}
        {running && (
          <div className="rounded-xl border border-gold/20 bg-gold/[0.04] px-4 py-3 text-[0.8125rem] text-gold/70">
            Crawling channel videos… this may take a few seconds depending on channel size.
          </div>
        )}

        {/* Error */}
        {error && !running && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-[0.8125rem] text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !running && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <ResultCard value={result.inserted} label="New presets" color="text-emerald-400" />
              <ResultCard value={result.skipped}  label="Already in store" color="text-white/70" />
              <ResultCard value={result.total}    label="Total on channel" color="text-gold" />
            </div>

            {result.inserted > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 text-[0.8125rem] text-emerald-400">
                {result.inserted} new preset{result.inserted !== 1 ? "s" : ""} added and live on the store.{" "}
                <Link href="/admin/presets" className="underline underline-offset-2 hover:text-emerald-300">
                  Set prices in Presets →
                </Link>
              </div>
            )}

            {result.inserted === 0 && !result.errors?.length && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[0.8125rem] text-white/70">
                All channel videos are already in the store.
              </div>
            )}

            {!!result.errors?.length && (
              <details className="rounded-xl border border-red-500/20 bg-red-500/[0.04]">
                <summary className="px-4 py-3 text-[0.8125rem] text-red-400 cursor-pointer select-none">
                  {result.errors.length} error{result.errors.length !== 1 ? "s" : ""} during sync
                </summary>
                <ul className="px-4 pb-3 flex flex-col gap-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-[0.75rem] text-red-400/60 font-mono">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ── Env setup hint ── */}
      {status && (!status.channelId || !status.apiKeySet) && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col gap-3">
          <h2 className="text-[0.8125rem] text-white/70 tracking-widest">( Setup Required )</h2>
          <p className="text-[0.8125rem] text-white/70">
            Add these to your <span className="font-mono text-white/85">.env.local</span> file, then restart the dev server:
          </p>
          <pre className="rounded-xl bg-black/40 border border-white/[0.06] px-4 py-3 text-[0.8125rem] font-mono text-white/85 overflow-x-auto">
{`YOUTUBE_API_KEY=AIza…
YOUTUBE_CHANNEL_ID=UC…`}
          </pre>
          <p className="text-[0.75rem] text-white/70">
            Get an API key at console.cloud.google.com → YouTube Data API v3.
            Find your Channel ID on your YouTube Studio › Settings › Channel page.
          </p>
        </div>
      )}

    </div>
  )
}

/* ── Sub-components ── */

function ResultCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-1">
      <span className={cn("font-display font-bold text-[2rem] leading-none", color)}>
        {value}
      </span>
      <span className="text-[0.75rem] text-white/70">( {label} )</span>
    </div>
  )
}

/* ── Icons ── */
function SyncIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <polyline points="23 20 23 14 17 14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  )
}
function SpinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

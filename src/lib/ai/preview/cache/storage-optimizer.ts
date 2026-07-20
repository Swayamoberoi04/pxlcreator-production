/**
 * src/lib/ai/preview/cache/storage-optimizer.ts
 *
 * Phase 4E — storage optimization (§7).
 *
 * Bounded, best-effort passes over the ai-previews bucket:
 *   - COMPRESS: previews above the size threshold are re-encoded
 *     (Sharp JPEG, config quality) in place
 *   - DEDUPE: byte-identical objects collapse to one canonical file;
 *     cache rows and job rows pointing at removed twins are repointed
 *   - ORPHANS: root-level objects referenced by no job and no cache row
 *     are deleted (expired-asset removal itself is owned by the Phase 4D
 *     cleanup service — untouched; this catches what slips past it)
 *   - USAGE: object count + byte total for the metrics service
 *
 * Complements — does not modify — the 4D cleanup service. Runs from the
 * admin endpoint or a cron; never in a request path.
 */

import { resolveCacheConfig, type CacheConfig } from "./config"
import { contentHash } from "./keys"

const BUCKET = "ai-previews"

export interface StorageReport {
  ran:            boolean
  objects:        number
  totalBytes:     number
  compressed:     number
  bytesSaved:     number
  deduped:        number
  orphansRemoved: number
  ms:             number
}

function supabaseAvailable(): boolean {
  if (process.env.PREVIEW_STORE?.trim().toLowerCase() === "memory") return false
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function adminClient() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  return createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
}

export async function runStorageOptimizer(
  cfg: CacheConfig = resolveCacheConfig()
): Promise<StorageReport> {
  const report: StorageReport = {
    ran: false, objects: 0, totalBytes: 0,
    compressed: 0, bytesSaved: 0, deduped: 0, orphansRemoved: 0, ms: 0,
  }
  if (!supabaseAvailable()) return report
  const started = Date.now()
  report.ran = true

  try {
    const supabase = await adminClient()

    /* ── Inventory (root level = preview assets; pending/ = payloads) ── */
    const { data: objects, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: cfg.storage.batchLimit, sortBy: { column: "created_at", order: "asc" } })
    if (error) throw error

    const files = (objects ?? []).filter((o) => o.name.includes("."))
    report.objects = files.length
    for (const f of files) {
      report.totalBytes += (f.metadata as { size?: number } | null)?.size ?? 0
    }

    const hashes = new Map<string, string>()   // contentHash → canonical path

    for (const file of files) {
      const size = (file.metadata as { size?: number } | null)?.size ?? 0
      const path = file.name

      /* Referenced anywhere? */
      const [{ data: jobRef }, { data: cacheRef }] = await Promise.all([
        supabase.from("preview_jobs").select("id").eq("preview_path", path).limit(1),
        supabase.from("preview_cache").select("cache_key").eq("preview_path", path).limit(1),
      ])
      const referenced = (jobRef?.length ?? 0) > 0 || (cacheRef?.length ?? 0) > 0

      /* ── ORPHANS ── */
      if (!referenced) {
        await supabase.storage.from(BUCKET).remove([path])
        report.orphansRemoved++
        report.totalBytes -= size
        continue
      }

      /* Download once for hash + optional compression */
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
      if (dlErr || !blob) continue
      let buffer: Buffer = Buffer.from(await blob.arrayBuffer())

      /* ── DEDUPE ── */
      const hash = contentHash(buffer)
      const canonical = hashes.get(hash)
      if (canonical && canonical !== path) {
        await supabase.from("preview_cache").update({ preview_path: canonical }).eq("preview_path", path)
        await supabase.from("preview_jobs").update({ preview_path: canonical }).eq("preview_path", path)
        await supabase.storage.from(BUCKET).remove([path])
        report.deduped++
        report.totalBytes -= size
        continue
      }
      hashes.set(hash, path)

      /* ── COMPRESS ── */
      if (size > cfg.storage.compressOverBytes && /\.(jpe?g|png|webp)$/i.test(path)) {
        try {
          const sharp = (await import("sharp")).default
          const recompressed = await sharp(buffer)
            .jpeg({ quality: cfg.storage.compressQuality, mozjpeg: true })
            .toBuffer()
          if (recompressed.length < size * 0.9) {
            const { error: upErr } = await supabase.storage
              .from(BUCKET)
              .upload(path, recompressed, { contentType: "image/jpeg", upsert: true })
            if (!upErr) {
              report.compressed++
              report.bytesSaved += size - recompressed.length
              report.totalBytes -= size - recompressed.length
              buffer = recompressed
              hashes.set(contentHash(recompressed), path)
            }
          }
        } catch { /* skip uncompressible object */ }
      }
    }
  } catch (err) {
    console.log(`[ai:cache] ${JSON.stringify({ event: "storage_optimizer_failed", error: err instanceof Error ? err.message : String(err) })}`)
  }

  report.ms = Date.now() - started
  console.log(`[ai:cache] ${JSON.stringify({ event: "storage_optimizer_ran", ...report })}`)
  return report
}

/**
 * src/lib/admin/storage.ts
 *
 * Server-side helper wrapping Supabase Storage for the Media Library.
 * Every admin upload (Media Library, and any future module's ImageUploader)
 * goes through this — one place that owns bucket naming, path layout,
 * image optimization (sharp), and the storage_assets bookkeeping row.
 *
 * Node runtime only.
 */

import "server-only"
import sharp from "sharp"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"
import { MEDIA_BUCKET, type MediaFolder } from "@/lib/admin/media-constants"

export { MEDIA_BUCKET, MEDIA_FOLDERS, type MediaFolder } from "@/lib/admin/media-constants"

type StorageAssetInsert = Database["public"]["Tables"]["storage_assets"]["Insert"]
type StorageAssetRow    = Database["public"]["Tables"]["storage_assets"]["Row"]

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif":  "gif",
}

function safeFileStem(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file"
}

export interface UploadMediaInput {
  buffer:    Buffer
  fileName:  string
  mimeType:  string
  folder:    MediaFolder | string
  altText?:  string
}

export interface UploadMediaResult {
  asset: StorageAssetRow
  publicUrl: string
}

/**
 * Upload a file into the `media` bucket, optimizing images with sharp
 * (re-encode to webp, cap max dimension at 2400px — keeps every upload
 * "optimized" per the CMS requirement without a separate manual step),
 * and record it in `storage_assets` so it's browsable in the Media Library.
 */
export async function uploadMedia(input: UploadMediaInput): Promise<UploadMediaResult> {
  const supabase = createAdminClient()
  const isImage  = input.mimeType.startsWith("image/")
  const isGif    = input.mimeType === "image/gif" // don't re-encode animated gifs

  let outBuffer = input.buffer
  let outMime   = input.mimeType
  let width: number | undefined
  let height: number | undefined

  if (isImage && !isGif) {
    const img = sharp(input.buffer, { animated: false })
    const meta = await img.metadata()
    const resized = (meta.width ?? 0) > 2400 ? img.resize({ width: 2400, withoutEnlargement: true }) : img
    outBuffer = await resized.webp({ quality: 86 }).toBuffer()
    outMime   = "image/webp"
    const outMeta = await sharp(outBuffer).metadata()
    width  = outMeta.width
    height = outMeta.height
  } else if (isImage && isGif) {
    const meta = await sharp(input.buffer).metadata()
    width  = meta.width
    height = meta.height
  }

  const ext  = isImage ? (IMAGE_MIME_TO_EXT[outMime] ?? "bin") : (input.fileName.split(".").pop() ?? "bin")
  const stem = safeFileStem(input.fileName)
  const path = `${input.folder}/${Date.now()}-${stem}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, outBuffer, { contentType: outMime, upsert: false })

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`)
  }

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const assetType = isImage ? "media_image" : input.mimeType.startsWith("video/") ? "media_video" : "media_document"

  const insert: StorageAssetInsert = {
    bucket:      MEDIA_BUCKET,
    path,
    file_name:   input.fileName,
    file_size:   outBuffer.byteLength,
    mime_type:   outMime,
    asset_type:  assetType,
    folder:      input.folder,
    alt_text:    input.altText ?? null,
    width:       width ?? null,
    height:      height ?? null,
    public_url:  publicUrl,
  }

  const { data: asset, error: insertErr } = await supabase
    .from("storage_assets")
    .insert(insert)
    .select()
    .single()

  if (insertErr || !asset) {
    // Roll back the storage object so we never leak an orphaned file.
    await supabase.storage.from(MEDIA_BUCKET).remove([path])
    throw new Error(`Failed to record media asset: ${insertErr?.message ?? "unknown error"}`)
  }

  return { asset, publicUrl }
}

/** Delete a media asset — removes both the storage object and the DB row. */
export async function deleteMedia(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: asset } = await supabase
    .from("storage_assets")
    .select("bucket, path")
    .eq("id", id)
    .single()

  if (asset) {
    await supabase.storage.from(asset.bucket).remove([asset.path])
  }
  await supabase.from("storage_assets").delete().eq("id", id)
}

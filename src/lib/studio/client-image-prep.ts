/**
 * src/lib/studio/client-image-prep.ts
 *
 * Browser-only image normalization run before every AI Studio upload.
 *
 * Why this exists: Vercel Serverless Functions enforce a hard ~4.5MB
 * request-body ceiling ahead of any Next.js code — a limit our own
 * MAX_FILE_SIZE check in route.ts never gets a chance to enforce or
 * even see, because the platform rejects the request first. A typical
 * modern phone photo (4-10MB) exceeds that ceiling outright. Shrinking
 * the image in the browser before it's ever sent is the only fix that
 * works regardless of hosting platform.
 *
 * Pipeline: decode (auto EXIF-rotating) -> downscale to <=1024px on the
 * longest edge -> re-encode as JPEG ~82% quality. A typical phone photo
 * lands well under 500KB after this, independent of the original size.
 */

const MAX_EDGE      = 1024
const JPEG_QUALITY  = 0.82

export interface PreparedImage {
  file:          File
  width:         number
  height:        number
  originalBytes: number
  finalBytes:    number
}

export async function prepareImageForUpload(source: File): Promise<PreparedImage> {
  const bitmap = await decodeWithOrientation(source)

  try {
    const { width, height } = scaleToFit(bitmap.width, bitmap.height, MAX_EDGE)

    const canvas = document.createElement("canvas")
    canvas.width  = width
    canvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context unavailable")
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob    = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY)
    const outFile = new File([blob], toJpegName(source.name), { type: "image/jpeg" })

    return {
      file:          outFile,
      width,
      height,
      originalBytes: source.size,
      finalBytes:    outFile.size,
    }
  } finally {
    bitmap.close()
  }
}

/**
 * imageOrientation: "from-image" applies EXIF rotation during decode —
 * without it, phone photos taken in portrait frequently decode sideways.
 * Falls back to a plain decode on the rare engine that rejects the option.
 */
async function decodeWithOrientation(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    return await createImageBitmap(file)
  }
}

function scaleToFit(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Canvas encoding failed"))
    }, type, quality)
  })
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "")
  return `${base || "photo"}.jpg`
}

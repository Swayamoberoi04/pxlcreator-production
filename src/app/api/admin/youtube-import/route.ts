/**
 * POST /api/admin/youtube-import
 *
 * Fetches a YouTube video and parses its metadata into a preset entry.
 * Returns a pre-filled preset object for admin review — does NOT save to DB.
 * The admin reviews/edits the data in the UI, then calls POST /api/admin/presets to save.
 *
 * Body: { url: string }
 */

import type { NextRequest }      from "next/server"
import { extractVideoId, fetchYouTubeVideo } from "@/lib/youtube/api"
import { parseYouTubePreset }    from "@/lib/youtube/parser"
import { getCategories }         from "@/lib/presets/repository"
import { requireAdmin }          from "@/lib/admin/guard"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const body = await request.json()
    const { url } = body ?? {}

    if (!url || typeof url !== "string") {
      return Response.json(
        { success: false, error: "A YouTube URL is required." },
        { status: 400 }
      )
    }

    // Extract video ID
    const videoId = extractVideoId(url)
    if (!videoId) {
      return Response.json(
        { success: false, error: "Could not extract a valid YouTube video ID from the URL." },
        { status: 400 }
      )
    }

    // Check if YouTube API is configured
    if (!process.env.YOUTUBE_API_KEY) {
      // Return a stub response so admin can still manually fill in the form
      return Response.json({
        success: true,
        warning: "YOUTUBE_API_KEY is not set — returning stub data for manual entry.",
        data: {
          title:          "Untitled Preset",
          slug:           `preset-${videoId}`,
          tagline:        "",
          category:       "Cinematic",
          categorySlug:   "cinematic",
          mood:           null,
          tone:           null,
          downloadUrl:    null,
          allLinks:       [],
          aiTags:         [],
          thumbnailUrl:   `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          youtubeVideoId: videoId,
          youtubeUrl:     `https://www.youtube.com/watch?v=${videoId}`,
          description:    "",
          features:       [],
          presetType:     "lightroom",
        },
      })
    }

    // Fetch from YouTube API
    const videoData = await fetchYouTubeVideo(videoId)

    // Parse into preset data
    const parsed = parseYouTubePreset(videoData)

    // Fetch categories so admin UI can show the matched category name
    const categories = await getCategories()
    const matchedCategory = categories.find((c) => c.slug === parsed.categorySlug)

    return Response.json({
      success: true,
      data: {
        ...parsed,
        categoryId:   matchedCategory?.id ?? null,
        categories,             // all categories for the dropdown
        rawTitle:     videoData.title,
        rawDesc:      videoData.description,
        publishedAt:  videoData.publishedAt,
        channelId:    videoData.channelId,
        viewCount:    videoData.viewCount,
        likeCount:    videoData.likeCount,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

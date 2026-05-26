/**
 * src/lib/youtube/api.ts
 *
 * YouTube Data API v3 client.
 * Fetches video metadata from a YouTube URL or video ID.
 *
 * Requires: YOUTUBE_API_KEY in .env.local
 * Docs: https://developers.google.com/youtube/v3/docs/videos/list
 */

/* ── Types ──────────────────────────────────────────────── */

export interface YouTubeThumbnail {
  url:    string
  width:  number
  height: number
}

export interface YouTubeSnippet {
  publishedAt:          string
  channelId:            string
  channelTitle:         string
  title:                string
  description:          string
  thumbnails: {
    default?:  YouTubeThumbnail
    medium?:   YouTubeThumbnail
    high?:     YouTubeThumbnail
    standard?: YouTubeThumbnail
    maxres?:   YouTubeThumbnail
  }
  tags:                 string[] | undefined
  categoryId:           string
  defaultLanguage:      string | undefined
}

export interface YouTubeStatistics {
  viewCount:     string
  likeCount:     string
  commentCount:  string
}

export interface YouTubeVideoItem {
  id:         string
  snippet:    YouTubeSnippet
  statistics: YouTubeStatistics
}

export interface YouTubeVideoData {
  videoId:     string
  title:       string
  description: string
  channelId:   string
  channelTitle: string
  publishedAt: string
  thumbnail:   string   // best available thumbnail URL
  tags:        string[]
  viewCount:   number
  likeCount:   number
}

/* ── Video ID extraction ─────────────────────────────────── */

/**
 * Extracts the YouTube video ID from any supported URL format.
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - VIDEO_ID (bare ID, 11 chars)
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim()

  // Try each pattern
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,             // watch?v=
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,         // youtu.be/
    /\/embed\/([a-zA-Z0-9_-]{11})/,           // /embed/
    /\/shorts\/([a-zA-Z0-9_-]{11})/,          // /shorts/
    /^([a-zA-Z0-9_-]{11})$/,                  // bare ID
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

/* ── API fetch ───────────────────────────────────────────── */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

/**
 * Fetches full video metadata from the YouTube Data API v3.
 * Throws if the API key is missing, the video is not found, or the request fails.
 */
export async function fetchYouTubeVideo(videoId: string): Promise<YouTubeVideoData> {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    throw new Error(
      "YOUTUBE_API_KEY is not set in .env.local. " +
      "Get a key at: https://console.cloud.google.com → YouTube Data API v3"
    )
  }

  const url = new URL(`${YOUTUBE_API_BASE}/videos`)
  url.searchParams.set("id",   videoId)
  url.searchParams.set("part", "snippet,statistics")
  url.searchParams.set("key",  apiKey)

  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
    next:    { revalidate: 3600 },   // cache for 1 hour
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`YouTube API error ${response.status}: ${text}`)
  }

  const json = await response.json()

  if (!json.items || json.items.length === 0) {
    throw new Error(`No YouTube video found with ID: ${videoId}`)
  }

  const item: YouTubeVideoItem = json.items[0]
  const { snippet, statistics } = item

  // Pick the best thumbnail (maxres → standard → high → medium → default)
  const thumb =
    snippet.thumbnails.maxres?.url  ??
    snippet.thumbnails.standard?.url ??
    snippet.thumbnails.high?.url    ??
    snippet.thumbnails.medium?.url  ??
    snippet.thumbnails.default?.url ??
    ""

  return {
    videoId,
    title:        snippet.title,
    description:  snippet.description,
    channelId:    snippet.channelId,
    channelTitle: snippet.channelTitle,
    publishedAt:  snippet.publishedAt,
    thumbnail:    thumb,
    tags:         snippet.tags ?? [],
    viewCount:    parseInt(statistics.viewCount  ?? "0", 10),
    likeCount:    parseInt(statistics.likeCount  ?? "0", 10),
  }
}

/**
 * Fetches ALL video IDs from a channel, following pagination tokens.
 * Capped at 500 to prevent runaway quota usage.
 */
export async function fetchAllChannelVideoIds(channelId: string): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set.")

  const allIds: string[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${YOUTUBE_API_BASE}/search`)
    url.searchParams.set("channelId",  channelId)
    url.searchParams.set("part",       "id")
    url.searchParams.set("type",       "video")
    url.searchParams.set("order",      "date")
    url.searchParams.set("maxResults", "50")
    url.searchParams.set("key",        apiKey)
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const response = await fetch(url.toString())
    if (!response.ok) throw new Error(`YouTube search API error ${response.status}`)

    const json = await response.json()

    for (const item of json.items ?? []) {
      if (item.id?.videoId) allIds.push(item.id.videoId as string)
    }

    pageToken = json.nextPageToken as string | undefined
  } while (pageToken && allIds.length < 500)

  return allIds
}

/**
 * Fetches full snippet+statistics for multiple video IDs in one API call.
 * Processes in chunks of 50 (the API limit per request).
 */
export async function fetchVideoBatch(videoIds: string[]): Promise<YouTubeVideoData[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey || videoIds.length === 0) return []

  const results: YouTubeVideoData[] = []

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50)

    const url = new URL(`${YOUTUBE_API_BASE}/videos`)
    url.searchParams.set("id",   chunk.join(","))
    url.searchParams.set("part", "snippet,statistics")
    url.searchParams.set("key",  apiKey)

    const response = await fetch(url.toString())
    if (!response.ok) continue

    const json = await response.json()

    for (const item of json.items ?? []) {
      const { snippet, statistics } = item as YouTubeVideoItem
      const thumb =
        snippet.thumbnails.maxres?.url   ??
        snippet.thumbnails.standard?.url ??
        snippet.thumbnails.high?.url     ??
        snippet.thumbnails.medium?.url   ??
        snippet.thumbnails.default?.url  ??
        ""

      results.push({
        videoId:      item.id as string,
        title:        snippet.title,
        description:  snippet.description,
        channelId:    snippet.channelId,
        channelTitle: snippet.channelTitle,
        publishedAt:  snippet.publishedAt,
        thumbnail:    thumb,
        tags:         snippet.tags ?? [],
        viewCount:    parseInt(statistics.viewCount  ?? "0", 10),
        likeCount:    parseInt(statistics.likeCount  ?? "0", 10),
      })
    }
  }

  return results
}

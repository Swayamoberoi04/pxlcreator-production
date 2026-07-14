/**
 * GET /api/ai/styles
 *
 * Returns all available StyleProfiles.
 * Used by the UI to populate the style selector and by the AI system
 * to understand the available aesthetic vocabulary.
 *
 * Response is a pure data endpoint — no authentication required.
 * Cache-Control: 1 hour (profiles rarely change).
 */

import { getAllStyleProfiles } from "@/lib/studio/style-profiles"

export const runtime = "nodejs"

export function GET(): Response {
  const profiles = getAllStyleProfiles()

  /* Strip the full analysisTemplate from the public response —
     it's internal engine data, not needed by the client. */
  const publicProfiles = profiles.map(({ analysisTemplate: _at, ...rest }) => rest)

  return Response.json(
    { success: true, profiles: publicProfiles, count: publicProfiles.length },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } }
  )
}

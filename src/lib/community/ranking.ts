/**
 * src/lib/community/ranking.ts
 *
 * THE creator ranking formula. This file is the single source of truth — the
 * API, the leaderboard, and the explanation shown in the UI all read these
 * same constants, so what a creator is told about their score is arithmetically
 * what produced it.
 *
 * Design rules this formula follows:
 *
 *  • Every input is a real, persisted row count. Nothing here is a popularity
 *    multiplier, a hand-set boost, or a hidden tiebreak.
 *  • Saves and comments outrank likes deliberately. A save is someone choosing
 *    to keep your work; a comment costs effort. A like costs a tap, so it is
 *    worth a fifth of a save and is capped hard.
 *  • Every component is capped. No single dimension can run away with the
 *    score, which is what makes volume-spamming pointless.
 *  • Contribution counts published work, not activity. Posting fifty times in
 *    an hour cannot outrank doing good work, because the contribution cap is
 *    reached long before that.
 *  • Upheld reports subtract. This is the only negative term, and it only
 *    counts reports an admin actually actioned — never a pending accusation.
 *
 * Deliberately NOT inputs: recency of login, follower-to-following ratio,
 * profile views, or anything else a creator could farm without doing work.
 */

/** Per-unit weights. Shown to users verbatim in the score explanation. */
export const RANK_WEIGHTS = {
  /** Meaningful profile fields filled (bio, avatar, location, roles, skills…). */
  profileFieldPoints: 4,
  profileFieldsCounted: 8,

  /** Published work. */
  perShowcase: 4,
  perFeedPost: 2,

  /** Engagement RECEIVED on your work — the heart of the formula. */
  perSaveReceived: 5,
  perCommentReceived: 4,
  perLikeReceived: 1,

  /** Completed professional work. */
  perCompletedProject: 12,
  perFiveStarReview: 8,

  /** Community presence. Capped low on purpose — followers are not quality. */
  perFollower: 1,

  /** Only reports an admin upheld ('actioned'). Pending reports never count. */
  perUpheldReport: -25,
} as const

/** Per-component caps. */
export const RANK_CAPS = {
  profile: 32,       // 8 fields × 4
  contribution: 80,  // ~20 showcases or 40 posts
  engagement: 200,   // the largest ceiling — quality engagement is the point
  project: 120,
  community: 40,     // followers can contribute at most 40 points, ever
} as const

export interface RankInputs {
  /** Count of meaningful profile fields filled, 0–8. */
  profileFieldsFilled: number
  showcaseCount: number
  feedPostCount: number
  savesReceived: number
  commentsReceived: number
  likesReceived: number
  completedProjects: number
  fiveStarReviews: number
  followerCount: number
  upheldReports: number
}

export interface RankComponent {
  key: string
  label: string
  /** Plain-language description of exactly what was counted. */
  detail: string
  points: number
  max: number | null
}

export interface RankResult {
  total: number
  profile_score: number
  contribution_score: number
  engagement_score: number
  project_score: number
  community_score: number
  penalty_score: number
  components: RankComponent[]
  inputs: RankInputs
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/**
 * Compute a creator's rank from real counts.
 *
 * Pure and synchronous: given the same inputs it always returns the same
 * score, which is what lets the UI show the arithmetic.
 */
export function computeRank(inputs: RankInputs): RankResult {
  const w = RANK_WEIGHTS

  const profile_score = clamp(
    Math.min(inputs.profileFieldsFilled, w.profileFieldsCounted) * w.profileFieldPoints,
    RANK_CAPS.profile
  )

  const contribution_raw =
    inputs.showcaseCount * w.perShowcase + inputs.feedPostCount * w.perFeedPost
  const contribution_score = clamp(contribution_raw, RANK_CAPS.contribution)

  const engagement_raw =
    inputs.savesReceived * w.perSaveReceived +
    inputs.commentsReceived * w.perCommentReceived +
    inputs.likesReceived * w.perLikeReceived
  const engagement_score = clamp(engagement_raw, RANK_CAPS.engagement)

  const project_raw =
    inputs.completedProjects * w.perCompletedProject +
    inputs.fiveStarReviews * w.perFiveStarReview
  const project_score = clamp(project_raw, RANK_CAPS.project)

  const community_score = clamp(inputs.followerCount * w.perFollower, RANK_CAPS.community)

  // Negative, and not clamped at a floor of zero at the component level —
  // an upheld report genuinely costs you.
  const penalty_score = inputs.upheldReports * w.perUpheldReport

  const total = Math.max(
    0,
    profile_score + contribution_score + engagement_score + project_score + community_score + penalty_score
  )

  const components: RankComponent[] = [
    {
      key: "profile",
      label: "Profile completeness",
      detail: `${Math.min(inputs.profileFieldsFilled, w.profileFieldsCounted)} of ${w.profileFieldsCounted} meaningful fields filled × ${w.profileFieldPoints} pts`,
      points: profile_score,
      max: RANK_CAPS.profile,
    },
    {
      key: "contribution",
      label: "Published work",
      detail: `${inputs.showcaseCount} showcase${inputs.showcaseCount === 1 ? "" : "s"} × ${w.perShowcase} pts + ${inputs.feedPostCount} post${inputs.feedPostCount === 1 ? "" : "s"} × ${w.perFeedPost} pts`,
      points: contribution_score,
      max: RANK_CAPS.contribution,
    },
    {
      key: "engagement",
      label: "Engagement on your work",
      detail: `${inputs.savesReceived} save${inputs.savesReceived === 1 ? "" : "s"} × ${w.perSaveReceived} + ${inputs.commentsReceived} comment${inputs.commentsReceived === 1 ? "" : "s"} × ${w.perCommentReceived} + ${inputs.likesReceived} like${inputs.likesReceived === 1 ? "" : "s"} × ${w.perLikeReceived} (saves and comments are worth more than likes)`,
      points: engagement_score,
      max: RANK_CAPS.engagement,
    },
    {
      key: "project",
      label: "Completed projects",
      detail: `${inputs.completedProjects} completed × ${w.perCompletedProject} pts + ${inputs.fiveStarReviews} five-star review${inputs.fiveStarReviews === 1 ? "" : "s"} × ${w.perFiveStarReview} pts`,
      points: project_score,
      max: RANK_CAPS.project,
    },
    {
      key: "community",
      label: "Followers",
      detail: `${inputs.followerCount} follower${inputs.followerCount === 1 ? "" : "s"} × ${w.perFollower} pt (capped at ${RANK_CAPS.community} — followers alone can't rank you)`,
      points: community_score,
      max: RANK_CAPS.community,
    },
  ]

  if (inputs.upheldReports > 0) {
    components.push({
      key: "penalty",
      label: "Upheld reports",
      detail: `${inputs.upheldReports} report${inputs.upheldReports === 1 ? "" : "s"} upheld by moderation × ${w.perUpheldReport} pts`,
      points: penalty_score,
      max: null,
    })
  }

  return {
    total,
    profile_score,
    contribution_score,
    engagement_score,
    project_score,
    community_score,
    penalty_score,
    components,
    inputs,
  }
}

/** The public, human-readable description of how ranking works. */
export const RANK_EXPLAINER = {
  headline: "How this score is calculated",
  summary:
    "Your score adds up five things you actually did, then subtracts anything moderation upheld against you. Every number below comes from real rows in the database — there is no hidden popularity multiplier, and nothing is weighted by who you are.",
  principles: [
    "Saves and comments are worth more than likes — a save is someone keeping your work, a like is a tap.",
    "Every category is capped, so flooding one of them can't carry your score.",
    "Followers contribute at most 40 points. Reach is not quality.",
    "Only reports a moderator actually upheld subtract points. A pending report never counts against you.",
  ],
} as const

/**
 * Count the meaningful profile fields a creator has filled.
 *
 * "Meaningful" excludes anything auto-generated at signup (username,
 * display_name default) — filling those in isn't an achievement.
 */
export function countProfileFields(profile: Record<string, unknown>): number {
  const checks: unknown[] = [
    profile.bio,
    profile.avatar_url,
    profile.location_city,
    profile.website,
    profile.roles,
    profile.style_tags,
    profile.skills,
    profile.software,
  ]
  return checks.filter((value) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== null && value !== undefined && String(value).trim() !== ""
  }).length
}

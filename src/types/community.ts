/**
 * src/types/community.ts
 *
 * Complete TypeScript type system for the PXL Creator Community Ecosystem.
 * Mirrors the 012_community_schema.sql migration.
 */

/* ── Creator role catalogue ──────────────────────────────────────────────────── */
export const CREATOR_ROLES = [
  { id: "photographer",        label: "Photographer",         icon: "📷", color: "#ffd700" },
  { id: "lightroom-editor",    label: "Lightroom Editor",     icon: "🎨", color: "#f59e0b" },
  { id: "color-grader",        label: "Color Grader",         icon: "🎬", color: "#8b5cf6" },
  { id: "cinematographer",     label: "Cinematographer",      icon: "🎥", color: "#06b6d4" },
  { id: "videographer",        label: "Videographer",         icon: "📽", color: "#ec4899" },
  { id: "filmmaker",           label: "Filmmaker",            icon: "🎞", color: "#f97316" },
  { id: "short-film-maker",    label: "Short Film Maker",     icon: "🎭", color: "#10b981" },
  { id: "vlogger",             label: "Vlogger",              icon: "📱", color: "#e1306c" },
  { id: "drone-operator",      label: "Drone Operator",       icon: "🚁", color: "#0ea5e9" },
  { id: "retoucher",           label: "Retoucher",            icon: "✏️",  color: "#a78bfa" },
  { id: "content-creator",     label: "Content Creator",      icon: "✨", color: "#fb7185" },
  { id: "thumbnail-designer",  label: "Thumbnail Designer",   icon: "🖼", color: "#4ade80" },
  { id: "preset-creator",      label: "Preset Creator",       icon: "⚡", color: "#ffd700" },
] as const

export type CreatorRoleId = (typeof CREATOR_ROLES)[number]["id"]

/* ── Skill / availability enums ──────────────────────────────────────────────── */
export type SkillLevel    = "beginner" | "intermediate" | "advanced" | "professional"
export type Availability  = "open_for_work" | "open_for_collab" | "hiring" | "unavailable"
export type ChannelVisibility = "public" | "private"
export type PostType      = "text" | "image" | "video" | "link" | "poll"
export type WorkType      = "remote" | "on_site" | "hybrid"
export type BudgetType    = "fixed" | "hourly" | "negotiable"
export type ProjectStatus = "open" | "in_progress" | "closed"
export type ApplicationStatus = "pending" | "accepted" | "declined" | "withdrawn"
export type ShowcaseType  = "photo" | "video" | "before_after" | "reel" | "short_film"
export type ReactionType  = "like" | "love" | "fire" | "insightful" | "clap"
export type NotificationType =
  | "follow" | "connection_req" | "connection_acc"
  | "channel_invite" | "post_reply" | "post_like"
  | "mention" | "project_application" | "application_accepted"
  | "badge_earned"
export type EventType  = "challenge" | "contest" | "meetup" | "workshop" | "webinar"
export type EventStatus = "upcoming" | "active" | "ended"
export type ConnectionStatus = "pending" | "accepted" | "declined"
export type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned"

/* ── Community profile ───────────────────────────────────────────────────────── */
export interface CommunityProfile {
  id:               string
  firebase_uid:     string
  username:         string
  display_name:     string
  bio:              string
  avatar_url:       string | null
  banner_url:       string | null
  location_city:    string | null
  location_country: string | null
  website:          string | null
  instagram_url:    string | null
  youtube_url:      string | null
  behance_url:      string | null
  portfolio_url:    string | null
  roles:            string[]
  skill_level:      SkillLevel
  availability:     Availability
  follower_count:   number
  following_count:  number
  post_count:       number
  showcase_count:   number
  reputation_score: number
  is_verified:      boolean
  is_premium:       boolean
  created_at:       string
  updated_at:       string
}

export type CommunityProfileInsert = Pick<CommunityProfile,
  "firebase_uid" | "username" | "display_name"
> & Partial<Omit<CommunityProfile, "id" | "firebase_uid" | "username" | "display_name" | "follower_count" | "following_count" | "post_count" | "showcase_count" | "reputation_score" | "is_verified" | "is_premium" | "created_at" | "updated_at">>

export type CommunityProfileUpdate = Partial<Pick<CommunityProfile,
  "display_name" | "bio" | "avatar_url" | "banner_url" |
  "location_city" | "location_country" | "website" |
  "instagram_url" | "youtube_url" | "behance_url" | "portfolio_url" |
  "roles" | "skill_level" | "availability"
>>

/* ── Follow / connection ─────────────────────────────────────────────────────── */
export interface CreatorFollow {
  id:            string
  follower_uid:  string
  following_uid: string
  created_at:    string
}

export interface CreatorConnection {
  id:            string
  requester_uid: string
  recipient_uid: string
  status:        ConnectionStatus
  message:       string | null
  created_at:    string
  updated_at:    string
}

/* ── Channel ─────────────────────────────────────────────────────────────────── */
export interface CommunityChannel {
  id:               string
  slug:             string
  name:             string
  description:      string
  long_description: string | null
  banner_url:       string | null
  icon:             string | null
  category:         string
  visibility:       ChannelVisibility
  owner_uid:        string
  moderator_uids:   string[]
  tags:             string[]
  member_count:     number
  post_count:       number
  is_featured:      boolean
  is_verified:      boolean
  rules:            string | null
  created_at:       string
  updated_at:       string
}

export type ChannelWithMeta = CommunityChannel & {
  is_member:   boolean
  owner?:      Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
}

/* ── Channel post ────────────────────────────────────────────────────────────── */
export interface ChannelPost {
  id:            string
  channel_id:    string
  author_uid:    string
  title:         string | null
  body:          string
  post_type:     PostType
  media_urls:    string[]
  link_url:      string | null
  hashtags:      string[]
  is_pinned:     boolean
  is_locked:     boolean
  is_removed:    boolean
  like_count:    number
  comment_count: number
  view_count:    number
  created_at:    string
  updated_at:    string
}

export type PostWithMeta = ChannelPost & {
  author?:        Pick<CommunityProfile, "username" | "display_name" | "avatar_url" | "is_verified">
  user_reaction?: ReactionType | null
  top_comments?:  CommentWithMeta[]
}

/* ── Comment ─────────────────────────────────────────────────────────────────── */
export interface PostComment {
  id:         string
  post_id:    string
  author_uid: string
  parent_id:  string | null
  body:       string
  is_removed: boolean
  like_count: number
  created_at: string
  updated_at: string
}

export type CommentWithMeta = PostComment & {
  author?: Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
  replies?: CommentWithMeta[]
}

/* ── Project listing ─────────────────────────────────────────────────────────── */
export interface ProjectListing {
  id:               string
  poster_uid:       string
  title:            string
  description:      string
  category:         string
  work_type:        WorkType
  location_city:    string | null
  location_country: string | null
  budget_min_usd:   number | null
  budget_max_usd:   number | null
  budget_type:      BudgetType
  deadline:         string | null
  skills_needed:    string[]
  status:           ProjectStatus
  applicant_count:  number
  view_count:       number
  is_featured:      boolean
  created_at:       string
  updated_at:       string
}

export type ProjectWithMeta = ProjectListing & {
  poster?:         Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
  has_applied?:    boolean
}

/* ── Project application ─────────────────────────────────────────────────────── */
export interface ProjectApplication {
  id:             string
  project_id:     string
  applicant_uid:  string
  cover_letter:   string | null
  portfolio_link: string | null
  status:         ApplicationStatus
  created_at:     string
  updated_at:     string
}

/* ── Showcase ────────────────────────────────────────────────────────────────── */
export interface ShowcaseItem {
  id:             string
  author_uid:     string
  title:          string
  description:    string | null
  item_type:      ShowcaseType
  media_urls:     string[]
  before_url:     string | null
  after_url:      string | null
  thumbnail_url:  string | null
  category:       string
  software_used:  string[]
  hashtags:       string[]
  like_count:     number
  comment_count:  number
  bookmark_count: number
  view_count:     number
  is_featured:    boolean
  is_removed:     boolean
  created_at:     string
  updated_at:     string
}

export type ShowcaseWithMeta = ShowcaseItem & {
  author?:     Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
  is_liked?:   boolean
  is_bookmarked?: boolean
}

/* ── Notification ────────────────────────────────────────────────────────────── */
export interface CommunityNotification {
  id:            string
  recipient_uid: string
  actor_uid:     string | null
  type:          NotificationType
  title:         string
  body:          string | null
  resource_type: string | null
  resource_id:   string | null
  is_read:       boolean
  created_at:    string
}

/* ── Event ───────────────────────────────────────────────────────────────────── */
export interface CommunityEvent {
  id:                string
  organiser_uid:     string
  title:             string
  description:       string
  event_type:        EventType
  banner_url:        string | null
  start_date:        string
  end_date:          string | null
  location:          string | null
  is_online:         boolean
  prizes:            { rank: number; prize: string }[] | null
  rules:             string | null
  participant_count: number
  status:            EventStatus
  is_featured:       boolean
  created_at:        string
  updated_at:        string
}

/* ── Badge ───────────────────────────────────────────────────────────────────── */
export interface CommunityBadge {
  id:          string
  slug:        string
  name:        string
  description: string
  icon:        string
  color:       string
  award_type:  "auto" | "manual"
}

export interface UserEarnedBadge {
  id:           string
  firebase_uid: string
  badge_id:     string
  awarded_at:   string
  badge?:       CommunityBadge
}

/* ── Channel categories ──────────────────────────────────────────────────────── */
export const CHANNEL_CATEGORIES = [
  { id: "photography",    label: "Photography",     icon: "📷" },
  { id: "cinematography", label: "Cinematography",  icon: "🎥" },
  { id: "editing",        label: "Editing",         icon: "🎨" },
  { id: "travel",         label: "Travel",          icon: "✈️"  },
  { id: "fashion",        label: "Fashion",         icon: "👗" },
  { id: "food",           label: "Food",            icon: "🍜" },
  { id: "lifestyle",      label: "Lifestyle",       icon: "🌿" },
  { id: "business",       label: "Business",        icon: "💼" },
  { id: "other",          label: "Other",           icon: "✨" },
] as const

/* ── Project categories ──────────────────────────────────────────────────────── */
export const PROJECT_CATEGORIES = [
  { id: "photography",   label: "Photography" },
  { id: "videography",   label: "Videography" },
  { id: "editing",       label: "Editing" },
  { id: "color_grading", label: "Color Grading" },
  { id: "motion",        label: "Motion Graphics" },
  { id: "thumbnail",     label: "Thumbnail Design" },
  { id: "social_media",  label: "Social Media" },
  { id: "other",         label: "Other" },
] as const

/* ── API response shapes ─────────────────────────────────────────────────────── */
export interface ProfileResponse {
  profile:         CommunityProfile
  badges:          UserEarnedBadge[]
  is_following:    boolean
  is_connected:    boolean
  connection_status: ConnectionStatus | null
}

export interface ChannelFeedResponse {
  channel:    ChannelWithMeta
  posts:      PostWithMeta[]
  page:       number
  has_more:   boolean
}

export interface SearchResponse {
  profiles: CommunityProfile[]
  channels: CommunityChannel[]
  projects: ProjectWithMeta[]
  total:    number
}

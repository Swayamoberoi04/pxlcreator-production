/**
 * src/types/community.ts
 *
 * Complete TypeScript type system for the PXL Creator Community Ecosystem.
 * Mirrors the 012_community_schema.sql migration.
 */

/* ── Creator role catalogue ──────────────────────────────────────────────────── */
export const CREATOR_ROLES = [
  { id: "photographer",        label: "Photographer",         icon: "📷", color: "#FFD60A" },
  { id: "lightroom-editor",    label: "Lightroom Editor",     icon: "🎨", color: "#f59e0b" },
  { id: "color-grader",        label: "Color Grader",         icon: "🎬", color: "#8b5cf6" },
  { id: "cinematographer",     label: "Cinematographer",      icon: "🎥", color: "#06b6d4" },
  { id: "videographer",        label: "Videographer",         icon: "📽", color: "#ec4899" },
  { id: "filmmaker",           label: "Filmmaker",            icon: "🎞", color: "#f97316" },
  { id: "short-film-maker",    label: "Short Film Maker",     icon: "🎭", color: "#10b981" },
  { id: "vlogger",             label: "Vlogger",              icon: "📱", color: "#e1306c" },
  { id: "drone-operator",      label: "Drone Operator",       icon: "🚁", color: "#0ea5e9" },
  { id: "retoucher",           label: "Retoucher",            icon: "🖌",  color: "#a78bfa" },
  { id: "content-creator",     label: "Content Creator",      icon: "✨", color: "#fb7185" },
  { id: "thumbnail-designer",  label: "Thumbnail Designer",   icon: "🖼", color: "#4ade80" },
  { id: "preset-creator",      label: "Preset Creator",       icon: "⚡", color: "#FFD60A" },
] as const

export type CreatorRoleId = (typeof CREATOR_ROLES)[number]["id"]

/**
 * The live filter vocabulary, served from the `creator_tags` table via
 * GET /api/community/tags. `CREATOR_ROLES` above is kept only as the
 * offline fallback used when the tags table is unreachable — Discover and
 * every other filter UI reads the database, never the array.
 */
export interface CreatorTag {
  id:         string
  kind:       "role" | "style"
  label:      string
  icon:       string
  color:      string
  sort_order: number
}

/* ── Skill / availability enums ──────────────────────────────────────────────── */
export type SkillLevel    = "beginner" | "intermediate" | "advanced" | "professional"
export type Availability  = "open_for_work" | "open_for_collab" | "hiring" | "unavailable"
export type ChannelVisibility = "public" | "private"
/** public = listed in Discover; followers = full profile only for followers; private = unlisted */
export type ProfileVisibility = "public" | "followers" | "private"
export type PostType      = "text" | "image" | "video" | "link" | "poll"
export type WorkType      = "remote" | "on_site" | "hybrid"
export type BudgetType    = "fixed" | "hourly" | "negotiable"
export type ProjectStatus = "open" | "in_progress" | "closed" | "completed"
/** Project application lifecycle (Phase 5.4). Distinct from CollabStatus/ConnectionStatus below. */
export type ApplicationStatus = "pending" | "shortlisted" | "accepted" | "rejected" | "withdrawn" | "closed"
export type ProjectVisibility = "public" | "private"
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
  /** Aesthetic / subject tags — creator_tags where kind = 'style' */
  style_tags:       string[]
  /** Tools + specialities — free-form, e.g. "Lightroom", "DaVinci Resolve" */
  skills:           string[]
  skill_level:      SkillLevel
  availability:     Availability
  visibility:       ProfileVisibility
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
  "roles" | "style_tags" | "skills" | "skill_level" | "availability" | "visibility"
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

/* ── Channel post ─────────────────────────────────────────────────────────────
 * channel_id: null = a main-feed post (Phase 5.3); set = a post inside that
 * channel (migration 012, unchanged). Both share every other column, reactions,
 * comments, and moderation path — see migration 045's header comment.
 * ──────────────────────────────────────────────────────────────────────────── */
export type ContentKind =
  | "text" | "photography" | "cinematography" | "before_after"
  | "editing_breakdown" | "lightroom_recipe" | "preset_showcase" | "ai_assisted"

export const CONTENT_KINDS: { id: ContentKind; label: string; icon: string }[] = [
  { id: "photography",       label: "Photography",        icon: "📷" },
  { id: "cinematography",    label: "Cinematography",     icon: "🎥" },
  { id: "before_after",      label: "Before / After",     icon: "↔️" },
  { id: "editing_breakdown", label: "Editing Breakdown",  icon: "🧩" },
  { id: "lightroom_recipe",  label: "Lightroom Recipe",   icon: "🎛️" },
  { id: "preset_showcase",   label: "Preset Showcase",    icon: "⚡" },
  { id: "ai_assisted",       label: "AI-Assisted",        icon: "✨" },
  { id: "text",              label: "Text / Update",      icon: "💬" },
]

export type PostVisibility = "public" | "followers"

export interface ChannelPost {
  id:            string
  channel_id:    string | null
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
  content_kind:  ContentKind
  ai_assisted:   boolean
  save_count:    number
  share_count:   number
  visibility:    PostVisibility
  created_at:    string
  updated_at:    string
}

/** A feed post is exactly a ChannelPost with channel_id === null. */
export type FeedPost = ChannelPost & { channel_id: null }

export interface PostMedia {
  id:         string
  post_id:    string
  media_url:  string
  media_type: "image" | "video"
  role:       "before" | "after" | null
  position:   number
  created_at: string
}

export type PostWithMeta = ChannelPost & {
  author?:        Pick<CommunityProfile, "username" | "display_name" | "avatar_url" | "is_verified">
  user_reaction?: ReactionType | null
  user_saved?:    boolean
  user_shared?:   boolean
  media?:         PostMedia[]
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
  /** Role/style tag ids from the creator_tags vocabulary — distinct from skills_needed (free-text). */
  tags:             string[]
  visibility:       ProjectVisibility
  closed_at:        string | null
  created_at:       string
  updated_at:       string
}

export type ProjectWithMeta = ProjectListing & {
  poster?:         Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
  has_applied?:    boolean
  is_owner?:       boolean
}

/* ── Project application ─────────────────────────────────────────────────────── */
export interface ProjectApplication {
  id:             string
  project_id:     string
  applicant_uid:  string
  cover_letter:   string | null
  portfolio_link: string | null
  status:         ApplicationStatus
  /** Private to the project owner — never sent to the applicant. */
  reviewer_note:  string | null
  reviewed_at:    string | null
  created_at:     string
  updated_at:     string
}

export type ApplicationWithMeta = ProjectApplication & {
  applicant?: Pick<CommunityProfile, "username" | "display_name" | "avatar_url" | "is_verified" | "roles" | "skill_level">
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
  /** Real client-work linkage to a PXL project — null does not mean "no client", see client_name. */
  project_id:     string | null
  /** Free-text client credit for work outside PXL's project system. */
  client_name:    string | null
  visibility:     "public" | "private"
  enquiry_count:  number
  created_at:     string
  updated_at:     string
}

export type ShowcaseWithMeta = ShowcaseItem & {
  author?:     Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
  is_liked?:   boolean
  is_bookmarked?: boolean
  is_owner?:   boolean
  project?:    Pick<ProjectListing, "id" | "title"> | null
}

/* ── Showcase enquiry (Phase 5.4) ──────────────────────────────────────────────
 * Real, persisted professional contact request — never fabricated. Only the
 * showcase owner can list these (see GET /api/community/showcase/[id]/enquiries).
 * ──────────────────────────────────────────────────────────────────────────── */
export interface ShowcaseEnquiry {
  id:            string
  showcase_id:   string
  enquirer_uid:  string
  message:       string
  contact_email: string | null
  status:        "new" | "responded" | "closed"
  created_at:    string
}

export type ShowcaseEnquiryWithMeta = ShowcaseEnquiry & {
  enquirer?: Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
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

/* ── Featured Creator (external "Inspiration" entity) ─────────────────────────
 * NOT a PXL member: no firebase_uid, cannot be followed, never rendered on a
 * /community/[username] page or presented as though the person joined PXL.
 * See migration 044 comment for the full rationale.
 * ──────────────────────────────────────────────────────────────────────────── */
export interface FeaturedCreator {
  id:          string
  name:        string
  handle:      string | null
  bio:         string
  avatar_url:  string | null
  source_url:  string
  platform:    string
  role_tags:   string[]
  style_tags:  string[]
  sort_order:  number
  is_active:   boolean
  created_at:  string
  updated_at:  string
}

/** Discriminated union so any "creator card" list can safely mix real PXL
 * members with external inspiration entities without ever conflating them. */
export type DiscoverCard =
  | { kind: "member";   profile: CommunityProfile }
  | { kind: "featured"; creator: FeaturedCreator }

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
  { id: "travel",         label: "Travel",          icon: "✈ï¸"  },
  { id: "fashion",        label: "Fashion",         icon: "👗" },
  { id: "food",           label: "Food",            icon: "ðŸœ" },
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EXPANSION TYPES — migration 013
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* ── Community Space ─────────────────────────────────────────────────────────── */
export interface CommunitySpace {
  id:             string
  slug:           string
  name:           string
  description:    string
  icon:           string
  category:       string
  color:          string
  is_featured:    boolean
  member_count:   number
  message_count:  number
  moderator_uids: string[]
  is_locked:      boolean
  display_order:  number
  created_at:     string
  /* joined via API */
  is_member?:     boolean
}

/* ── Space Message ───────────────────────────────────────────────────────────── */
export interface SpaceMessage {
  id:             string
  space_id:       string
  author_uid:     string
  body:           string
  reply_to_id:    string | null
  reply_preview:  string | null
  mentions:       string[]
  media_url:      string | null
  is_pinned:      boolean
  is_removed:     boolean
  reaction_count: number
  created_at:     string
  edited_at:      string | null
  /* joined */
  author?:        Pick<CommunityProfile, "username" | "display_name" | "avatar_url" | "is_verified">
  user_reacted?:  boolean
  user_emoji?:    string | null
}

/* ── Collaboration Request ───────────────────────────────────────────────────── */
export type CollabType    = "paid_work" | "collaboration" | "internship" | "team_building"
export type CollabStatus  = "pending" | "accepted" | "declined" | "withdrawn"

export interface CollabRequest {
  id:            string
  requester_uid: string
  recipient_uid: string
  collab_type:   CollabType
  role_needed:   string
  message:       string
  budget:        string | null
  project_brief: string | null
  status:        CollabStatus
  created_at:    string
  updated_at:    string
  /* joined */
  requester?:    Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
  recipient?:    Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
}

/* ── Team ────────────────────────────────────────────────────────────────────── */
export interface CommunityTeam {
  id:           string
  name:         string
  description:  string
  avatar_url:   string | null
  banner_url:   string | null
  owner_uid:    string
  category:     string
  tags:         string[]
  visibility:   "public" | "invite_only"
  member_count: number
  is_hiring:    boolean
  roles_needed: string[]
  created_at:   string
  updated_at:   string
  /* joined */
  is_member?:   boolean
  my_role?:     string | null
}

export interface TeamMember {
  id:           string
  team_id:      string
  firebase_uid: string
  role:         string
  custom_title: string | null
  joined_at:    string
  profile?:     Pick<CommunityProfile, "username" | "display_name" | "avatar_url" | "is_verified" | "roles">
}

export interface TeamInvite {
  id:           string
  team_id:      string
  inviter_uid:  string
  invitee_uid:  string
  role:         string
  custom_title: string | null
  message:      string | null
  status:       string
  expires_at:   string
  created_at:   string
  team?:        Pick<CommunityTeam, "name" | "avatar_url" | "category">
  inviter?:     Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
}

/* ── Project Review ──────────────────────────────────────────────────────────── */
export interface ProjectReview {
  id:               string
  project_id:       string
  reviewer_uid:     string
  reviewee_uid:     string
  rating:           number
  body:             string | null
  communication:    number | null
  quality:          number | null
  professionalism:  number | null
  on_time:          boolean | null
  would_work_again: boolean | null
  created_at:       string
  reviewer?:        Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
}

/* ── Creator Resource ────────────────────────────────────────────────────────── */
export interface CreatorResource {
  id:            string
  title:         string
  description:   string
  url:           string
  category:      string
  icon:          string
  is_featured:   boolean
  display_order: number
}

/* ── Event Registration / Submission ─────────────────────────────────────────── */
export interface EventRegistration {
  id:            string
  event_id:      string
  firebase_uid:  string
  registered_at: string
}

export interface EventSubmission {
  id:           string
  event_id:     string
  firebase_uid: string
  title:        string
  description:  string | null
  media_url:    string
  media_type:   string
  vote_count:   number
  is_winner:    boolean
  winner_rank:  number | null
  created_at:   string
  author?:      Pick<CommunityProfile, "username" | "display_name" | "avatar_url">
}

/* ── Available For / Looking For constants ───────────────────────────────────── */
export const AVAILABLE_FOR = [
  { id: "paid_work",       label: "Paid Work",       color: "#FFD60A" },
  { id: "collaboration",   label: "Collaboration",   color: "#06b6d4" },
  { id: "internship",      label: "Internship",      color: "#10b981" },
  { id: "team_building",   label: "Team Building",   color: "#8b5cf6" },
] as const

export const SOFTWARE_LIST = [
  "Lightroom", "Photoshop", "Premiere Pro", "After Effects",
  "DaVinci Resolve", "Final Cut Pro", "Capture One",
  "Luminar", "ON1 Photo RAW", "Affinity Photo",
] as const

export const EQUIPMENT_LIST = [
  "Sony A7 Series", "Canon R Series", "Nikon Z Series",
  "DJI Drone", "GoPro", "iPhone Pro", "Samsung Galaxy",
  "Rode Microphone", "Zhiyun Gimbal", "DJI RS Series",
] as const



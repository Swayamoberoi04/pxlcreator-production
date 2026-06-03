-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 012 — PXL Creator Community Ecosystem
--
-- Creates 18 tables powering the full creator network:
--   community_profiles, creator_follows, creator_connections,
--   community_channels, channel_members, channel_posts, post_comments,
--   post_reactions, project_listings, project_applications,
--   showcase_items, showcase_reactions, community_notifications,
--   community_events, community_badges, user_earned_badges,
--   content_reports, direct_message_threads, direct_messages
--
-- All tables use firebase_uid (text) as the user identifier.
-- RLS enabled on every table — service role only (we verify Firebase server-side).
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

/* ── 1. community_profiles ───────────────────────────────────────────────────── */
create table if not exists public.community_profiles (
  id               uuid        primary key default gen_random_uuid(),
  firebase_uid     text        not null unique,
  username         text        not null unique,
  display_name     text        not null default '',
  bio              text        default '',
  avatar_url       text,
  banner_url       text,
  location_city    text,
  location_country text,
  website          text,
  instagram_url    text,
  youtube_url      text,
  behance_url      text,
  portfolio_url    text,

  -- Role tags (array of strings from CREATOR_ROLES)
  roles            text[]      not null default '{}',
  -- Skill level: beginner | intermediate | advanced | professional
  skill_level      text        not null default 'beginner',
  -- Availability: open_for_work | open_for_collab | hiring | unavailable
  availability     text        not null default 'unavailable',

  -- Counters (denormalised for performance)
  follower_count   integer     not null default 0,
  following_count  integer     not null default 0,
  post_count       integer     not null default 0,
  showcase_count   integer     not null default 0,

  -- Reputation
  reputation_score integer     not null default 0,
  is_verified      boolean     not null default false,
  is_premium       boolean     not null default false,

  -- Full-text search vector
  search_vector    tsvector,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- FTS index
create index if not exists idx_community_profiles_fts
  on public.community_profiles using gin(search_vector);

-- Update search vector on insert/update
create or replace function public.update_profile_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.username, '')),     'A') ||
    setweight(to_tsvector('english', coalesce(new.bio, '')),          'B') ||
    setweight(to_tsvector('english', coalesce(new.location_city, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.roles, ' ')), 'B');
  return new;
end;
$$;

drop trigger if exists trg_profile_search_vector on public.community_profiles;
create trigger trg_profile_search_vector
  before insert or update on public.community_profiles
  for each row execute function public.update_profile_search_vector();

drop trigger if exists trg_community_profiles_updated_at on public.community_profiles;
create trigger trg_community_profiles_updated_at
  before update on public.community_profiles
  for each row execute function public.set_updated_at();

create index if not exists idx_community_profiles_uid
  on public.community_profiles (firebase_uid);
create index if not exists idx_community_profiles_username
  on public.community_profiles (username);
create index if not exists idx_community_profiles_availability
  on public.community_profiles (availability)
  where availability != 'unavailable';

/* ── 2. creator_follows ──────────────────────────────────────────────────────── */
create table if not exists public.creator_follows (
  id           uuid        primary key default gen_random_uuid(),
  follower_uid text        not null,   -- who is following
  following_uid text       not null,   -- who is being followed
  created_at   timestamptz not null default now(),
  unique(follower_uid, following_uid)
);

create index if not exists idx_follows_follower on public.creator_follows (follower_uid);
create index if not exists idx_follows_following on public.creator_follows (following_uid);

/* ── 3. creator_connections ──────────────────────────────────────────────────── */
-- LinkedIn-style connection requests
create table if not exists public.creator_connections (
  id           uuid        primary key default gen_random_uuid(),
  requester_uid text       not null,
  recipient_uid text       not null,
  -- pending | accepted | declined
  status       text        not null default 'pending',
  message      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(requester_uid, recipient_uid)
);

create index if not exists idx_connections_requester on public.creator_connections (requester_uid);
create index if not exists idx_connections_recipient on public.creator_connections (recipient_uid);

drop trigger if exists trg_connections_updated_at on public.creator_connections;
create trigger trg_connections_updated_at
  before update on public.creator_connections
  for each row execute function public.set_updated_at();

/* ── 4. community_channels ───────────────────────────────────────────────────── */
create table if not exists public.community_channels (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique,
  name            text        not null,
  description     text        not null default '',
  long_description text,
  banner_url      text,
  icon            text,                           -- emoji or URL
  -- category: photography | cinematography | editing | travel | fashion | food | lifestyle | business | other
  category        text        not null default 'other',
  -- public | private
  visibility      text        not null default 'public',
  owner_uid       text        not null,
  moderator_uids  text[]      not null default '{}',
  tags            text[]      not null default '{}',
  member_count    integer     not null default 1,
  post_count      integer     not null default 0,
  is_featured     boolean     not null default false,
  is_verified     boolean     not null default false,
  rules           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_channels_slug   on public.community_channels (slug);
create index if not exists idx_channels_owner  on public.community_channels (owner_uid);
create index if not exists idx_channels_category on public.community_channels (category);
create index if not exists idx_channels_featured on public.community_channels (is_featured)
  where is_featured = true;

drop trigger if exists trg_channels_updated_at on public.community_channels;
create trigger trg_channels_updated_at
  before update on public.community_channels
  for each row execute function public.set_updated_at();

/* ── 5. channel_members ──────────────────────────────────────────────────────── */
create table if not exists public.channel_members (
  id           uuid        primary key default gen_random_uuid(),
  channel_id   uuid        not null references public.community_channels(id) on delete cascade,
  firebase_uid text        not null,
  -- member | moderator | owner
  role         text        not null default 'member',
  joined_at    timestamptz not null default now(),
  unique(channel_id, firebase_uid)
);

create index if not exists idx_channel_members_channel on public.channel_members (channel_id);
create index if not exists idx_channel_members_uid     on public.channel_members (firebase_uid);

/* ── 6. channel_posts ────────────────────────────────────────────────────────── */
create table if not exists public.channel_posts (
  id            uuid        primary key default gen_random_uuid(),
  channel_id    uuid        not null references public.community_channels(id) on delete cascade,
  author_uid    text        not null,
  title         text,
  body          text        not null,
  -- text | image | video | link | poll
  post_type     text        not null default 'text',
  media_urls    text[]      not null default '{}',
  link_url      text,
  hashtags      text[]      not null default '{}',
  is_pinned     boolean     not null default false,
  is_locked     boolean     not null default false,
  is_removed    boolean     not null default false,
  like_count    integer     not null default 0,
  comment_count integer     not null default 0,
  view_count    integer     not null default 0,
  -- full-text search
  search_vector tsvector,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_posts_channel   on public.channel_posts (channel_id, created_at desc);
create index if not exists idx_posts_author    on public.channel_posts (author_uid);
create index if not exists idx_posts_pinned    on public.channel_posts (channel_id, is_pinned)
  where is_pinned = true;
create index if not exists idx_posts_fts       on public.channel_posts using gin(search_vector);

drop trigger if exists trg_posts_updated_at on public.channel_posts;
create trigger trg_posts_updated_at
  before update on public.channel_posts
  for each row execute function public.set_updated_at();

/* ── 7. post_comments ────────────────────────────────────────────────────────── */
create table if not exists public.post_comments (
  id           uuid        primary key default gen_random_uuid(),
  post_id      uuid        not null references public.channel_posts(id) on delete cascade,
  author_uid   text        not null,
  parent_id    uuid        references public.post_comments(id) on delete cascade, -- for nested replies
  body         text        not null,
  is_removed   boolean     not null default false,
  like_count   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_comments_post   on public.post_comments (post_id, created_at);
create index if not exists idx_comments_parent on public.post_comments (parent_id);
create index if not exists idx_comments_author on public.post_comments (author_uid);

drop trigger if exists trg_comments_updated_at on public.post_comments;
create trigger trg_comments_updated_at
  before update on public.post_comments
  for each row execute function public.set_updated_at();

/* ── 8. post_reactions ───────────────────────────────────────────────────────── */
create table if not exists public.post_reactions (
  id           uuid        primary key default gen_random_uuid(),
  post_id      uuid        references public.channel_posts(id) on delete cascade,
  comment_id   uuid        references public.post_comments(id) on delete cascade,
  firebase_uid text        not null,
  -- like | love | fire | insightful | clap
  reaction     text        not null default 'like',
  created_at   timestamptz not null default now(),
  -- can react to post OR comment, not both
  constraint reactions_one_target check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  unique(post_id, firebase_uid),
  unique(comment_id, firebase_uid)
);

create index if not exists idx_reactions_post    on public.post_reactions (post_id);
create index if not exists idx_reactions_comment on public.post_reactions (comment_id);
create index if not exists idx_reactions_uid     on public.post_reactions (firebase_uid);

/* ── 9. project_listings ─────────────────────────────────────────────────────── */
create table if not exists public.project_listings (
  id              uuid        primary key default gen_random_uuid(),
  poster_uid      text        not null,
  title           text        not null,
  description     text        not null,
  -- photography | videography | editing | color_grading | motion | other
  category        text        not null default 'other',
  -- remote | on_site | hybrid
  work_type       text        not null default 'remote',
  location_city   text,
  location_country text,
  budget_min_usd  numeric,
  budget_max_usd  numeric,
  -- fixed | hourly | negotiable
  budget_type     text        not null default 'negotiable',
  deadline        date,
  skills_needed   text[]      not null default '{}',
  -- open | in_progress | closed
  status          text        not null default 'open',
  applicant_count integer     not null default 0,
  view_count      integer     not null default 0,
  is_featured     boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_projects_poster   on public.project_listings (poster_uid);
create index if not exists idx_projects_category on public.project_listings (category, status);
create index if not exists idx_projects_status   on public.project_listings (status, created_at desc);

drop trigger if exists trg_projects_updated_at on public.project_listings;
create trigger trg_projects_updated_at
  before update on public.project_listings
  for each row execute function public.set_updated_at();

/* ── 10. project_applications ────────────────────────────────────────────────── */
create table if not exists public.project_applications (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.project_listings(id) on delete cascade,
  applicant_uid text       not null,
  cover_letter text,
  portfolio_link text,
  -- pending | accepted | declined | withdrawn
  status       text        not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(project_id, applicant_uid)
);

create index if not exists idx_applications_project   on public.project_applications (project_id);
create index if not exists idx_applications_applicant on public.project_applications (applicant_uid);

drop trigger if exists trg_applications_updated_at on public.project_applications;
create trigger trg_applications_updated_at
  before update on public.project_applications
  for each row execute function public.set_updated_at();

/* ── 11. showcase_items ──────────────────────────────────────────────────────── */
create table if not exists public.showcase_items (
  id              uuid        primary key default gen_random_uuid(),
  author_uid      text        not null,
  title           text        not null,
  description     text,
  -- photo | video | before_after | reel | short_film
  item_type       text        not null default 'photo',
  media_urls      text[]      not null default '{}',
  before_url      text,
  after_url       text,
  thumbnail_url   text,
  category        text        not null default 'other',
  software_used   text[]      not null default '{}',
  hashtags        text[]      not null default '{}',
  like_count      integer     not null default 0,
  comment_count   integer     not null default 0,
  bookmark_count  integer     not null default 0,
  view_count      integer     not null default 0,
  is_featured     boolean     not null default false,
  is_removed      boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_showcase_author   on public.showcase_items (author_uid, created_at desc);
create index if not exists idx_showcase_featured on public.showcase_items (is_featured, created_at desc)
  where is_featured = true;
create index if not exists idx_showcase_category on public.showcase_items (category, created_at desc);

drop trigger if exists trg_showcase_updated_at on public.showcase_items;
create trigger trg_showcase_updated_at
  before update on public.showcase_items
  for each row execute function public.set_updated_at();

/* ── 12. showcase_reactions ──────────────────────────────────────────────────── */
create table if not exists public.showcase_reactions (
  id            uuid        primary key default gen_random_uuid(),
  showcase_id   uuid        not null references public.showcase_items(id) on delete cascade,
  firebase_uid  text        not null,
  -- like | bookmark
  reaction      text        not null default 'like',
  created_at    timestamptz not null default now(),
  unique(showcase_id, firebase_uid, reaction)
);

create index if not exists idx_showcase_reactions_item on public.showcase_reactions (showcase_id);
create index if not exists idx_showcase_reactions_uid  on public.showcase_reactions (firebase_uid);

/* ── 13. community_notifications ─────────────────────────────────────────────── */
create table if not exists public.community_notifications (
  id            uuid        primary key default gen_random_uuid(),
  recipient_uid text        not null,
  actor_uid     text,                             -- who triggered it (null = system)
  -- follow | connection_req | connection_acc | channel_invite | post_reply
  -- post_like | mention | project_application | application_accepted | badge_earned
  type          text        not null,
  title         text        not null,
  body          text,
  -- link to the resource that triggered it
  resource_type text,
  resource_id   uuid,
  is_read       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifs_recipient on public.community_notifications (recipient_uid, created_at desc);
create index if not exists idx_notifs_unread    on public.community_notifications (recipient_uid, is_read)
  where is_read = false;

/* ── 14. community_events ────────────────────────────────────────────────────── */
create table if not exists public.community_events (
  id              uuid        primary key default gen_random_uuid(),
  organiser_uid   text        not null,
  title           text        not null,
  description     text        not null,
  -- challenge | contest | meetup | workshop | webinar
  event_type      text        not null default 'challenge',
  banner_url      text,
  start_date      timestamptz not null,
  end_date        timestamptz,
  location        text,
  is_online       boolean     not null default true,
  prizes          jsonb,      -- [{rank: 1, prize: "..."}, ...]
  rules           text,
  participant_count integer   not null default 0,
  status          text        not null default 'upcoming', -- upcoming | active | ended
  is_featured     boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_events_status on public.community_events (status, start_date);

drop trigger if exists trg_events_updated_at on public.community_events;
create trigger trg_events_updated_at
  before update on public.community_events
  for each row execute function public.set_updated_at();

/* ── 15. community_badges ────────────────────────────────────────────────────── */
create table if not exists public.community_badges (
  id          uuid    primary key default gen_random_uuid(),
  slug        text    not null unique,
  name        text    not null,
  description text    not null,
  icon        text    not null,   -- emoji
  color       text    not null default '#ffd700',
  -- auto | manual
  award_type  text    not null default 'manual'
);

-- Seed default badges
insert into public.community_badges (slug, name, description, icon, color, award_type) values
  ('verified-creator',  'Verified Creator',   'Identity verified by PXL team',             '✓',  '#ffd700', 'manual'),
  ('top-photographer',  'Top Photographer',   '50+ showcase photos with 4.5★+ rating',     '📷',  '#f59e0b', 'auto'),
  ('top-editor',        'Top Editor',         '50+ colour-graded works shared',             '🎨',  '#8b5cf6', 'auto'),
  ('mentor',            'Mentor',             'Completed 10+ mentorship sessions',          '🎓',  '#10b981', 'manual'),
  ('rising-creator',    'Rising Creator',     'Gained 100+ followers in 30 days',          '🚀',  '#06b6d4', 'auto'),
  ('community-leader',  'Community Leader',   'Owns a channel with 500+ active members',   '👑',  '#ffd700', 'auto'),
  ('collab-champion',   'Collab Champion',    'Completed 5+ collaborations',               '🤝',  '#ec4899', 'auto'),
  ('early-adopter',     'Early Adopter',      'Joined during the first 90 days',           '⚡',  '#ffd700', 'manual')
on conflict (slug) do nothing;

/* ── 16. user_earned_badges ──────────────────────────────────────────────────── */
create table if not exists public.user_earned_badges (
  id           uuid        primary key default gen_random_uuid(),
  firebase_uid text        not null,
  badge_id     uuid        not null references public.community_badges(id) on delete cascade,
  awarded_at   timestamptz not null default now(),
  awarded_by   text,                              -- admin UID or NULL for auto
  unique(firebase_uid, badge_id)
);

create index if not exists idx_user_badges_uid on public.user_earned_badges (firebase_uid);

/* ── 17. content_reports ─────────────────────────────────────────────────────── */
create table if not exists public.content_reports (
  id            uuid        primary key default gen_random_uuid(),
  reporter_uid  text        not null,
  -- post | comment | showcase | profile | channel | project
  target_type   text        not null,
  target_id     uuid        not null,
  reason        text        not null,
  details       text,
  -- pending | reviewed | dismissed | actioned
  status        text        not null default 'pending',
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_reports_status on public.content_reports (status, created_at desc);
create index if not exists idx_reports_target on public.content_reports (target_type, target_id);

/* ── 18. direct_message_threads + messages ────────────────────────────────────── */
create table if not exists public.dm_threads (
  id              uuid        primary key default gen_random_uuid(),
  participant_a   text        not null,
  participant_b   text        not null,
  last_message_at timestamptz not null default now(),
  last_message    text,
  unread_a        integer     not null default 0,
  unread_b        integer     not null default 0,
  created_at      timestamptz not null default now(),
  unique(participant_a, participant_b)
);

create index if not exists idx_dm_threads_a on public.dm_threads (participant_a, last_message_at desc);
create index if not exists idx_dm_threads_b on public.dm_threads (participant_b, last_message_at desc);

create table if not exists public.direct_messages (
  id           uuid        primary key default gen_random_uuid(),
  thread_id    uuid        not null references public.dm_threads(id) on delete cascade,
  sender_uid   text        not null,
  body         text        not null,
  media_url    text,
  is_read      boolean     not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_dms_thread on public.direct_messages (thread_id, created_at);

/* ── RLS: service-role only on all tables ─────────────────────────────────────── */
do $$
declare t text;
begin
  foreach t in array array[
    'community_profiles', 'creator_follows', 'creator_connections',
    'community_channels', 'channel_members', 'channel_posts',
    'post_comments', 'post_reactions', 'project_listings',
    'project_applications', 'showcase_items', 'showcase_reactions',
    'community_notifications', 'community_events', 'community_badges',
    'user_earned_badges', 'content_reports', 'dm_threads', 'direct_messages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

comment on schema public is 'PXL Creator — community ecosystem tables added in migration 012';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 013 — Community Ecosystem Expansion
--
-- New tables:
--   community_spaces, community_messages, community_message_reactions,
--   community_space_members, collaboration_requests,
--   community_teams, community_team_members, community_team_invites,
--   project_reviews, creator_resources,
--   event_registrations, event_submissions
--
-- Altered tables:
--   community_profiles  — add skills, languages, equipment, software
--   project_listings    — add status flow (open→in_progress→completed)
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. Enhance community_profiles ───────────────────────────────────────────── */
alter table public.community_profiles
  add column if not exists skills       text[] not null default '{}',
  add column if not exists languages    text[] not null default '{}',
  add column if not exists equipment    text[] not null default '{}',
  add column if not exists software     text[] not null default '{}',
  add column if not exists hired_count  integer not null default 0,
  add column if not exists review_avg   numeric(3,2),
  add column if not exists review_count integer not null default 0,
  add column if not exists available_for text[] not null default '{}',
  add column if not exists looking_for  text[] not null default '{}';

/* ── 2. community_spaces — 8 fixed professional chat rooms ────────────────────── */
create table if not exists public.community_spaces (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  name          text        not null,
  description   text        not null,
  icon          text        not null,
  category      text        not null,
  color         text        not null default '#ffd700',
  is_featured   boolean     not null default false,
  member_count  integer     not null default 0,
  message_count integer     not null default 0,
  moderator_uids text[]     not null default '{}',
  is_locked     boolean     not null default false,
  display_order integer     not null default 0,
  created_at    timestamptz not null default now()
);

-- Seed the 8 professional spaces
insert into public.community_spaces (slug, name, description, icon, category, color, is_featured, display_order) values
  ('photography',        'Photography',              'Landscapes, portraits, street, wildlife — all genres welcome', '📷', 'photography',   '#ffd700', true,  1),
  ('lightroom-editing',  'Lightroom & Editing',      'Presets, colour theory, workflow tips, Lightroom mastery',    '🎨', 'editing',       '#f59e0b', true,  2),
  ('cinematography',     'Cinematography',           'Lens choices, lighting, camera movement, visual storytelling', '🎥', 'film',          '#8b5cf6', true,  3),
  ('filmmaking',         'Filmmaking',               'Pre-production, direction, short films, feature projects',    '🎞', 'film',          '#ec4899', false, 4),
  ('color-grading',      'Color Grading',            'DaVinci Resolve, LUTs, skin tones, cinematic grades',        '🌈', 'editing',       '#06b6d4', true,  5),
  ('content-youtube',    'Content Creation & YouTube','YouTube strategy, thumbnails, growth, monetisation',        '▶',  'content',       '#FF0000', false, 6),
  ('travel-vlogging',    'Travel & Vlogging',        'Travel tips, gear for travel, vlog editing, storytelling',   '✈',  'travel',        '#10b981', false, 7),
  ('gear-tech',          'Gear & Tech',              'Camera gear, lenses, drones, software, reviews, deals',      '⚙',  'tech',          '#64748b', false, 8)
on conflict (slug) do nothing;

/* ── 3. community_messages ────────────────────────────────────────────────────── */
create table if not exists public.community_messages (
  id              uuid        primary key default gen_random_uuid(),
  space_id        uuid        not null references public.community_spaces(id) on delete cascade,
  author_uid      text        not null,
  body            text        not null check (char_length(body) between 1 and 2000),
  -- reply_to: reference to another message in the same space
  reply_to_id     uuid        references public.community_messages(id) on delete set null,
  reply_preview   text,       -- cached excerpt of the quoted message for display
  -- mentions: array of firebase_uids mentioned in this message
  mentions        text[]      not null default '{}',
  media_url       text,
  is_pinned       boolean     not null default false,
  is_removed      boolean     not null default false,
  reaction_count  integer     not null default 0,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz
);

create index if not exists idx_messages_space    on public.community_messages (space_id, created_at desc);
create index if not exists idx_messages_author   on public.community_messages (author_uid);
create index if not exists idx_messages_pinned   on public.community_messages (space_id, is_pinned)
  where is_pinned = true;

/* ── 4. community_message_reactions ──────────────────────────────────────────── */
create table if not exists public.community_message_reactions (
  id           uuid        primary key default gen_random_uuid(),
  message_id   uuid        not null references public.community_messages(id) on delete cascade,
  firebase_uid text        not null,
  emoji        text        not null default '👍',
  created_at   timestamptz not null default now(),
  unique(message_id, firebase_uid, emoji)
);

create index if not exists idx_msg_reactions_msg on public.community_message_reactions (message_id);

/* ── 5. community_space_members ──────────────────────────────────────────────── */
create table if not exists public.community_space_members (
  id           uuid        primary key default gen_random_uuid(),
  space_id     uuid        not null references public.community_spaces(id) on delete cascade,
  firebase_uid text        not null,
  -- member | moderator
  role         text        not null default 'member',
  joined_at    timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  unique(space_id, firebase_uid)
);

create index if not exists idx_space_members_space on public.community_space_members (space_id);
create index if not exists idx_space_members_uid   on public.community_space_members (firebase_uid);

/* ── 6. collaboration_requests ────────────────────────────────────────────────── */
create table if not exists public.collaboration_requests (
  id             uuid        primary key default gen_random_uuid(),
  requester_uid  text        not null,
  recipient_uid  text        not null,
  -- What the requester is offering/looking for
  collab_type    text        not null, -- 'paid_work'|'collaboration'|'internship'|'team_building'
  role_needed    text        not null, -- 'photographer'|'editor'|'colorist'|etc
  message        text        not null check (char_length(message) between 10 and 1000),
  budget         text,
  project_brief  text,
  -- pending | accepted | declined | withdrawn
  status         text        not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(requester_uid, recipient_uid, collab_type)
);

create index if not exists idx_collab_requester on public.collaboration_requests (requester_uid);
create index if not exists idx_collab_recipient on public.collaboration_requests (recipient_uid, status);

drop trigger if exists trg_collab_updated_at on public.collaboration_requests;
create trigger trg_collab_updated_at
  before update on public.collaboration_requests
  for each row execute function public.set_updated_at();

/* ── 7. community_teams ───────────────────────────────────────────────────────── */
create table if not exists public.community_teams (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  description   text        not null default '',
  avatar_url    text,
  banner_url    text,
  owner_uid     text        not null,
  -- film | photography | content | design | other
  category      text        not null default 'other',
  tags          text[]      not null default '{}',
  -- public | invite_only
  visibility    text        not null default 'invite_only',
  member_count  integer     not null default 1,
  is_hiring     boolean     not null default false,
  roles_needed  text[]      not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_teams_owner    on public.community_teams (owner_uid);
create index if not exists idx_teams_hiring   on public.community_teams (is_hiring)
  where is_hiring = true;

drop trigger if exists trg_teams_updated_at on public.community_teams;
create trigger trg_teams_updated_at
  before update on public.community_teams
  for each row execute function public.set_updated_at();

/* ── 8. community_team_members ────────────────────────────────────────────────── */
create table if not exists public.community_team_members (
  id           uuid        primary key default gen_random_uuid(),
  team_id      uuid        not null references public.community_teams(id) on delete cascade,
  firebase_uid text        not null,
  -- owner | admin | member
  role         text        not null default 'member',
  custom_title text,        -- e.g. "Lead Colorist"
  joined_at    timestamptz not null default now(),
  unique(team_id, firebase_uid)
);

create index if not exists idx_team_members_team on public.community_team_members (team_id);
create index if not exists idx_team_members_uid  on public.community_team_members (firebase_uid);

/* ── 9. community_team_invites ────────────────────────────────────────────────── */
create table if not exists public.community_team_invites (
  id           uuid        primary key default gen_random_uuid(),
  team_id      uuid        not null references public.community_teams(id) on delete cascade,
  inviter_uid  text        not null,
  invitee_uid  text        not null,
  role         text        not null default 'member',
  custom_title text,
  message      text,
  -- pending | accepted | declined | expired
  status       text        not null default 'pending',
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now(),
  unique(team_id, invitee_uid)
);

create index if not exists idx_invites_invitee on public.community_team_invites (invitee_uid, status);
create index if not exists idx_invites_team    on public.community_team_invites (team_id);

/* ── 10. project_reviews ──────────────────────────────────────────────────────── */
create table if not exists public.project_reviews (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references public.project_listings(id) on delete cascade,
  reviewer_uid    text        not null,  -- who wrote the review
  reviewee_uid    text        not null,  -- who is being reviewed
  rating          integer     not null check (rating between 1 and 5),
  body            text,
  -- qualities rated
  communication   integer     check (communication between 1 and 5),
  quality         integer     check (quality between 1 and 5),
  professionalism integer     check (professionalism between 1 and 5),
  on_time         boolean,
  would_work_again boolean,
  created_at      timestamptz not null default now(),
  unique(project_id, reviewer_uid)
);

create index if not exists idx_reviews_project  on public.project_reviews (project_id);
create index if not exists idx_reviews_reviewee on public.project_reviews (reviewee_uid);

/* ── 11. creator_resources ────────────────────────────────────────────────────── */
create table if not exists public.creator_resources (
  id          uuid    primary key default gen_random_uuid(),
  title       text    not null,
  description text    not null,
  url         text    not null,
  -- photography | editing | filmmaking | color_grading | business | gear | community | learning
  category    text    not null default 'other',
  icon        text    not null default '🔗',
  is_featured boolean not null default false,
  display_order integer not null default 0
);

-- Seed curated resources
insert into public.creator_resources (title, description, url, category, icon, is_featured, display_order) values
  ('Unsplash',          'Free high-resolution photography for reference and mood boards',  'https://unsplash.com',            'photography',   '📷', true,  1),
  ('DaVinci Resolve',   'Industry-standard free color grading and editing software',       'https://blackmagicdesign.com',    'color_grading', '🎨', true,  2),
  ('PremiumBeat Blog',  'Music licensing tips, video production guides, tutorials',        'https://premiumbeat.com/blog',    'filmmaking',    '🎞', false, 3),
  ('Motionarray',       'Templates, stock footage, video assets for creators',             'https://motionarray.com',         'editing',       '✨', false, 4),
  ('Fstoppers',         'Photography and cinematography news, tutorials, reviews',         'https://fstoppers.com',           'photography',   '📸', false, 5),
  ('NoFilmSchool',      'Filmmaking education, gear reviews, industry insights',           'https://nofilmschool.com',        'filmmaking',    '🎬', true,  6),
  ('Colour Collective', 'Professional colour grading community and resources',             'https://colourcollective.net',    'color_grading', '🌈', false, 7),
  ('VSCO Journal',      'Photography inspiration, visual storytelling, artist features',   'https://vsco.co/blog',            'photography',   '🖼', false, 8),
  ('Epidemic Sound',    'Royalty-free music for YouTube, films, social media',             'https://epidemicsound.com',       'content',       '🎵', false, 9),
  ('Creator IQ',        'Influencer marketing platform insights and creator resources',    'https://creatoriq.com',           'business',      '📊', false, 10),
  ('Kinotika',          'Cinematography courses, behind-the-scenes content',               'https://kinotika.com',            'filmmaking',    '🎥', false, 11),
  ('Lens Pro To Go',    'Camera lens and gear rental for professional shoots',             'https://lensprotogo.com',         'gear',          '⚙',  false, 12)
on conflict do nothing;

/* ── 12. event_registrations ──────────────────────────────────────────────────── */
create table if not exists public.event_registrations (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references public.community_events(id) on delete cascade,
  firebase_uid text        not null,
  registered_at timestamptz not null default now(),
  unique(event_id, firebase_uid)
);

create index if not exists idx_event_regs_event on public.event_registrations (event_id);
create index if not exists idx_event_regs_uid   on public.event_registrations (firebase_uid);

/* ── 13. event_submissions ────────────────────────────────────────────────────── */
create table if not exists public.event_submissions (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references public.community_events(id) on delete cascade,
  firebase_uid text        not null,
  title        text        not null,
  description  text,
  media_url    text        not null,
  media_type   text        not null default 'image',
  vote_count   integer     not null default 0,
  is_winner    boolean     not null default false,
  winner_rank  integer,
  created_at   timestamptz not null default now(),
  unique(event_id, firebase_uid)
);

create index if not exists idx_submissions_event on public.event_submissions (event_id, vote_count desc);

/* ── RLS: service-role only on all new tables ─────────────────────────────────── */
do $$
declare t text;
begin
  foreach t in array array[
    'community_spaces', 'community_messages', 'community_message_reactions',
    'community_space_members', 'collaboration_requests',
    'community_teams', 'community_team_members', 'community_team_invites',
    'project_reviews', 'creator_resources',
    'event_registrations', 'event_submissions'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015 — Creator Progress, Challenge Completions, Course Progress,
--                 Preset Interactions, and extended Creator Profiles
--
-- All tables are service-role only (RLS enabled, no policy = blocked to anon/auth).
-- Progress is keyed by firebase_uid + item_type + item_id so any content item
-- can be tracked without schema changes.
-- ─────────────────────────────────────────────────────────────────────────────

/* ── Extend creator_profiles with richer identity fields ──────── */
alter table public.creator_profiles
  add column if not exists creator_type       text,          -- primary profession label
  add column if not exists niches             text[] default '{}',  -- secondary focus areas
  add column if not exists preferred_styles   text[] default '{}',  -- aesthetic preferences
  add column if not exists monetization_goal  text,          -- e.g. "brand-deals", "client-work"
  add column if not exists editing_software   text[] default '{}',  -- Lightroom, DaVinci, etc.
  add column if not exists experience_level   text,          -- mirrors skill_level for UI display
  add column if not exists interests          text[] default '{}',  -- free-form interest tags
  add column if not exists active_path_id     text,          -- currently selected growth path
  add column if not exists active_challenge_id text,         -- currently active challenge
  add column if not exists active_course_id   text,          -- currently active course
  add column if not exists consistency_streak integer default 0,   -- consecutive active days
  add column if not exists last_activity_at   timestamptz;

/* ── creator_progress — generic progress tracker ─────────────── */
create table if not exists public.creator_progress (
  id              uuid primary key default gen_random_uuid(),
  firebase_uid    text not null,
  item_type       text not null,  -- 'growth_path' | 'challenge' | 'course'
  item_id         text not null,  -- slug id of the content item
  stage_index     integer not null default 0,   -- current stage (for paths)
  completed_tasks integer not null default 0,   -- tasks done in current stage
  total_tasks     integer not null default 0,   -- total tasks in current stage
  progress_pct    integer not null default 0 check (progress_pct between 0 and 100),
  completed       boolean not null default false,
  completed_at    timestamptz,
  metadata        jsonb not null default '{}',  -- extra context
  started_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (firebase_uid, item_type, item_id)
);

create or replace function public.set_creator_progress_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_creator_progress_updated_at on public.creator_progress;
create trigger trg_creator_progress_updated_at
  before update on public.creator_progress
  for each row execute function public.set_creator_progress_updated_at();

/* ── challenge_completions — day-by-day challenge tracking ───── */
create table if not exists public.challenge_completions (
  id              uuid primary key default gen_random_uuid(),
  firebase_uid    text not null,
  challenge_id    text not null,  -- e.g. '30-day-cinematic'
  day_number      integer not null check (day_number >= 1),
  completed_at    timestamptz not null default now(),
  upload_url      text,           -- optional photo/video upload
  note            text,           -- optional user note

  unique (firebase_uid, challenge_id, day_number)
);

create index if not exists idx_challenge_completions_uid
  on public.challenge_completions (firebase_uid, challenge_id);

/* ── course_progress — lesson-by-lesson tracking ─────────────── */
create table if not exists public.course_progress (
  id              uuid primary key default gen_random_uuid(),
  firebase_uid    text not null,
  course_id       text not null,   -- e.g. 'lightroom-mastery'
  lesson_id       text not null,   -- e.g. 'lr-l1-catalog'
  completed_at    timestamptz not null default now(),
  watch_time_s    integer not null default 0,

  unique (firebase_uid, course_id, lesson_id)
);

create index if not exists idx_course_progress_uid
  on public.course_progress (firebase_uid, course_id);

/* ── preset_interactions — behavioral signals ────────────────── */
create table if not exists public.preset_interactions (
  id              uuid primary key default gen_random_uuid(),
  firebase_uid    text not null,
  preset_id       text not null,   -- preset slug
  action          text not null,   -- 'view' | 'download' | 'favorite' | 'apply' | 'purchase'
  source          text,            -- 'personalized' | 'store' | 'recommendation'
  created_at      timestamptz not null default now()
);

create index if not exists idx_preset_interactions_uid
  on public.preset_interactions (firebase_uid, created_at desc);

create index if not exists idx_preset_interactions_preset
  on public.preset_interactions (preset_id, action);

/* ── Indexes ────────────────────────────────────────────────────── */
create index if not exists idx_creator_progress_uid
  on public.creator_progress (firebase_uid, item_type);

/* ── RLS: service-role only ──────────────────────────────────────── */
alter table public.creator_progress       enable row level security;
alter table public.challenge_completions  enable row level security;
alter table public.course_progress        enable row level security;
alter table public.preset_interactions    enable row level security;

comment on table public.creator_progress      is 'Generic progress tracker for growth paths, challenges, and courses';
comment on table public.challenge_completions is 'Day-by-day challenge completion records';
comment on table public.course_progress       is 'Lesson completion records for courses';
comment on table public.preset_interactions   is 'Behavioral signals for adaptive preset recommendations';

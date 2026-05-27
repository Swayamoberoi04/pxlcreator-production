-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011 — creator_profiles + personalization tables
--
-- Stores onboarding answers, computed affinities, and Style DNA.
-- All tables are service-role only (no RLS policies = anon/auth clients blocked).
-- ─────────────────────────────────────────────────────────────────────────────

/* ── creator_profiles — one row per user ───────────────────── */
create table if not exists public.creator_profiles (
  id                        uuid primary key default gen_random_uuid(),
  firebase_uid              text not null unique,

  /* ── Onboarding answers ── */
  professions               text[]      not null default '{}',
  goals                     text[]      not null default '{}',
  aesthetics                text[]      not null default '{}',
  skill_level               text,
  platforms                 text[]      not null default '{}',

  /* ── Computed category affinities (0–1 per dimension) ── */
  affinities                jsonb       not null default '{}',

  /* ── Style DNA ── */
  style_dna_title           text,
  style_dna_tagline         text,
  style_dna_badge           text,
  style_dna_color           text,
  style_dna_archetypes      text[]      default '{}',

  /* ── Lifecycle ── */
  onboarding_completed_at   timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

/* Auto-update updated_at */
create or replace function public.set_creator_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_creator_profiles_updated_at on public.creator_profiles;
create trigger trg_creator_profiles_updated_at
  before update on public.creator_profiles
  for each row execute function public.set_creator_profile_updated_at();

/* ── recommendation_cache — pre-computed per user ──────────── */
create table if not exists public.recommendation_cache (
  id           uuid primary key default gen_random_uuid(),
  firebase_uid text not null,
  section_id   text not null,
  items        jsonb not null default '[]',
  generated_at timestamptz not null default now(),

  unique(firebase_uid, section_id)
);

/* ── user_behavior — behavioral signals ────────────────────── */
create table if not exists public.user_behavior (
  id           uuid primary key default gen_random_uuid(),
  firebase_uid text not null,
  event_type   text not null, -- 'view_preset', 'save_preset', 'purchase', 'search', 'click_rec'
  resource_id  text,          -- preset slug, bundle id, etc.
  resource_type text,         -- 'preset', 'bundle', 'course', 'blog'
  metadata     jsonb default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists idx_user_behavior_uid
  on public.user_behavior (firebase_uid, created_at desc);

/* ── Indexes ────────────────────────────────────────────────── */
create index if not exists idx_creator_profiles_uid
  on public.creator_profiles (firebase_uid);

create index if not exists idx_rec_cache_uid
  on public.recommendation_cache (firebase_uid);

/* ── RLS: service-role only ─────────────────────────────────── */
alter table public.creator_profiles    enable row level security;
alter table public.recommendation_cache enable row level security;
alter table public.user_behavior       enable row level security;

comment on table public.creator_profiles    is 'PXL Creator onboarding answers and computed Style DNA';
comment on table public.recommendation_cache is 'Pre-computed personalised recommendation sections per user';
comment on table public.user_behavior       is 'Behavioural signals for adaptive recommendations';

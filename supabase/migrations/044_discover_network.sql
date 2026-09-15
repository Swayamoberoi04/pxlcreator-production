-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 044 — Discover + Creator Network (Phase 5.2)
--
-- Builds on 043's foundation. Nothing here duplicates it — this migration only
-- adds what Trending/New/Similar/Recommended and the Featured/Inspiration
-- entity actually need.
--
--  1. featured_creators — external, non-PXL "Inspiration" entities. Explicitly
--     NOT community_profiles: no firebase_uid, cannot follow/be-followed, and
--     the API/UI must never present one as a PXL member.
--  2. Index to make "trending" (follower growth over a real window) a cheap
--     query instead of a full scan.
--  3. Index to make "new creators" cheap.
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. featured_creators ─────────────────────────────────────────────────── */
create table if not exists public.featured_creators (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  -- Public handle shown as "@handle" — NOT a firebase_uid, NOT a login.
  handle        text,
  bio           text        default '',
  avatar_url    text,
  -- Where the real public profile lives (Instagram, YouTube, personal site…).
  -- Required: this entity exists ONLY to point at verifiable public work.
  source_url    text        not null,
  platform      text        default '',
  -- role/style tag ids, drawn from the same creator_tags vocabulary as real
  -- profiles, so Discover can slot them into the same filter UI.
  role_tags     text[]      not null default '{}',
  style_tags    text[]      not null default '{}',
  -- Free-text note on why this entity is safe to publish, e.g. "bio drawn
  -- from public Instagram profile, 2026-09". Admin-only, never rendered.
  source_note   text        default '',
  sort_order    integer     not null default 0,
  is_active     boolean     not null default true,
  created_by    text,   -- admin email
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.featured_creators is
  'External "Featured Creator / Inspiration" entities — real public photographers/creators who are NOT PXL members. Never a substitute for a community_profiles row; no firebase_uid, no follow relationship, no login. Enrolling one as an actual PXL member means creating them a normal account — this table is not that path.';

drop trigger if exists trg_featured_creators_updated_at on public.featured_creators;
create trigger trg_featured_creators_updated_at
  before update on public.featured_creators
  for each row execute function public.set_updated_at();

create index if not exists idx_featured_creators_active
  on public.featured_creators (sort_order)
  where is_active = true;

alter table public.featured_creators enable row level security;

drop policy if exists "active featured creators are readable" on public.featured_creators;
create policy "active featured creators are readable"
  on public.featured_creators for select to anon, authenticated
  using (is_active = true);

grant select on public.featured_creators to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.featured_creators;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

/* ── 2. Trending: follower growth over a real time window ────────────────── */
-- "Trending" = most creator_follows rows created in the last N days, grouped
-- by following_uid. This index makes that a range-scan instead of a seq-scan.
create index if not exists idx_creator_follows_following_created
  on public.creator_follows (following_uid, created_at desc);

/* ── 3. New creators: newest public profiles ──────────────────────────────── */
create index if not exists idx_community_profiles_public_created
  on public.community_profiles (created_at desc)
  where visibility = 'public';

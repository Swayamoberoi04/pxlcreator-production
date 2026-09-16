-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 046 — Real Creator Projects + Showcases (Phase 5.4)
--
-- Extends project_listings / project_applications / showcase_items /
-- showcase_reactions (migration 012, expanded 013) rather than duplicating
-- them. Adds exactly what those tables were missing for real hiring flows
-- and permanent, insight-backed portfolios:
--
--   1. project_listings:   tags, visibility, closed_at
--   2. project_applications: enforced status enum, reviewer_note, reviewed_at
--   3. project_views:      real per-view log + trigger-synced view_count
--   4. showcase_items:     project_id (real client-work linkage), client_name
--                          (free-text credit when there's no PXL project row),
--                          visibility, enquiry_count
--   5. showcase_views:     real per-view log + trigger-synced view_count
--                          ("saves" already exist: showcase_reactions'
--                          reaction='bookmark' from migration 012 — not
--                          duplicated here)
--   6. showcase_enquiries: real, persisted professional contact requests
--   7. RLS: anon read access to exactly the public slice; ownership for
--      writes is enforced in API code against the verified Firebase UID,
--      same documented pattern as migrations 043/045 (Firebase auth, not
--      Supabase Auth — there is no auth.uid() for RLS to key a per-user
--      policy on).
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. project_listings ───────────────────────────────────────────────────── */
alter table public.project_listings
  add column if not exists tags       text[]      not null default '{}',
  add column if not exists visibility text        not null default 'public',
  add column if not exists closed_at  timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_listings_visibility_check') then
    alter table public.project_listings add constraint project_listings_visibility_check
      check (visibility in ('public', 'private'));
  end if;
end;
$$;

comment on column public.project_listings.tags is
  'Role/style tag ids from the same creator_tags vocabulary used by profiles and Discover (distinct from skills_needed, which is free-text).';

create index if not exists idx_project_listings_tags on public.project_listings using gin (tags);
create index if not exists idx_project_listings_status_created on public.project_listings (status, created_at desc);
create index if not exists idx_project_listings_public on public.project_listings (created_at desc) where visibility = 'public' and status = 'open';

/* ── 2. project_applications: real status lifecycle ───────────────────────── */
alter table public.project_applications
  add column if not exists reviewer_note text,
  add column if not exists reviewed_at   timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_applications_status_check') then
    alter table public.project_applications add constraint project_applications_status_check
      check (status in ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'closed'));
  end if;
end;
$$;

comment on column public.project_applications.reviewer_note is
  'Private note visible only to the project owner - never exposed to the applicant.';

/* ── 3. project_views ──────────────────────────────────────────────────────── */
create table if not exists public.project_views (
  id         uuid        primary key default gen_random_uuid(),
  project_id uuid        not null references public.project_listings(id) on delete cascade,
  viewer_uid text,        -- null = unauthenticated viewer; real, not fabricated
  created_at timestamptz not null default now()
);

create index if not exists idx_project_views_project on public.project_views (project_id);

create or replace function public.sync_project_view_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.project_listings set view_count = view_count + 1 where id = new.project_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_project_view_count on public.project_views;
create trigger trg_sync_project_view_count
  after insert on public.project_views
  for each row execute function public.sync_project_view_count();

/* ── 4. showcase_items: project/client context + visibility ──────────────── */
alter table public.showcase_items
  add column if not exists project_id     uuid references public.project_listings(id) on delete set null,
  add column if not exists client_name    text,
  add column if not exists visibility     text not null default 'public',
  add column if not exists enquiry_count  integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'showcase_items_visibility_check') then
    alter table public.showcase_items add constraint showcase_items_visibility_check
      check (visibility in ('public', 'private'));
  end if;
end;
$$;

comment on column public.showcase_items.project_id is
  'Real client-work linkage when the work came from a PXL project listing. Null does not mean "no client" - see client_name for freelance work outside PXL''s project system.';
comment on column public.showcase_items.client_name is
  'Free-text client credit for work not tied to a project_listings row. Both this and project_id may be set.';

create index if not exists idx_showcase_items_project on public.showcase_items (project_id) where project_id is not null;

-- Showcases are permanent by design: no expiry column, no TTL, no archival
-- job. A showcase item is removed from a profile only by the creator's own
-- DELETE (hard delete, cascades reactions/views/enquiries) or by admin
-- moderation (is_removed, migration 039) - never automatically.

/* ── 5. showcase_views ─────────────────────────────────────────────────────── */
create table if not exists public.showcase_views (
  id          uuid        primary key default gen_random_uuid(),
  showcase_id uuid        not null references public.showcase_items(id) on delete cascade,
  viewer_uid  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_showcase_views_item on public.showcase_views (showcase_id);

create or replace function public.sync_showcase_view_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.showcase_items set view_count = view_count + 1 where id = new.showcase_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_showcase_view_count on public.showcase_views;
create trigger trg_sync_showcase_view_count
  after insert on public.showcase_views
  for each row execute function public.sync_showcase_view_count();

/* ── 6. showcase_enquiries — real professional contact requests ──────────── */
create table if not exists public.showcase_enquiries (
  id           uuid        primary key default gen_random_uuid(),
  showcase_id  uuid        not null references public.showcase_items(id) on delete cascade,
  enquirer_uid text        not null,
  message      text        not null,
  contact_email text,
  status       text        not null default 'new',
  created_at   timestamptz not null default now(),
  constraint showcase_enquiries_status_check check (status in ('new', 'responded', 'closed'))
);

create index if not exists idx_showcase_enquiries_item   on public.showcase_enquiries (showcase_id, created_at desc);
create index if not exists idx_showcase_enquiries_sender on public.showcase_enquiries (enquirer_uid);

create or replace function public.sync_showcase_enquiry_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.showcase_items set enquiry_count = enquiry_count + 1 where id = new.showcase_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_showcase_enquiry_count on public.showcase_enquiries;
create trigger trg_sync_showcase_enquiry_count
  after insert on public.showcase_enquiries
  for each row execute function public.sync_showcase_enquiry_count();

/* ── 7. RLS ────────────────────────────────────────────────────────────────── */
alter table public.project_views      enable row level security;
alter table public.showcase_views     enable row level security;
alter table public.showcase_enquiries enable row level security;

-- project_listings had RLS enabled with zero policies since migration 012
-- (service-role only). Add narrow anon SELECT for the public slice only.
drop policy if exists "public projects are readable" on public.project_listings;
create policy "public projects are readable"
  on public.project_listings for select to anon, authenticated
  using (visibility = 'public');

grant select on public.project_listings to anon, authenticated;

-- Update the showcase_items anon policy from migration 043 to also respect
-- the new visibility column (existing public rows are unaffected: they
-- default to 'public').
drop policy if exists "visible showcase items are readable" on public.showcase_items;
create policy "visible showcase items are readable"
  on public.showcase_items for select to anon, authenticated
  using (is_removed = false and visibility = 'public');

-- project_views / showcase_views / showcase_enquiries / project_applications
-- intentionally get NO anon policy: view logs are write-only signals (counts
-- are denormalised onto the parent row), enquiries carry contact intent, and
-- applications carry cover letters - none of this is public-feed data, and
-- none of it can be safely scoped per-user without Supabase Auth's auth.uid().
-- They remain service-role only, same default as every join table since
-- migration 012.

/* ── 8. Realtime ───────────────────────────────────────────────────────────── */
-- project_listings status is public information (an "open" project turning
-- "closed" is worth reflecting live in Discover); showcase_items already
-- joined the publication in migration 043.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.project_listings; exception when duplicate_object then null; end;
  end if;
end;
$$;

alter table public.project_listings replica identity full;

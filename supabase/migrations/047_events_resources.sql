-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 047 — Real Community Events + Resources (Phase 5.5)
--
-- Extends community_events / event_registrations (migration 012/013) and
-- creator_resources (013) rather than standing up parallel tables.
--
-- Fixes two real bugs found while auditing:
--   1. event_registrations' participant_count was maintained by a
--      read-modify-write in the register route that incremented even when the
--      upsert hit ignoreDuplicates — i.e. clicking Register twice inflated the
--      count without creating a row. Now trigger-driven from real rows only.
--   2. community_events had no max_participants column at all, despite the UI
--      rendering "Up to N participants".
--
-- Adds, because nothing existing covered them:
--   • events: registration mode/URL, tags, visibility, attendance mode,
--     source (PXL vs external), external organizer identity, view_count
--   • event_views: real per-view log, trigger-synced
--   • resources: source (PXL vs external), resource_type, tags, submitter,
--     status, timestamps (the table had NONE), click tracking
--   • resource_clicks: real outbound-click log, trigger-synced
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. community_events ───────────────────────────────────────────────────── */
alter table public.community_events
  add column if not exists registration_mode text    not null default 'internal',
  add column if not exists registration_url  text,
  add column if not exists tags              text[]  not null default '{}',
  add column if not exists visibility        text    not null default 'public',
  add column if not exists attendance_mode   text    not null default 'online',
  add column if not exists source            text    not null default 'pxl',
  add column if not exists organizer_name    text,
  add column if not exists organizer_url     text,
  add column if not exists max_participants  integer,
  add column if not exists view_count        integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_events_reg_mode_check') then
    alter table public.community_events add constraint community_events_reg_mode_check
      -- internal = event_registrations rows; external = link out to
      -- registration_url; none = informational listing only.
      check (registration_mode in ('internal', 'external', 'none'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_events_visibility_check') then
    alter table public.community_events add constraint community_events_visibility_check
      check (visibility in ('public', 'private'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_events_attendance_check') then
    alter table public.community_events add constraint community_events_attendance_check
      check (attendance_mode in ('online', 'offline', 'hybrid'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_events_source_check') then
    alter table public.community_events add constraint community_events_source_check
      -- 'external' = an event run by someone who is NOT a PXL member. The UI
      -- must never present one as PXL-organised (Phase 5.5 requirement 12).
      check (source in ('pxl', 'external'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_events_status_check') then
    alter table public.community_events add constraint community_events_status_check
      check (status in ('upcoming', 'active', 'ended', 'cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_events_external_needs_url') then
    -- An external-registration event without a destination is a dead end.
    alter table public.community_events add constraint community_events_external_needs_url
      check (registration_mode <> 'external' or registration_url is not null);
  end if;
end;
$$;

comment on column public.community_events.source is
  'pxl = organised by PXL or a real PXL member (organiser_uid). external = a third-party event listed for discovery; organiser_name/organizer_url describe a non-member organiser and it must never be shown as a PXL member.';

-- Keep the legacy is_online boolean consistent with the richer attendance_mode
-- for any row created before this migration.
update public.community_events
   set attendance_mode = case when is_online then 'online' else 'offline' end
 where attendance_mode = 'online' and is_online = false;

create index if not exists idx_events_upcoming
  on public.community_events (start_date asc)
  where visibility = 'public' and status in ('upcoming', 'active');
create index if not exists idx_events_tags on public.community_events using gin (tags);
create index if not exists idx_events_type_status on public.community_events (event_type, status);

/* ── 2. event_registrations: interest level + atomic counter ───────────────── */
alter table public.event_registrations
  add column if not exists interest_level text not null default 'registered';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_registrations_interest_check') then
    alter table public.event_registrations add constraint event_registrations_interest_check
      check (interest_level in ('registered', 'interested'));
  end if;
end;
$$;

-- participant_count now comes only from real rows. unique(event_id,
-- firebase_uid) already existed (migration 013), so a duplicate registration
-- can no longer inflate the count the way the old route's unconditional
-- increment did.
create or replace function public.sync_event_participant_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_events
       set participant_count = participant_count + 1
     where id = new.event_id;
  elsif tg_op = 'DELETE' then
    update public.community_events
       set participant_count = greatest(0, participant_count - 1)
     where id = old.event_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_event_participant_count on public.event_registrations;
create trigger trg_sync_event_participant_count
  after insert or delete on public.event_registrations
  for each row execute function public.sync_event_participant_count();

-- Repair any drift the old read-modify-write route already caused.
update public.community_events e set participant_count = (
  select count(*) from public.event_registrations r where r.event_id = e.id
);

/* ── 3. event_views ────────────────────────────────────────────────────────── */
create table if not exists public.event_views (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.community_events(id) on delete cascade,
  viewer_uid text,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_views_event on public.event_views (event_id);

create or replace function public.sync_event_view_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_events set view_count = view_count + 1 where id = new.event_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_event_view_count on public.event_views;
create trigger trg_sync_event_view_count
  after insert on public.event_views
  for each row execute function public.sync_event_view_count();

/* ── 4. creator_resources ──────────────────────────────────────────────────── */
alter table public.creator_resources
  add column if not exists source        text        not null default 'external',
  add column if not exists resource_type text        not null default 'references',
  add column if not exists tags          text[]      not null default '{}',
  add column if not exists submitted_by  text,
  add column if not exists status        text        not null default 'published',
  add column if not exists click_count   integer     not null default 0,
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists updated_at    timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'creator_resources_source_check') then
    alter table public.creator_resources add constraint creator_resources_source_check
      -- 'pxl' = made by PXL. 'external' = a third-party tool/site listed for
      -- discovery — never presented as PXL-built (requirement 11/12).
      check (source in ('pxl', 'external'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'creator_resources_type_check') then
    alter table public.creator_resources add constraint creator_resources_type_check
      check (resource_type in ('tools', 'learning', 'communities', 'references', 'templates', 'services'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'creator_resources_status_check') then
    alter table public.creator_resources add constraint creator_resources_status_check
      check (status in ('draft', 'published', 'archived'));
  end if;
end;
$$;

drop trigger if exists trg_creator_resources_updated_at on public.creator_resources;
create trigger trg_creator_resources_updated_at
  before update on public.creator_resources
  for each row execute function public.set_updated_at();

-- A resource is its destination: two rows pointing at the same URL are a
-- duplicate, not two resources.
create unique index if not exists idx_creator_resources_url on public.creator_resources (url);
create index if not exists idx_creator_resources_tags on public.creator_resources using gin (tags);
create index if not exists idx_creator_resources_published
  on public.creator_resources (resource_type, display_order)
  where status = 'published';

-- Repair the mojibake icons that migration 013 inserted (UTF-8 emoji written
-- through a Latin-1 path). Only touches rows still holding the broken bytes.
update public.creator_resources set icon = '🔗' where icon = 'ðŸ”—';
update public.creator_resources set icon = '📷' where icon = 'ðŸ“·';
update public.creator_resources set icon = '🎨' where icon = 'ðŸŽ¨';
update public.creator_resources set icon = '🎞' where icon = 'ðŸŽž';
update public.creator_resources set icon = '✨' where icon = 'âœ¨';

/* ── 5. resource_clicks — real outbound engagement ─────────────────────────── */
create table if not exists public.resource_clicks (
  id          uuid        primary key default gen_random_uuid(),
  resource_id uuid        not null references public.creator_resources(id) on delete cascade,
  clicker_uid text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_resource_clicks_resource on public.resource_clicks (resource_id);

create or replace function public.sync_resource_click_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.creator_resources set click_count = click_count + 1 where id = new.resource_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_resource_click_count on public.resource_clicks;
create trigger trg_sync_resource_click_count
  after insert on public.resource_clicks
  for each row execute function public.sync_resource_click_count();

/* ── 6. RLS ────────────────────────────────────────────────────────────────
 * Same model as migrations 043/045/046: anon gets read-only access to exactly
 * the public slice so Realtime and public pages work without the service-role
 * key. Ownership/admin authorisation for writes is enforced in API code
 * against the verified Firebase UID / admin session, because this project
 * authenticates with Firebase and there is no auth.uid() for RLS to key on.
 * ────────────────────────────────────────────────────────────────────────── */
alter table public.event_views     enable row level security;
alter table public.resource_clicks enable row level security;

drop policy if exists "public events are readable" on public.community_events;
create policy "public events are readable"
  on public.community_events for select to anon, authenticated
  using (visibility = 'public');

drop policy if exists "published resources are readable" on public.creator_resources;
create policy "published resources are readable"
  on public.creator_resources for select to anon, authenticated
  using (status = 'published');

grant select on public.community_events   to anon, authenticated;
grant select on public.creator_resources  to anon, authenticated;

-- event_registrations / event_views / resource_clicks get NO anon policy:
-- who registered or clicked what is not public-listing data, and it cannot be
-- scoped per-user without a Supabase Auth session. Service-role only, same
-- default as every join table since migration 012.

/* ── 7. Realtime ───────────────────────────────────────────────────────────── */
-- An event flipping upcoming → active → ended, or filling up, is public
-- information worth reflecting live on the events page.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.community_events; exception when duplicate_object then null; end;
  end if;
end;
$$;

alter table public.community_events replica identity full;

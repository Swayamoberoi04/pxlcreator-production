-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 043 — PXL Community Foundation (Phase 5.1)
--
-- Hardens the real, live community foundation that migrations 012/013 started.
-- Everything here is additive and idempotent — no existing data is destroyed.
--
--  1. community_profiles: style_tags + visibility
--  2. GIN indexes for array-contains filtering (roles / skills / style_tags)
--  3. Richer full-text search vector (skills, style_tags, country)
--  4. creator_tags: DB-backed filter vocabulary (replaces hardcoded TS arrays)
--  5. Atomic follower/following/showcase counters via triggers (+ true backfill)
--  6. Anon-readable RLS policies so Realtime + public reads work safely
--  7. Realtime publication for profiles + follows
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. Profile: style tags + visibility ──────────────────────────────────── */
alter table public.community_profiles
  add column if not exists style_tags text[] not null default '{}',
  add column if not exists visibility text   not null default 'public';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'community_profiles_visibility_check'
  ) then
    alter table public.community_profiles
      add constraint community_profiles_visibility_check
      check (visibility in ('public', 'followers', 'private'));
  end if;
end;
$$;

comment on column public.community_profiles.style_tags is
  'Aesthetic / subject tags (portrait, travel, cinematic, street, fashion …). Distinct from roles (profession) and skills (tools).';
comment on column public.community_profiles.visibility is
  'public = listed in Discover and readable by anyone; followers = only followers see the full profile; private = hidden from Discover.';

/* ── 2. Array filter indexes ──────────────────────────────────────────────── */
create index if not exists idx_community_profiles_roles
  on public.community_profiles using gin (roles);
create index if not exists idx_community_profiles_skills
  on public.community_profiles using gin (skills);
create index if not exists idx_community_profiles_style_tags
  on public.community_profiles using gin (style_tags);
create index if not exists idx_community_profiles_visibility
  on public.community_profiles (visibility)
  where visibility = 'public';

/* ── 3. Search vector now covers skills + style tags + country ────────────── */
create or replace function public.update_profile_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.display_name, '')),                   'A') ||
    setweight(to_tsvector('english', coalesce(new.username, '')),                       'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.roles, '{}'), ' ')),      'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.style_tags, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.skills, '{}'), ' ')),     'B') ||
    setweight(to_tsvector('english', coalesce(new.bio, '')),                            'C') ||
    setweight(to_tsvector('english', coalesce(new.location_city, '')),                  'C') ||
    setweight(to_tsvector('english', coalesce(new.location_country, '')),               'C');
  return new;
end;
$$;

-- Re-run the trigger over every existing row so the new weights take effect.
update public.community_profiles set updated_at = updated_at;

/* ── 4. creator_tags — DB-backed filter vocabulary ────────────────────────── */
create table if not exists public.creator_tags (
  id          text        primary key,          -- slug, e.g. 'photographer', 'cinematic'
  -- role  = what the creator IS (profession)
  -- style = what their work LOOKS like (aesthetic / subject)
  kind        text        not null default 'role',
  label       text        not null,
  icon        text        not null default '',
  color       text        not null default '#FFD60A',
  sort_order  integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  constraint creator_tags_kind_check check (kind in ('role', 'style'))
);

create index if not exists idx_creator_tags_kind
  on public.creator_tags (kind, sort_order)
  where is_active = true;

-- Roles mirror the previously-hardcoded CREATOR_ROLES array in src/types/community.ts.
insert into public.creator_tags (id, kind, label, icon, color, sort_order) values
  ('photographer',        'role', 'Photographer',        '📷', '#FFD60A',  1),
  ('mobile-photographer', 'role', 'Mobile Photographer', '📱', '#38bdf8',  2),
  ('lightroom-editor',    'role', 'Lightroom Editor',    '🎨', '#f59e0b',  3),
  ('color-grader',        'role', 'Color Grader',        '🎬', '#8b5cf6',  4),
  ('retoucher',           'role', 'Retoucher',           '🖌', '#a78bfa',  5),
  ('videographer',        'role', 'Videographer',        '📽', '#ec4899',  6),
  ('cinematographer',     'role', 'Cinematographer',     '🎥', '#06b6d4',  7),
  ('filmmaker',           'role', 'Filmmaker',           '🎞', '#f97316',  8),
  ('short-film-maker',    'role', 'Short Film Maker',    '🎭', '#10b981',  9),
  ('drone-operator',      'role', 'Drone Operator',      '🚁', '#0ea5e9', 10),
  ('vlogger',             'role', 'Vlogger',             '🎙', '#e1306c', 11),
  ('content-creator',     'role', 'Content Creator',     '✨', '#fb7185', 12),
  ('thumbnail-designer',  'role', 'Thumbnail Designer',  '🖼', '#4ade80', 13),
  ('preset-creator',      'role', 'Preset Creator',      '⚡', '#FFD60A', 14)
on conflict (id) do nothing;

insert into public.creator_tags (id, kind, label, icon, color, sort_order) values
  ('portrait',      'style', 'Portrait',      '🧑', '#f59e0b',  1),
  ('travel',        'style', 'Travel',        '🌍', '#06b6d4',  2),
  ('cinematic',     'style', 'Cinematic',     '🎞', '#8b5cf6',  3),
  ('street',        'style', 'Street',        '🏙', '#94a3b8',  4),
  ('fashion',       'style', 'Fashion',       '👗', '#ec4899',  5),
  ('wedding',       'style', 'Wedding',       '💍', '#fb7185',  6),
  ('landscape',     'style', 'Landscape',     '🏔', '#10b981',  7),
  ('wildlife',      'style', 'Wildlife',      '🦌', '#65a30d',  8),
  ('product',       'style', 'Product',       '📦', '#f97316',  9),
  ('food',          'style', 'Food',          '🍜', '#facc15', 10),
  ('architecture',  'style', 'Architecture',  '🏛', '#a3a3a3', 11),
  ('automotive',    'style', 'Automotive',    '🚗', '#ef4444', 12),
  ('documentary',   'style', 'Documentary',   '📰', '#78716c', 13),
  ('moody',         'style', 'Moody',         '🌑', '#6366f1', 14),
  ('vibrant',       'style', 'Vibrant',       '🌈', '#d946ef', 15),
  ('minimal',       'style', 'Minimal',       '⬜', '#e5e7eb', 16),
  ('black-white',   'style', 'Black & White', '🎱', '#737373', 17),
  ('film-emulation','style', 'Film Emulation','📼', '#c084fc', 18)
on conflict (id) do nothing;

alter table public.creator_tags enable row level security;

/* ── 5. Atomic counters (no read-modify-write races, no invented numbers) ─── */

-- follower_count / following_count driven directly by creator_follows rows.
create or replace function public.sync_follow_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_profiles
       set follower_count = follower_count + 1
     where firebase_uid = new.following_uid;
    update public.community_profiles
       set following_count = following_count + 1
     where firebase_uid = new.follower_uid;
  elsif tg_op = 'DELETE' then
    update public.community_profiles
       set follower_count = greatest(0, follower_count - 1)
     where firebase_uid = old.following_uid;
    update public.community_profiles
       set following_count = greatest(0, following_count - 1)
     where firebase_uid = old.follower_uid;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_follow_counts on public.creator_follows;
create trigger trg_sync_follow_counts
  after insert or delete on public.creator_follows
  for each row execute function public.sync_follow_counts();

-- Guard: a creator can never follow themselves.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creator_follows_no_self_check'
  ) then
    alter table public.creator_follows
      add constraint creator_follows_no_self_check
      check (follower_uid <> following_uid);
  end if;
end;
$$;

-- showcase_count driven directly by visible showcase_items rows.
create or replace function public.sync_showcase_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare target text;
begin
  target := coalesce(new.author_uid, old.author_uid);
  update public.community_profiles p
     set showcase_count = (
       select count(*) from public.showcase_items s
        where s.author_uid = target and s.is_removed = false
     )
   where p.firebase_uid = target;
  return null;
end;
$$;

drop trigger if exists trg_sync_showcase_count on public.showcase_items;
create trigger trg_sync_showcase_count
  after insert or update of is_removed or delete on public.showcase_items
  for each row execute function public.sync_showcase_count();

-- Backfill every counter from the REAL rows, so any pre-existing drift
-- (or number that was never backed by a row) is corrected to the truth.
update public.community_profiles p set
  follower_count  = (select count(*) from public.creator_follows f where f.following_uid = p.firebase_uid),
  following_count = (select count(*) from public.creator_follows f where f.follower_uid  = p.firebase_uid),
  showcase_count  = (select count(*) from public.showcase_items  s where s.author_uid    = p.firebase_uid and s.is_removed = false),
  post_count      = (select count(*) from public.channel_posts   c where c.author_uid    = p.firebase_uid and c.is_removed = false);

/* ── 6. RLS: anon may READ public data only. All writes stay service-role. ── */
-- Firebase (not Supabase Auth) owns identity here, so every write is verified
-- server-side and executed with the service role, which bypasses RLS. These
-- policies exist purely so the anon key can read public data and receive
-- Realtime events — they grant SELECT and nothing else.

drop policy if exists "public profiles are readable" on public.community_profiles;
create policy "public profiles are readable"
  on public.community_profiles for select to anon, authenticated
  using (visibility = 'public');

drop policy if exists "follow edges are readable" on public.creator_follows;
create policy "follow edges are readable"
  on public.creator_follows for select to anon, authenticated
  using (true);

drop policy if exists "visible showcase items are readable" on public.showcase_items;
create policy "visible showcase items are readable"
  on public.showcase_items for select to anon, authenticated
  using (is_removed = false);

drop policy if exists "creator tags are readable" on public.creator_tags;
create policy "creator tags are readable"
  on public.creator_tags for select to anon, authenticated
  using (is_active = true);

grant select on public.community_profiles to anon, authenticated;
grant select on public.creator_follows    to anon, authenticated;
grant select on public.showcase_items     to anon, authenticated;
grant select on public.creator_tags       to anon, authenticated;

/* ── 7. Realtime publication ──────────────────────────────────────────────── */
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.community_profiles;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.creator_follows;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.showcase_items;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

-- Realtime delivers OLD row data on UPDATE/DELETE only with REPLICA IDENTITY FULL.
alter table public.creator_follows    replica identity full;
alter table public.community_profiles replica identity full;

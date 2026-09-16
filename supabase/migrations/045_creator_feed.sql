-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 045 — Creator Social Feed (Phase 5.3)
--
-- Extends the existing channel_posts / post_comments / post_reactions system
-- (migration 012) into a general creator feed, rather than standing up a
-- parallel table. A channel post already IS "a post by a creator with likes
-- and comments" — the only thing missing was a way to post WITHOUT a
-- channel. So:
--
--   channel_posts.channel_id becomes NULLABLE.
--     channel_id IS NOT NULL  -> unchanged: a post inside a channel (012/013 behavior)
--     channel_id IS NULL      -> NEW: a post on the creator's main feed
--
-- Everything that already worked for channel posts (reactions via
-- post_reactions, comments via post_comments, moderation via
-- /admin/community/posts) keeps working unmodified for feed posts too.
--
-- New in this migration, because nothing existing covered them:
--   1. content_kind / ai_assisted / save_count / share_count / visibility
--      columns on channel_posts
--   2. post_media — structured media (so a before/after post can express
--      "this image is the before, that one is the after", not just an
--      unordered media_urls array)
--   3. post_saves — real, persistent bookmarks
--   4. post_shares — real, persistent share/repost records
--   5. Realtime + anon-read RLS for the public-feed slice of these tables
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. channel_posts: nullable channel_id + feed columns ─────────────────── */
alter table public.channel_posts alter column channel_id drop not null;

alter table public.channel_posts
  add column if not exists content_kind text not null default 'text',
  add column if not exists ai_assisted  boolean not null default false,
  add column if not exists save_count   integer not null default 0,
  add column if not exists share_count  integer not null default 0,
  -- 'public' = anyone; 'followers' = only people who follow the author.
  -- (Not 'private' — a post nobody but the author can see isn't a feed post.)
  add column if not exists visibility   text not null default 'public';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'channel_posts_content_kind_check') then
    alter table public.channel_posts add constraint channel_posts_content_kind_check
      check (content_kind in (
        'text', 'photography', 'cinematography', 'before_after',
        'editing_breakdown', 'lightroom_recipe', 'preset_showcase', 'ai_assisted'
      ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'channel_posts_visibility_check') then
    alter table public.channel_posts add constraint channel_posts_visibility_check
      check (visibility in ('public', 'followers'));
  end if;
end;
$$;

comment on column public.channel_posts.channel_id is
  'NULL = a main-feed post (Phase 5.3). NOT NULL = a post inside that channel (migration 012).';

-- The main feed's own query pattern: newest-first among channel_id IS NULL.
create index if not exists idx_posts_feed
  on public.channel_posts (created_at desc)
  where channel_id is null and visibility = 'public';

create index if not exists idx_posts_feed_author
  on public.channel_posts (author_uid, created_at desc)
  where channel_id is null;

/* ── 2. post_media ─────────────────────────────────────────────────────────── */
create table if not exists public.post_media (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.channel_posts(id) on delete cascade,
  media_url  text        not null,
  media_type text        not null default 'image',
  -- 'before' / 'after' for a before-after post; null for every other kind.
  role       text,
  position   integer     not null default 0,
  created_at timestamptz not null default now(),
  constraint post_media_type_check  check (media_type in ('image', 'video')),
  constraint post_media_role_check  check (role is null or role in ('before', 'after'))
);

create index if not exists idx_post_media_post on public.post_media (post_id, position);

/* ── 3. post_saves — real bookmarks ───────────────────────────────────────── */
create table if not exists public.post_saves (
  id           uuid        primary key default gen_random_uuid(),
  post_id      uuid        not null references public.channel_posts(id) on delete cascade,
  firebase_uid text        not null,
  created_at   timestamptz not null default now(),
  unique(post_id, firebase_uid)
);

create index if not exists idx_post_saves_post on public.post_saves (post_id);
create index if not exists idx_post_saves_uid  on public.post_saves (firebase_uid, created_at desc);

/* ── 4. post_shares — real shares/reposts ─────────────────────────────────── */
create table if not exists public.post_shares (
  id           uuid        primary key default gen_random_uuid(),
  post_id      uuid        not null references public.channel_posts(id) on delete cascade,
  firebase_uid text        not null,
  -- 'repost' = shared to their own network as a signal; 'link' = copied a
  -- shareable link. Both are real, persisted actions — nothing here
  -- fabricates cross-platform delivery.
  share_type   text        not null default 'link',
  created_at   timestamptz not null default now(),
  constraint post_shares_type_check check (share_type in ('repost', 'link')),
  unique(post_id, firebase_uid)
);

create index if not exists idx_post_shares_post on public.post_shares (post_id);

/* ── 5. Atomic save_count / share_count triggers ──────────────────────────── */
-- Same pattern as migration 043's follow-count trigger: counts come only
-- from real rows, never from a client-supplied number.
create or replace function public.sync_post_save_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.channel_posts set save_count = save_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.channel_posts set save_count = greatest(0, save_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_save_count on public.post_saves;
create trigger trg_sync_post_save_count
  after insert or delete on public.post_saves
  for each row execute function public.sync_post_save_count();

create or replace function public.sync_post_share_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.channel_posts set share_count = share_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.channel_posts set share_count = greatest(0, share_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_share_count on public.post_shares;
create trigger trg_sync_post_share_count
  after insert or delete on public.post_shares
  for each row execute function public.sync_post_share_count();

/* ── 6. RLS ────────────────────────────────────────────────────────────────
 * This app authenticates with Firebase, not Supabase Auth, so there is no
 * auth.uid() to key a per-user RLS policy on — every write already goes
 * through a server route that verifies the Firebase ID token and checks
 * author_uid itself (same pattern as every other module in this project).
 * RLS's job here is narrower and still real: give the anon key read-only
 * access to exactly the public-feed slice, so Realtime and public pages can
 * read without the service-role key, and nothing private leaks through it.
 * ────────────────────────────────────────────────────────────────────────── */
alter table public.post_media  enable row level security;
alter table public.post_saves  enable row level security;
alter table public.post_shares enable row level security;

-- channel_posts / post_comments / post_reactions already had RLS enabled
-- with zero policies since migration 012 (service-role only). Add narrow
-- anon SELECT policies for exactly the public slice:
drop policy if exists "public feed posts are readable" on public.channel_posts;
create policy "public feed posts are readable"
  on public.channel_posts for select to anon, authenticated
  using (
    is_removed = false
    and (
      -- a main-feed post, publicly visible
      (channel_id is null and visibility = 'public')
      -- or a post inside a channel that is itself public
      or (channel_id is not null and exists (
        select 1 from public.community_channels c
        where c.id = channel_posts.channel_id and c.visibility = 'public'
      ))
    )
  );

drop policy if exists "comments on public posts are readable" on public.post_comments;
create policy "comments on public posts are readable"
  on public.post_comments for select to anon, authenticated
  using (
    is_removed = false
    and exists (
      select 1 from public.channel_posts p
      where p.id = post_comments.post_id
        and p.is_removed = false
        and (
          (p.channel_id is null and p.visibility = 'public')
          or (p.channel_id is not null and exists (
            select 1 from public.community_channels c
            where c.id = p.channel_id and c.visibility = 'public'
          ))
        )
    )
  );

drop policy if exists "reactions on public posts are readable" on public.post_reactions;
create policy "reactions on public posts are readable"
  on public.post_reactions for select to anon, authenticated
  using (
    post_id is not null
    and exists (
      select 1 from public.channel_posts p
      where p.id = post_reactions.post_id
        and p.is_removed = false
        and (
          (p.channel_id is null and p.visibility = 'public')
          or (p.channel_id is not null and exists (
            select 1 from public.community_channels c
            where c.id = p.channel_id and c.visibility = 'public'
          ))
        )
    )
  );

drop policy if exists "media on public posts are readable" on public.post_media;
create policy "media on public posts are readable"
  on public.post_media for select to anon, authenticated
  using (
    exists (
      select 1 from public.channel_posts p
      where p.id = post_media.post_id
        and p.is_removed = false
        and (
          (p.channel_id is null and p.visibility = 'public')
          or (p.channel_id is not null and exists (
            select 1 from public.community_channels c
            where c.id = p.channel_id and c.visibility = 'public'
          ))
        )
    )
  );

-- post_saves / post_shares intentionally get NO anon policy: "who saved or
-- shared what" is not feed-rendering data (counts are already denormalised
-- onto channel_posts) and stays service-role only, same as migration 012's
-- default for join tables nothing public needs to read directly.

grant select on public.channel_posts to anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant select on public.post_reactions to anon, authenticated;
grant select on public.post_media to anon, authenticated;

/* ── 7. Realtime — likes/comments/new posts update live ───────────────────── */
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.channel_posts;   exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.post_comments;   exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.post_reactions;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.post_media;      exception when duplicate_object then null; end;
  end if;
end;
$$;

alter table public.channel_posts  replica identity full;
alter table public.post_comments  replica identity full;
alter table public.post_reactions replica identity full;

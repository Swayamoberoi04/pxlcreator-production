-- ═══════════════════════════════════════════════════════════════════════════════
-- 050_community_hardening.sql — Phase 5.8
--
-- Two problems, both found by auditing what 5.1–5.7 actually shipped.
--
-- 1. ENGAGEMENT COUNTERS ARE STILL RACY.
--    Migrations 043 and 047 moved follow counts, showcase counts, saves,
--    shares, views and event participants onto triggers precisely because
--    read-modify-write in a route loses concurrent updates. But four counters
--    were never converted and are still maintained by hand in five different
--    API routes:
--
--      channel_posts.comment_count   — feed/[id]/comments, channels/…/comments,
--                                      comments/[commentId]
--      channel_posts.like_count      — feed/[id]/like, channels/…/react
--      showcase_items.like_count     — showcase/[id]/react
--      showcase_items.bookmark_count — showcase/[id]/react
--
--    Each does SELECT count → compute → UPDATE. Two people liking the same
--    post in the same instant both read N and both write N+1, so the post
--    shows one like for two reactions. The comment path is worse: deleting a
--    parent comment cascades its whole subtree, but the route subtracts only
--    1 + direct children, so nested replies leak permanently into the count.
--    These counters feed the ranking formula (comments 4×, likes 1×), so the
--    drift propagates into the leaderboard.
--
--    Fixed the same way every other counter was: triggers own the number,
--    plus a one-time backfill to repair whatever drift already exists.
--
-- 2. community_waitlist DOES NOT EXIST.
--    /api/community/waitlist upserts into it. The table was never created in
--    any migration, so every submission has thrown PGRST205 and returned 500.
--    Confirmed against production. Created here so the endpoint is real.
--
-- Idempotent: safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. channel_posts.comment_count ────────────────────────────────────────── */

-- Counts only rows a reader would actually see, matching what the feed and the
-- ranking formula treat as a comment: is_removed = false. A moderator hiding a
-- comment therefore lowers the count, which the old manual path never did.
create or replace function public.sync_post_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  affected uuid;
begin
  affected := coalesce(new.post_id, old.post_id);

  update public.channel_posts
     set comment_count = (
       select count(*) from public.post_comments c
        where c.post_id = affected and c.is_removed = false
     )
   where id = affected;

  -- An UPDATE that moves a comment between posts has to fix both sides.
  if tg_op = 'UPDATE' and new.post_id is distinct from old.post_id then
    update public.channel_posts
       set comment_count = (
         select count(*) from public.post_comments c
          where c.post_id = old.post_id and c.is_removed = false
       )
     where id = old.post_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_post_comment_count on public.post_comments;
create trigger trg_sync_post_comment_count
  after insert or delete or update of post_id, is_removed on public.post_comments
  for each row execute function public.sync_post_comment_count();

/* ── 2. channel_posts.like_count ───────────────────────────────────────────── */

-- post_reactions holds one row per person per post whatever the emoji, and
-- like_count has always meant "how many people reacted", not "how many chose
-- 'like'". Switching reaction type is an UPDATE and must not change the count.
create or replace function public.sync_post_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  affected uuid;
begin
  affected := coalesce(new.post_id, old.post_id);
  if affected is null then return null; end if;

  update public.channel_posts
     set like_count = (
       select count(*) from public.post_reactions r where r.post_id = affected
     )
   where id = affected;

  return null;
end;
$$;

drop trigger if exists trg_sync_post_like_count on public.post_reactions;
create trigger trg_sync_post_like_count
  after insert or delete on public.post_reactions
  for each row execute function public.sync_post_like_count();

/* ── 3. showcase_items.like_count / bookmark_count ─────────────────────────── */

create or replace function public.sync_showcase_reaction_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  affected uuid;
begin
  affected := coalesce(new.showcase_id, old.showcase_id);

  update public.showcase_items
     set like_count = (
           select count(*) from public.showcase_reactions r
            where r.showcase_id = affected and r.reaction = 'like'
         ),
         bookmark_count = (
           select count(*) from public.showcase_reactions r
            where r.showcase_id = affected and r.reaction = 'bookmark'
         )
   where id = affected;

  return null;
end;
$$;

drop trigger if exists trg_sync_showcase_reaction_counts on public.showcase_reactions;
create trigger trg_sync_showcase_reaction_counts
  after insert or delete or update on public.showcase_reactions
  for each row execute function public.sync_showcase_reaction_counts();

/* ── 4. Backfill — repair drift the manual routes already caused ───────────── */

update public.channel_posts p
   set comment_count = (
     select count(*) from public.post_comments c
      where c.post_id = p.id and c.is_removed = false
   )
 where p.comment_count is distinct from (
     select count(*) from public.post_comments c
      where c.post_id = p.id and c.is_removed = false
   );

update public.channel_posts p
   set like_count = (
     select count(*) from public.post_reactions r where r.post_id = p.id
   )
 where p.like_count is distinct from (
     select count(*) from public.post_reactions r where r.post_id = p.id
   );

update public.showcase_items s
   set like_count = (
         select count(*) from public.showcase_reactions r
          where r.showcase_id = s.id and r.reaction = 'like'
       ),
       bookmark_count = (
         select count(*) from public.showcase_reactions r
          where r.showcase_id = s.id and r.reaction = 'bookmark'
       );

/* ── 5. community_waitlist — the table the route has always assumed ────────── */

create table if not exists public.community_waitlist (
  id        uuid        primary key default gen_random_uuid(),
  email     text        not null,
  name      text,
  feature   text        not null default 'general',
  joined_at timestamptz not null default now(),
  unique (email, feature)
);

create index if not exists idx_community_waitlist_feature
  on public.community_waitlist (feature, joined_at desc);

-- Email addresses collected from a public form. RLS on with no policy at all:
-- the anon key can neither read nor write it, and the route reaches it through
-- the service role after validating the payload. Same posture as every other
-- private community table (verified against production in Phase 5.8).
alter table public.community_waitlist enable row level security;

/* ── 6. Indexes for the hot paths the audit found doing sequential scans ───── */

-- post_comments is read by post id on every feed detail view, and counted by
-- post id by the trigger above.
create index if not exists idx_post_comments_post_visible
  on public.post_comments (post_id) where is_removed = false;

-- post_reactions is counted by post id by the trigger and probed by
-- (post_id, firebase_uid) on every like toggle.
create index if not exists idx_post_reactions_post
  on public.post_reactions (post_id);

-- showcase_reactions is counted by (showcase_id, reaction) by the trigger.
create index if not exists idx_showcase_reactions_showcase
  on public.showcase_reactions (showcase_id, reaction);

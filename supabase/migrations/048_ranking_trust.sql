-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 048 — Ranking, Personalization + Trust (Phase 5.6)
--
-- Extends the community systems built in 043–047. Three real bugs found while
-- auditing are fixed here or in the routes that accompany this migration:
--
--   1. community_profiles.reputation_score was only ever incremented by the
--      project-review route (+5 per 4–5★ review). The documented scoring
--      formula in /api/community/reputation computed a score and threw it
--      away — it was never written back. So the leaderboard, which sorts by
--      reputation_score, effectively ranked everyone at zero. Ranking now
--      lives in creator_rank_scores, is recomputed from real rows, and is
--      itemised so it can be explained wherever it appears.
--   2. is_banned (migration 039) was never enforced in discovery. Banned
--      profiles still appeared in Discover/trending/new/similar/feed. The
--      accompanying route changes filter them out everywhere.
--   3. content_reports had no uniqueness, so the same user could report the
--      same target repeatedly and inflate the queue.
--
-- New tables:
--   • creator_rank_scores      — transparent, itemised, DB-backed ranking
--   • user_blocks              — block (mutual) and mute (one-way)
--   • recommendation_dismissals — "don't show me this again"
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. creator_rank_scores ────────────────────────────────────────────────────
 * One row per creator. Every component is stored separately so the score can
 * be shown as an itemised breakdown rather than an unexplained number, and so
 * a reader can check the arithmetic. `breakdown` holds the raw inputs (how
 * many saves, comments, etc.) that produced each component.
 *
 * The weights live in ONE place — src/lib/community/ranking.ts — and this
 * table stores what that formula produced, never a hand-set number.
 * ──────────────────────────────────────────────────────────────────────────── */
create table if not exists public.creator_rank_scores (
  firebase_uid       text        primary key,
  total_score        integer     not null default 0,
  -- Components, each capped by the formula (see ranking.ts):
  profile_score      integer     not null default 0,  -- meaningful profile completeness
  contribution_score integer     not null default 0,  -- posts/showcases actually published
  engagement_score   integer     not null default 0,  -- saves + comments received, likes weighted far lower
  project_score      integer     not null default 0,  -- completed projects + reviews received
  community_score    integer     not null default 0,  -- followers, capped hard
  penalty_score      integer     not null default 0,  -- upheld reports against this creator (negative)
  breakdown          jsonb       not null default '{}',
  computed_at        timestamptz not null default now()
);

create index if not exists idx_rank_scores_total on public.creator_rank_scores (total_score desc);
create index if not exists idx_rank_scores_stale on public.creator_rank_scores (computed_at);

comment on table public.creator_rank_scores is
  'Transparent creator ranking. Every column is produced by the documented formula in src/lib/community/ranking.ts from real rows — never hand-set, never a hidden popularity multiplier. breakdown holds the raw counts behind each component so the score can be explained in the UI.';

/* ── 2. user_blocks — block (mutual) and mute (one-way) ────────────────────── */
create table if not exists public.user_blocks (
  id           uuid        primary key default gen_random_uuid(),
  blocker_uid  text        not null,
  blocked_uid  text        not null,
  -- block = neither party sees the other, and interaction is refused.
  -- mute  = the blocker stops seeing them; the muted user notices nothing.
  block_type   text        not null default 'block',
  created_at   timestamptz not null default now(),
  unique(blocker_uid, blocked_uid),
  constraint user_blocks_type_check check (block_type in ('block', 'mute')),
  constraint user_blocks_no_self_check check (blocker_uid <> blocked_uid)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks (blocker_uid);
create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_uid);

/* ── 3. recommendation_dismissals ──────────────────────────────────────────── */
create table if not exists public.recommendation_dismissals (
  id           uuid        primary key default gen_random_uuid(),
  firebase_uid text        not null,
  target_type  text        not null,   -- 'creator' | 'project' | 'event' | 'post'
  target_id    text        not null,
  created_at   timestamptz not null default now(),
  unique(firebase_uid, target_type, target_id)
);

create index if not exists idx_rec_dismissals_uid on public.recommendation_dismissals (firebase_uid, target_type);

/* ── 4. content_reports: dedupe + resolution trail ─────────────────────────── */
alter table public.content_reports
  add column if not exists resolution_note   text,
  add column if not exists moderation_action text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'content_reports_status_check') then
    alter table public.content_reports add constraint content_reports_status_check
      check (status in ('pending', 'reviewed', 'dismissed', 'actioned'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'content_reports_target_type_check') then
    alter table public.content_reports add constraint content_reports_target_type_check
      check (target_type in ('post', 'comment', 'showcase', 'profile', 'channel', 'project', 'event', 'resource'));
  end if;
end;
$$;

comment on column public.content_reports.reporter_uid is
  'Never exposed to the reported party or any public surface — only the admin queue reads it.';

-- One report per person per target. Re-reporting the same thing was previously
-- unbounded, which let a single user flood the moderation queue.
create unique index if not exists idx_content_reports_unique_reporter
  on public.content_reports (reporter_uid, target_type, target_id);

create index if not exists idx_content_reports_target_pending
  on public.content_reports (target_type, target_id)
  where status = 'pending';

/* ── 5. Banned creators must not rank ──────────────────────────────────────── */
-- Ranking rows are purged for banned users so a banned account can never sit
-- on the leaderboard. (Discovery-side enforcement lives in the API routes.)
create or replace function public.purge_rank_on_ban()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_banned = true and (old.is_banned is distinct from new.is_banned) then
    delete from public.creator_rank_scores where firebase_uid = new.firebase_uid;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_purge_rank_on_ban on public.community_profiles;
create trigger trg_purge_rank_on_ban
  after update of is_banned on public.community_profiles
  for each row execute function public.purge_rank_on_ban();

delete from public.creator_rank_scores
 where firebase_uid in (select firebase_uid from public.community_profiles where is_banned = true);

/* ── 6. RLS ────────────────────────────────────────────────────────────────
 * Ranking is public by design — a score nobody can see cannot be transparent.
 * Everything else here is private: who blocked whom, what someone dismissed,
 * and above all who reported what, are never anon-readable.
 * ────────────────────────────────────────────────────────────────────────── */
alter table public.creator_rank_scores        enable row level security;
alter table public.user_blocks                enable row level security;
alter table public.recommendation_dismissals  enable row level security;

drop policy if exists "rank scores are public" on public.creator_rank_scores;
create policy "rank scores are public"
  on public.creator_rank_scores for select to anon, authenticated
  using (true);

grant select on public.creator_rank_scores to anon, authenticated;

-- user_blocks / recommendation_dismissals / content_reports intentionally get
-- NO anon policy. content_reports in particular carries reporter_uid, which
-- must never leak to the reported party — it stays service-role only, read
-- exclusively by the admin queue.

/* ── 7. Realtime ───────────────────────────────────────────────────────────── */
-- Rank changes are slow and not worth a live subscription; blocks and reports
-- are private. Nothing new is published here on purpose.

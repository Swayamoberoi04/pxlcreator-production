-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 049 — Fix content_reports.target_id type
--
-- Bug found by live verification of Phase 5.6:
--
--   content_reports.target_id was declared `uuid` in migration 012. Every
--   reportable entity has a uuid primary key EXCEPT a creator profile, which
--   is identified by its Firebase UID — a text string like "abc123XYZ".
--
--   So `target_type = 'profile'` reports could never be written at all:
--
--     invalid input syntax for type uuid: "__probe_1789900337106"
--
--   That broke two things at once:
--     • reporting a creator's profile (the report route's `profile` target)
--     • the ranking penalty in src/lib/community/ranking.ts, which counts
--       upheld reports where target_type='profile' AND target_id=<uid> —
--       a query that could never match, so profile reports silently cost
--       a creator nothing.
--
--   Same class of bug as migration 037 (admin_resource_versions.resource_id
--   was uuid and broke the ai_studio_settings singleton's TEXT key).
--
-- uuid → text always casts cleanly, so no data is lost and every existing
-- report keeps its identifier verbatim.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.content_reports
  alter column target_id type text using target_id::text;

comment on column public.content_reports.target_id is
  'TEXT, not uuid: most targets have a uuid primary key, but a profile target is a Firebase UID (text). Widened in migration 049 after profile reports were found to be impossible.';

-- The unique index and the pending-target index were created against the old
-- column type; recreate them so they index the text column.
drop index if exists public.idx_content_reports_unique_reporter;
create unique index if not exists idx_content_reports_unique_reporter
  on public.content_reports (reporter_uid, target_type, target_id);

drop index if exists public.idx_content_reports_target_pending;
create index if not exists idx_content_reports_target_pending
  on public.content_reports (target_type, target_id)
  where status = 'pending';

drop index if exists public.idx_reports_target;
create index if not exists idx_reports_target
  on public.content_reports (target_type, target_id);

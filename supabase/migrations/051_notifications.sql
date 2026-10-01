-- ═══════════════════════════════════════════════════════════════════════════════
-- 051_notifications.sql — Phase 5.9
--
-- Extends community_notifications (migration 012). No second notification
-- system: the table, its two indexes, its RLS posture (enabled, no policy —
-- service role only, verified in Phase 5.8) and every existing writer stay.
--
-- 1. dedupe_key + unique(recipient_uid, dedupe_key)
--    Nothing prevented duplicates before: follow → unfollow → follow sent a
--    second "started following you", and a retried request sent two. Each
--    writer now supplies a key naming the underlying fact (e.g.
--    "follow:<actor>", "post_like:<actor>:<post>") and inserts with
--    ON CONFLICT DO NOTHING, so the same fact can only ever notify once.
--
-- 2. group_key
--    Lets the API collapse low-value repeats ("A, B and 3 others liked your
--    post") without dropping rows or hiding individual important events.
--
-- 3. community_notification_prefs
--    Per-user muted types, plus channel_token: a random, per-user secret used
--    as the Realtime topic. Firebase auth means there is no auth.uid() for a
--    Realtime RLS policy to key on, so a postgres_changes subscription on this
--    table would either receive nothing (anon is sealed out) or require
--    opening the table to anon — unacceptable. Instead a trigger broadcasts a
--    content-free "ping" to notify:<channel_token>. The token is only ever
--    returned to its owner by the authenticated API. The ping carries no
--    notification data at all; the client refetches through the
--    authenticated route, so even a guessed topic reveals nothing but timing.
--
-- NOTE (added after live testing): on this project realtime.send() from the
-- trigger below does not deliver — a browser subscribed to the topic received
-- nothing. Delivery is done instead by lib/community/notify.ts through
-- Realtime's server-side broadcast API. The trigger is left in place: it is
-- wrapped to fail silently, so it is harmless.
--
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.community_notifications
  add column if not exists dedupe_key text,
  add column if not exists group_key  text;

-- Deliberately NOT partial: PostgREST's on_conflict cannot name a partial
-- index's predicate. NULLs are distinct in a unique index, so legacy rows
-- with no dedupe_key never collide.
create unique index if not exists uq_notifs_recipient_dedupe
  on public.community_notifications (recipient_uid, dedupe_key);

-- Cursor pagination orders by (created_at desc, id desc).
create index if not exists idx_notifs_recipient_cursor
  on public.community_notifications (recipient_uid, created_at desc, id desc);

/* ── Preferences + Realtime channel token ──────────────────────────────────── */
create table if not exists public.community_notification_prefs (
  firebase_uid  text        primary key,
  muted_types   text[]      not null default '{}',
  channel_token uuid        not null default gen_random_uuid() unique,
  updated_at    timestamptz not null default now()
);

alter table public.community_notification_prefs enable row level security;
-- No policy: service role only. The token is a capability; it must never be
-- readable by the anon key.

/* ── Content-free Realtime ping on insert ──────────────────────────────────── */
create or replace function public.ping_notification_recipient()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tok uuid;
begin
  insert into public.community_notification_prefs (firebase_uid)
  values (new.recipient_uid)
  on conflict (firebase_uid) do nothing;

  select channel_token into tok
    from public.community_notification_prefs
   where firebase_uid = new.recipient_uid;

  begin
    perform realtime.send('{}'::jsonb, 'ping', 'notify:' || tok::text, false);
  exception when others then
    -- Realtime being unavailable must never fail the write that caused the
    -- notification. The client also refetches on focus/mount.
    null;
  end;

  return null;
end;
$$;

drop trigger if exists trg_ping_notification_recipient on public.community_notifications;
create trigger trg_ping_notification_recipient
  after insert on public.community_notifications
  for each row execute function public.ping_notification_recipient();

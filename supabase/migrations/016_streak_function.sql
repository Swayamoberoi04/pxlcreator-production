-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 016 — Consistency Streak Function
--
-- Adds update_consistency_streak(p_uid text) → void
--
-- The function reads the CURRENT value of last_activity_at on the
-- creator_profiles row, compares it against TODAY (UTC), and then either:
--   • extends the streak by 1   (last activity was yesterday)
--   • resets the streak to 1    (last activity was 2+ days ago, or NULL)
--   • does nothing              (last activity was already today)
--
-- IMPORTANT: this function must be called BEFORE last_activity_at is
-- overwritten. The progress API calls it via Supabase RPC then updates
-- last_activity_at in the same request.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.update_consistency_streak(p_uid text)
returns void
language plpgsql
security definer          -- executes with owner privileges (service role)
as $$
declare
  v_last_activity  timestamptz;
  v_today          date := (now() at time zone 'utc')::date;
  v_last_date      date;
begin
  select last_activity_at
    into v_last_activity
    from public.creator_profiles
   where firebase_uid = p_uid;

  -- Row not found — nothing to do
  if not found then
    return;
  end if;

  -- No previous activity → start streak at 1
  if v_last_activity is null then
    update public.creator_profiles
       set consistency_streak = 1
     where firebase_uid = p_uid;
    return;
  end if;

  v_last_date := (v_last_activity at time zone 'utc')::date;

  if v_last_date = v_today then
    -- Already active today: streak is current, no change
    null;

  elsif v_last_date = v_today - interval '1 day' then
    -- Active yesterday: extend streak
    update public.creator_profiles
       set consistency_streak = coalesce(consistency_streak, 0) + 1
     where firebase_uid = p_uid;

  else
    -- Gap of 2+ days: streak broken, reset to 1
    update public.creator_profiles
       set consistency_streak = 1
     where firebase_uid = p_uid;

  end if;
end;
$$;

comment on function public.update_consistency_streak(text) is
  'Extends or resets consistency_streak on creator_profiles based on last_activity_at. Call BEFORE updating last_activity_at.';

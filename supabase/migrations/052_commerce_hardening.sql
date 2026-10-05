-- ═══════════════════════════════════════════════════════════════════════════════
-- 052_commerce_hardening.sql — Phase 5.10.0 (security/reliability hotfix, part 1 of 2)
--
-- RUN ORDER: run this BEFORE the 5.10.0 code deploys (the new payment code
-- calls the functions below; the old code doesn't touch them, so running it
-- early is harmless). Then deploy. Then run 053.
--
-- Forward-only. Drops nothing, deletes no data. Idempotent.
--
-- 1. SECRET PRESET/BUNDLE COLUMNS READABLE BY THE PUBLIC ANON KEY
--    Fixed in 053, which must run after deploy — see that file.
--
-- 2. PAYMENT FINALISATION WAS NOT IDEMPOTENT
--    verify-payment and the Razorpay webhook both finalised orders with
--    read-then-write logic, so concurrent/repeated calls could double-insert
--    payment_transactions and double-issue download_tokens. One authoritative
--    function now does it in a single transaction under a row lock.
--
-- 3. MIGRATION DRIFT: 009 WAS NEVER APPLIED
--    Production `subscriptions` is still the 004 shape and
--    `subscription_payments` does not exist, so Premium checkout could never
--    succeed. 009 itself DROPs and recreates `subscriptions`; this does not.
--    It adds 009's missing columns and creates the missing table instead.
--    (site_seo from 035 is also missing; not commerce, not touched here.)
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. Column privileges: see 053 (must run AFTER this release deploys) ─── */

/* ── 2. Idempotent order finalisation ──────────────────────────────────────── */

-- One download token per order line. Both tables are empty in production, so
-- this cannot fail on existing data.
create unique index if not exists uq_download_tokens_order_item
  on public.download_tokens (order_item_id);

create or replace function public.finalize_order_payment(
  p_order_id          uuid,
  p_razorpay_order_id text,
  p_payment_id        text,
  p_amount_paise      bigint,
  p_signature         text default null
)
returns table (newly_paid boolean, order_id uuid, firebase_uid text, coupon_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  won boolean := false;
begin
  -- Row lock: a concurrent caller blocks here until we commit, then sees the
  -- order already paid and falls through to the idempotent branch.
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;

  if o.razorpay_order_id is distinct from p_razorpay_order_id then
    raise exception 'razorpay_order_mismatch' using errcode = 'P0001';
  end if;
  if round(o.total_inr * 100)::bigint <> p_amount_paise then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;

  if o.status = 'paid' then
    if o.razorpay_payment_id is distinct from p_payment_id then
      -- A second, different payment for an already-paid order. Record it so
      -- it is visible for refund, but grant nothing more.
      insert into public.payment_transactions (order_id, razorpay_payment_id, razorpay_order_id, amount_inr, status, captured_at)
      values (o.id, p_payment_id, p_razorpay_order_id, p_amount_paise / 100.0, 'captured', now())
      on conflict (razorpay_payment_id) do nothing;
    end if;
  elsif o.status in ('pending', 'failed') then
    -- 'failed' is allowed: Razorpay lets a buyer retry within the same order,
    -- so an earlier attempt's payment.failed must not block a later capture.
    update public.orders
       set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now(), updated_at = now()
     where id = o.id;
    won := true;
  else
    raise exception 'order_not_payable:%', o.status using errcode = 'P0001';
  end if;

  insert into public.payment_transactions
    (order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature, amount_inr, status, captured_at)
  values (o.id, p_payment_id, p_razorpay_order_id, p_signature, p_amount_paise / 100.0, 'captured', now())
  on conflict (razorpay_payment_id) do update
     set status = 'captured',
         captured_at = coalesce(public.payment_transactions.captured_at, excluded.captured_at),
         razorpay_signature = coalesce(public.payment_transactions.razorpay_signature, excluded.razorpay_signature);

  -- Tokens are issued for the paid order regardless of which caller won, and
  -- the unique index makes a second issue impossible.
  if won or o.status = 'paid' then
    insert into public.download_tokens (order_item_id, firebase_uid, token, preset_title, preset_slug, download_url, expires_at)
    select oi.id, o.firebase_uid, gen_random_uuid()::text, oi.preset_title, oi.preset_slug, p.download_url,
           now() + interval '30 days'
      from public.order_items oi
      join public.presets p on p.id = oi.preset_id
     where oi.order_id = o.id
    on conflict (order_item_id) do nothing;
  end if;

  return query select won, o.id, o.firebase_uid, o.coupon_id;
end;
$$;

revoke all on function public.finalize_order_payment(uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.finalize_order_payment(uuid, text, text, bigint, text) to service_role;

/* ── 3. Reconcile migration 009 (forward-only) ─────────────────────────────── */

-- Columns 009 expected on subscriptions. Nullable: they are always supplied by
-- the routes, and a NOT NULL add would fail if rows ever existed.
alter table public.subscriptions
  add column if not exists email               text,
  add column if not exists plan_id             text,
  add column if not exists billing_cycle       text,
  add column if not exists amount_usd          numeric(10,2),
  add column if not exists amount_inr          numeric(10,2),
  add column if not exists razorpay_order_id   text,
  add column if not exists razorpay_payment_id text;

-- 004's status check lacks 'expired' (used by 009's expire_subscriptions()).
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'cancelled', 'past_due', 'trial', 'inactive', 'expired'));

-- 004's FK to user_profiles made activation fail for any buyer without a
-- user_profiles row; 009 intentionally has no FK.
alter table public.subscriptions drop constraint if exists subscriptions_firebase_uid_fkey;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_plan_id_check') then
    alter table public.subscriptions add constraint subscriptions_plan_id_check
      check (plan_id is null or plan_id in ('creator', 'pro'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_billing_cycle_check') then
    alter table public.subscriptions add constraint subscriptions_billing_cycle_check
      check (billing_cycle is null or billing_cycle in ('monthly', 'yearly'));
  end if;
end $$;

create index if not exists idx_subscriptions_uid_status on public.subscriptions (firebase_uid, status);
create index if not exists idx_subscriptions_rzp_order  on public.subscriptions (razorpay_order_id);
create index if not exists idx_subscriptions_period_end on public.subscriptions (current_period_end);
-- One subscription per Razorpay order: activation can never double-insert.
create unique index if not exists uq_subscriptions_rzp_order
  on public.subscriptions (razorpay_order_id) where razorpay_order_id is not null;

create table if not exists public.subscription_payments (
  id                  uuid          primary key default gen_random_uuid(),
  subscription_id     uuid          references public.subscriptions(id) on delete set null,
  firebase_uid        text          not null,
  plan_id             text          not null,
  billing_cycle       text          not null,
  razorpay_order_id   text          not null unique,
  razorpay_payment_id text,
  razorpay_signature  text,
  amount_usd          numeric(10,2) not null,
  amount_inr          numeric(10,2) not null,
  status              text          not null default 'pending'
                        check (status in ('pending', 'captured', 'failed', 'refunded')),
  period_start        timestamptz,
  period_end          timestamptz,
  created_at          timestamptz   not null default now()
);
create index if not exists idx_sub_payments_uid on public.subscription_payments (firebase_uid);
-- RLS on, no policy: service role only (009's auth.uid() policies are
-- meaningless under Firebase auth and are deliberately not recreated).
alter table public.subscription_payments enable row level security;
alter table public.subscriptions         enable row level security;

-- Idempotent subscription activation: claim the pending payment row under a
-- lock, then create exactly one subscription for it.
create or replace function public.activate_subscription_payment(
  p_razorpay_order_id text,
  p_payment_id        text,
  p_amount_paise      bigint,
  p_duration_ms       bigint,
  p_signature         text default null,
  p_email             text default null
)
returns table (newly_activated boolean, subscription_id uuid, period_end timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  sp public.subscription_payments%rowtype;
  sid uuid;
  p_start timestamptz := now();
  p_end   timestamptz := now() + (p_duration_ms || ' milliseconds')::interval;
begin
  select * into sp from public.subscription_payments where razorpay_order_id = p_razorpay_order_id for update;
  if not found then raise exception 'subscription_payment_not_found' using errcode = 'P0002'; end if;
  if round(sp.amount_inr * 100)::bigint <> p_amount_paise then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;

  if sp.status = 'captured' then
    return query select false, sp.subscription_id, sp.period_end;
    return;
  end if;
  if sp.status not in ('pending', 'failed') then
    raise exception 'payment_not_payable:%', sp.status using errcode = 'P0001';
  end if;

  update public.subscriptions
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where firebase_uid = sp.firebase_uid and status = 'active';

  insert into public.subscriptions
    (firebase_uid, email, plan_id, billing_cycle, status, amount_usd, amount_inr,
     current_period_start, current_period_end, razorpay_order_id, razorpay_payment_id, updated_at)
  values
    (sp.firebase_uid, p_email, sp.plan_id, sp.billing_cycle, 'active', sp.amount_usd, sp.amount_inr,
     p_start, p_end, p_razorpay_order_id, p_payment_id, now())
  returning id into sid;

  update public.subscription_payments
     set subscription_id = sid, razorpay_payment_id = p_payment_id,
         razorpay_signature = coalesce(p_signature, razorpay_signature),
         status = 'captured', period_start = p_start, period_end = p_end
   where id = sp.id;

  return query select true, sid, p_end;
end;
$$;

revoke all on function public.activate_subscription_payment(text, text, bigint, bigint, text, text) from public, anon, authenticated;
grant execute on function public.activate_subscription_payment(text, text, bigint, bigint, text, text) to service_role;

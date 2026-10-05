-- ═══════════════════════════════════════════════════════════════════════════════
-- 054_creator_monetization_schema.sql — Phase 5.10.1
--
-- Database foundation ONLY for creator monetization. No route, checkout,
-- payment or download behaviour changes. Forward-only, idempotent, drops
-- nothing.
--
-- Audited against production before writing (2026-10-05): none of the new
-- columns or tables existed; order_items = 4 rows (all preset, qty 1),
-- orders = 4 pending, no discounts, no orphans; payment_transactions and
-- download_tokens empty.
--
-- Conventions:
--  • Money is INR numeric(12,2) — what Razorpay actually charges. USD stays a
--    display concern, as today.
--  • seller_uid / creator_uid NULL = PXL-owned. Every existing row is PXL.
--  • Every new table: RLS on, no policy, and table privileges revoked from
--    anon/authenticated. Firebase auth means there is no auth.uid() to scope
--    a policy to; all access is through service-role routes that verify the
--    Firebase ID token — the same model as every other private table.
-- ═══════════════════════════════════════════════════════════════════════════════

/* ── 1. presets: ownership + review ────────────────────────────────────────── */
alter table public.presets
  add column if not exists creator_uid   text,
  add column if not exists review_status text,
  add column if not exists file_path     text;

-- Every existing preset is a live PXL product, so it is 'approved'. The
-- default is also 'approved' so the existing admin preset routes, which do
-- not know this column, keep creating live PXL presets exactly as before.
-- Creator-owned presets are forced to start as 'draft' by the trigger below,
-- regardless of what a caller sends.
update public.presets set review_status = 'approved' where review_status is null;
alter table public.presets alter column review_status set default 'approved';
alter table public.presets alter column review_status set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'presets_review_status_check') then
    alter table public.presets add constraint presets_review_status_check
      check (review_status in ('draft', 'pending', 'approved', 'rejected'));
  end if;
end $$;

create or replace function public.presets_creator_starts_draft()
returns trigger language plpgsql as $$
begin
  if new.creator_uid is not null then
    new.review_status := 'draft';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_presets_creator_starts_draft on public.presets;
create trigger trg_presets_creator_starts_draft
  before insert on public.presets
  for each row execute function public.presets_creator_starts_draft();

create index if not exists idx_presets_creator on public.presets (creator_uid) where creator_uid is not null;
create index if not exists idx_presets_review_pending on public.presets (review_status) where review_status = 'pending';

-- NOTE: migration 053 granted anon SELECT on an explicit column list, so
-- these three new columns are NOT publicly readable. That is intended:
-- file_path is private, and ownership/review state is exposed later through
-- server routes on purpose, not by default.

/* ── 2. creator_seller_accounts ────────────────────────────────────────────── */
create table if not exists public.creator_seller_accounts (
  firebase_uid     text        primary key,
  status           text        not null default 'applied'
                     check (status in ('applied', 'approved', 'suspended', 'rejected')),
  applied_at       timestamptz not null default now(),
  reviewed_by      text,
  reviewed_at      timestamptz,
  review_note      text,
  fee_bps_override integer     check (fee_bps_override is null or fee_bps_override between 0 and 10000),
  payout_status    text        not null default 'not_enabled'
                     check (payout_status in ('not_enabled')), -- widened when payouts exist
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint seller_review_consistent check (
    (status = 'applied') or (reviewed_at is not null)
  )
);
create index if not exists idx_seller_accounts_status on public.creator_seller_accounts (status);

/* ── 3. order_items: what was sold, by whom, and the split ─────────────────── */
alter table public.order_items
  add column if not exists item_type         text,
  add column if not exists item_id           uuid,
  add column if not exists seller_uid        text,
  add column if not exists gross_inr         numeric(12,2),
  add column if not exists discount_inr      numeric(12,2),
  add column if not exists platform_fee_inr  numeric(12,2),
  add column if not exists creator_share_inr numeric(12,2),
  add column if not exists fee_bps           integer;

-- Backfill existing rows as PXL-owned preset sales: PXL keeps the whole net
-- amount (fee 100%, creator share 0). Discounts are allocated pro-rata from
-- the order; production has none today, but the formula is correct anyway.
update public.order_items oi
   set item_type         = 'preset',
       item_id           = oi.preset_id,
       gross_inr         = oi.price_inr * oi.quantity,
       discount_inr      = case when o.subtotal_inr > 0
                                then round(o.discount_amount_inr * (oi.price_inr * oi.quantity) / o.subtotal_inr, 2)
                                else 0 end,
       fee_bps           = 10000,
       creator_share_inr = 0
  from public.orders o
 where o.id = oi.order_id and oi.item_type is null;

update public.order_items
   set platform_fee_inr = gross_inr - discount_inr
 where platform_fee_inr is null and gross_inr is not null;

alter table public.order_items alter column item_type    set default 'preset';
alter table public.order_items alter column discount_inr set default 0;

-- The current checkout (unchanged in this phase) inserts only preset_id /
-- price / quantity. This fills the new columns for those rows so the data
-- stays complete without touching the route: anything it doesn't set is
-- derived as a PXL-owned preset sale. Rows that DO set a seller (5.10.4+)
-- are left as given and must satisfy the split constraint below.
create or replace function public.order_items_fill_defaults()
returns trigger language plpgsql as $$
begin
  new.item_type := coalesce(new.item_type, 'preset');
  if new.item_type = 'preset' then
    new.item_id := coalesce(new.item_id, new.preset_id);
  end if;
  new.gross_inr    := coalesce(new.gross_inr, new.price_inr * new.quantity);
  new.discount_inr := coalesce(new.discount_inr, 0);
  if new.seller_uid is null then
    new.fee_bps           := coalesce(new.fee_bps, 10000);
    new.creator_share_inr := coalesce(new.creator_share_inr, 0);
    new.platform_fee_inr  := coalesce(new.platform_fee_inr, new.gross_inr - new.discount_inr);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_items_fill_defaults on public.order_items;
create trigger trg_order_items_fill_defaults
  before insert on public.order_items
  for each row execute function public.order_items_fill_defaults();

alter table public.order_items alter column item_type set not null;
alter table public.order_items alter column item_id   set not null;
alter table public.order_items alter column gross_inr set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_item_type_check') then
    alter table public.order_items add constraint order_items_item_type_check
      check (item_type in ('preset', 'bundle', 'course', 'service'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_fee_bps_check') then
    alter table public.order_items add constraint order_items_fee_bps_check
      check (fee_bps is null or fee_bps between 0 and 10000);
  end if;
  -- The split must always add up exactly: platform + creator = gross − discount.
  if not exists (select 1 from pg_constraint where conname = 'order_items_split_balances') then
    alter table public.order_items add constraint order_items_split_balances check (
      platform_fee_inr is null or creator_share_inr is null
      or platform_fee_inr + creator_share_inr = gross_inr - coalesce(discount_inr, 0)
    );
  end if;
  -- A creator sale must carry a fully computed split; a PXL sale never pays a creator.
  if not exists (select 1 from pg_constraint where conname = 'order_items_seller_split') then
    alter table public.order_items add constraint order_items_seller_split check (
      (seller_uid is null and coalesce(creator_share_inr, 0) = 0)
      or (seller_uid is not null and fee_bps is not null
          and platform_fee_inr is not null and creator_share_inr is not null and creator_share_inr >= 0)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_amounts_nonneg') then
    alter table public.order_items add constraint order_items_amounts_nonneg check (
      gross_inr >= 0 and coalesce(discount_inr, 0) >= 0 and coalesce(discount_inr, 0) <= gross_inr
      and (platform_fee_inr is null or platform_fee_inr >= 0)
    );
  end if;
end $$;

create index if not exists idx_order_items_seller on public.order_items (seller_uid, created_at desc) where seller_uid is not null;
create index if not exists idx_order_items_item   on public.order_items (item_type, item_id);

/* ── 4. entitlements ───────────────────────────────────────────────────────── */
-- Not read by any route yet; 5.10.4 starts writing and reading it (and must
-- backfill from paid orders then — there are none in production today).
-- Guest purchases have no uid and remain served by download tokens.
create table if not exists public.entitlements (
  id            uuid        primary key default gen_random_uuid(),
  firebase_uid  text        not null,
  item_type     text        not null check (item_type in ('preset', 'bundle', 'course', 'service')),
  item_id       uuid        not null,
  order_item_id uuid        references public.order_items(id) on delete set null,
  status        text        not null default 'active' check (status in ('active', 'revoked')),
  granted_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  constraint entitlement_revocation_consistent check ((status = 'revoked') = (revoked_at is not null))
);
-- One live grant per user per item; history of revoked grants is kept.
create unique index if not exists uq_entitlements_active
  on public.entitlements (firebase_uid, item_type, item_id) where status = 'active';
-- One grant per order line, so finalisation retries cannot double-grant.
create unique index if not exists uq_entitlements_order_item
  on public.entitlements (order_item_id) where order_item_id is not null;
create index if not exists idx_entitlements_user on public.entitlements (firebase_uid, status);

/* ── 5. creator_ledger_entries (append-oriented) ───────────────────────────── */
create table if not exists public.creator_ledger_entries (
  id              uuid          primary key default gen_random_uuid(),
  seller_uid      text          not null references public.creator_seller_accounts(firebase_uid) on delete restrict,
  order_item_id   uuid          references public.order_items(id) on delete restrict,
  type            text          not null check (type in ('sale', 'refund_reversal', 'adjustment')),
  amount_inr      numeric(12,2) not null,
  status          text          not null default 'pending' check (status in ('pending', 'available', 'reversed')),
  available_at    timestamptz,
  idempotency_key text          not null unique,
  note            text,
  created_at      timestamptz   not null default now(),
  constraint ledger_sign_matches_type check (
    (type = 'sale' and amount_inr > 0)
    or (type = 'refund_reversal' and amount_inr < 0)
    or (type = 'adjustment' and amount_inr <> 0)
  ),
  constraint ledger_sale_has_order_item check (type <> 'sale' or order_item_id is not null)
);
create index if not exists idx_ledger_seller on public.creator_ledger_entries (seller_uid, created_at desc);
create index if not exists idx_ledger_order_item on public.creator_ledger_entries (order_item_id);
create index if not exists idx_ledger_pending_due on public.creator_ledger_entries (available_at) where status = 'pending';

-- Append-only: an entry's money facts can never change and rows are never
-- deleted. Only status / available_at may move (pending → available, or
-- → reversed); corrections are new entries.
create or replace function public.ledger_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'creator_ledger_entries is append-only' using errcode = 'P0001';
  end if;
  if new.seller_uid      is distinct from old.seller_uid
  or new.order_item_id   is distinct from old.order_item_id
  or new.type            is distinct from old.type
  or new.amount_inr      is distinct from old.amount_inr
  or new.idempotency_key is distinct from old.idempotency_key
  or new.created_at      is distinct from old.created_at then
    raise exception 'creator_ledger_entries money facts are immutable' using errcode = 'P0001';
  end if;
  if old.status = 'reversed' and new.status <> 'reversed' then
    raise exception 'a reversed ledger entry cannot be reopened' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ledger_guard on public.creator_ledger_entries;
create trigger trg_ledger_guard
  before update or delete on public.creator_ledger_entries
  for each row execute function public.ledger_guard();

/* ── 6. refunds ────────────────────────────────────────────────────────────── */
create table if not exists public.refunds (
  id                 uuid          primary key default gen_random_uuid(),
  order_id           uuid          not null references public.orders(id) on delete restrict,
  order_item_id      uuid          references public.order_items(id) on delete restrict,
  amount_inr         numeric(12,2) not null check (amount_inr > 0),
  razorpay_refund_id text          unique,
  status             text          not null default 'pending'
                       check (status in ('pending', 'processed', 'failed')),
  reason             text,
  initiated_by       text          not null,
  created_at         timestamptz   not null default now(),
  processed_at       timestamptz,
  constraint refund_processed_consistent check ((status = 'processed') = (processed_at is not null))
);
create index if not exists idx_refunds_order on public.refunds (order_id);
create index if not exists idx_refunds_order_item on public.refunds (order_item_id) where order_item_id is not null;

/* ── 7. Lock down every new table ──────────────────────────────────────────── */
alter table public.creator_seller_accounts enable row level security;
alter table public.entitlements            enable row level security;
alter table public.creator_ledger_entries  enable row level security;
alter table public.refunds                 enable row level security;

-- Belt and braces: RLS with no policy already denies anon/authenticated, but
-- revoking the table privileges means a mistakenly added policy still can't
-- expose financial data.
revoke all on public.creator_seller_accounts from anon, authenticated;
revoke all on public.entitlements            from anon, authenticated;
revoke all on public.creator_ledger_entries  from anon, authenticated;
revoke all on public.refunds                 from anon, authenticated;
grant all on public.creator_seller_accounts to service_role;
grant all on public.entitlements            to service_role;
grant all on public.creator_ledger_entries  to service_role;
grant all on public.refunds                 to service_role;

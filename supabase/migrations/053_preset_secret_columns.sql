-- ═══════════════════════════════════════════════════════════════════════════════
-- 053_preset_secret_columns.sql — Phase 5.10.0 (security hotfix, part 2 of 2)
--
-- RUN ORDER MATTERS: run this only AFTER the Phase 5.10.0 code is deployed.
--   The previously deployed storefront selected presets with `*` through the
--   anon key; once anon loses SELECT on some columns, `*` is refused. The
--   5.10.0 code selects explicit public columns and works both before and
--   after this migration, so: deploy → then run 053. (052 is the opposite:
--   it must run BEFORE deploy, because the new payment code calls its
--   functions.)
--
-- THE ISSUE: presets' SELECT policy (001) filters rows (is_published) but not
-- columns, so anyone holding the public anon key could read download_url (the
-- paid file link) and unlock_password for every published preset — paying was
-- optional. Verified in production: 68 links and 94 passwords exposed.
-- bundles.download_url had the same exposure (all empty today).
--
-- THE FIX: column-level privileges. anon/authenticated keep SELECT on every
-- column EXCEPT the secrets. The list is computed from the live catalog, so a
-- column added later stays hidden until someone grants it deliberately. The
-- service role — used by every route that legitimately reads these columns
-- (checkout, downloads, unlock, admin) — is unaffected.
--
-- Idempotent. Drops nothing.
-- ═══════════════════════════════════════════════════════════════════════════════
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'presets'
     and column_name not in ('download_url', 'unlock_password', 'password_updated_at', 'password_updated_by');
  execute 'revoke select on public.presets from anon, authenticated';
  execute format('grant select (%s) on public.presets to anon, authenticated', cols);

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'bundles'
     and column_name not in ('download_url');
  execute 'revoke select on public.bundles from anon, authenticated';
  execute format('grant select (%s) on public.bundles to anon, authenticated', cols);
end $$;


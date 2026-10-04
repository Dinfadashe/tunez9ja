-- ═══════════════════════════════════════════════════════════════════════════
-- Tunez9ja — security hardening (2026-10-04)
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Fixes:
--   1. Users could give themselves admin / verified / multiplier / paid-KYC
--      by writing to their own profiles row from the browser.
--   2. Browser could write token balances, transactions and purchases.
--   3. Premium unlocks could be inserted without paying.
--   4. Token RPCs were executable by anonymous (logged-out) callers, and
--      credit_purchased_tunez by any logged-in user.
--   5. A Paystack reference could be credited twice by concurrent requests.
--   6. Editor CVs should live in a private bucket (see end of file).
--
-- How the guards work: they only apply to requests made directly by app
-- users (Postgres roles `anon` / `authenticated`). Your SECURITY DEFINER
-- functions (add_tunez, spend_tunez, approve_editor …), the service role used
-- by edge functions, and the SQL editor are not affected.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Columns the editor application form saves ───────────────────────────
alter table public.profiles add column if not exists editor_motivation text;
alter table public.profiles add column if not exists editor_experience text;

-- ── Helper: is this user an admin? ─────────────────────────────────────────
create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and (role = 'admin' or 'admin' = any(coalesce(available_roles, '{}'::text[])))
  )
$$;

-- True only for direct requests from app users (not definer functions,
-- service role or the SQL editor)
create or replace function public.is_direct_user_request()
returns boolean
language sql stable
as $$ select current_user in ('anon', 'authenticated') $$;


-- ── 1. Protect privileged profile columns ──────────────────────────────────
-- NOTE: SECURITY INVOKER on purpose, so current_user reflects the caller.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allowed text[];
begin
  if not public.is_direct_user_request() or public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.id is distinct from auth.uid() then
      raise exception 'You can only create your own profile';
    end if;
    if new.role is null or new.role not in ('user', 'artist', 'blogger') then
      new.role := 'user';
    end if;
    new.available_roles := array(
      select distinct r
      from unnest(coalesce(new.available_roles, '{}'::text[]) || array['user', new.role]) as r
      where r in ('user', 'artist', 'blogger')
    );
    if new.active_role is null or not (new.active_role = any(new.available_roles)) then
      new.active_role := new.role;
    end if;
    new.is_verified     := false;
    new.verified_type   := null;
    new.earn_multiplier := 1.0;
    new.editor_status   := null;
    new.kyc_fee_paid    := false;
    new.kyc_fee_ref     := null;
    return new;
  end if;

  -- UPDATE by the user on their own row: privileged fields keep old values
  new.role               := old.role;
  new.available_roles    := old.available_roles;
  new.is_verified        := old.is_verified;
  new.verified_type      := old.verified_type;
  new.earn_multiplier    := old.earn_multiplier;
  new.content_violations := old.content_violations;
  new.kyc_fee_paid       := old.kyc_fee_paid;
  new.kyc_fee_ref        := old.kyc_fee_ref;

  -- KYC: users may only submit (→ 'pending'), never approve themselves
  if new.kyc_status is distinct from old.kyc_status
     and coalesce(new.kyc_status, '') <> 'pending' then
    new.kyc_status := old.kyc_status;
  end if;

  -- Editor programme: users may only apply (→ 'applied')
  if new.editor_status is distinct from old.editor_status
     and not (new.editor_status = 'applied'
              and coalesce(old.editor_status, '') in ('', 'rejected', 'none')) then
    new.editor_status := old.editor_status;
  end if;

  -- active_role must be a role the account actually has
  allowed := coalesce(old.available_roles, '{}'::text[]) || array['user', old.role];
  if old.editor_status = 'approved' then allowed := allowed || array['editor']; end if;
  if new.active_role is not null and not (new.active_role = any(allowed)) then
    new.active_role := old.active_role;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileges on public.profiles;
create trigger trg_protect_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();


-- ── 2. Token ledger: no direct writes from the browser ─────────────────────
create or replace function public.block_direct_ledger_writes()
returns trigger
language plpgsql
as $$
begin
  if public.is_direct_user_request() and not public.is_admin(auth.uid()) then
    raise exception 'Direct changes to % are not allowed', tg_table_name;
  end if;
  return coalesce(new, old);
end;
$$;

-- Only install if the token functions run as SECURITY DEFINER; otherwise
-- they write the ledger as the user and this guard would break earning.
do $$
declare
  invoker_fns text;
begin
  select string_agg(p.proname, ', ') into invoker_fns
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('add_tunez', 'spend_tunez', 'increment_daily_tunez', 'credit_purchased_tunez')
    and not p.prosecdef;

  if invoker_fns is not null then
    raise warning 'SKIPPED ledger guard: % run as SECURITY INVOKER, so your RLS must currently let users write balances directly. Make them SECURITY DEFINER, then re-run this file.', invoker_fns;
    return;
  end if;

  execute 'drop trigger if exists trg_block_direct_writes on public.tunez_balances';
  execute 'create trigger trg_block_direct_writes before insert or update or delete on public.tunez_balances for each row execute function public.block_direct_ledger_writes()';
  execute 'drop trigger if exists trg_block_direct_writes on public.tunez_transactions';
  execute 'create trigger trg_block_direct_writes before insert or update or delete on public.tunez_transactions for each row execute function public.block_direct_ledger_writes()';
  execute 'drop trigger if exists trg_block_direct_writes on public.tunez_purchases';
  execute 'create trigger trg_block_direct_writes before insert or update or delete on public.tunez_purchases for each row execute function public.block_direct_ledger_writes()';
  raise notice 'Ledger guard installed.';
end $$;


-- ── 3. Premium unlocks require a matching payment ──────────────────────────
-- The app debits via spend_tunez (which writes a 'spend_premium' transaction)
-- and then inserts the unlock. This keeps that flow working but rejects an
-- unlock that has no payment behind it.
create or replace function public.require_paid_unlock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_direct_user_request() or public.is_admin(auth.uid()) then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'You can only unlock content for yourself';
  end if;
  if not exists (
    select 1 from public.tunez_transactions t
    where t.user_id = new.user_id
      and t.type = 'spend_premium'
      and t.ref_id::text = new.content_id::text
      and t.created_at > now() - interval '15 minutes'
  ) then
    raise exception 'Unlock requires a completed TUNEZ payment';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_require_paid_unlock on public.tunez_unlocks;
create trigger trg_require_paid_unlock
  before insert on public.tunez_unlocks
  for each row execute function public.require_paid_unlock();

-- Users may not edit or delete unlock records directly
drop trigger if exists trg_block_direct_writes on public.tunez_unlocks;
create trigger trg_block_direct_writes
  before update or delete on public.tunez_unlocks
  for each row execute function public.block_direct_ledger_writes();


-- ── 4. Who may call the token / admin functions ────────────────────────────
-- Postgres lets PUBLIC (incl. logged-out visitors) execute functions by
-- default. Restrict to logged-in users; credit_purchased_tunez only to the
-- service role (the payment edge function).
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'add_tunez', 'spend_tunez', 'increment_daily_tunez', 'credit_purchased_tunez',
        'approve_editor', 'reject_editor', 'approve_verification', 'reject_verification',
        'editor_approve_post', 'editor_reject_post'
      )
  loop
    execute format('revoke execute on function %s from public, anon', fn.sig);
    if fn.proname = 'credit_purchased_tunez' then
      execute format('revoke execute on function %s from authenticated', fn.sig);
    else
      execute format('grant execute on function %s to authenticated', fn.sig);
    end if;
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;


-- ── 5. One credit per Paystack reference ───────────────────────────────────
do $$
begin
  create unique index if not exists tunez_purchases_paystack_ref_key
    on public.tunez_purchases (paystack_ref);
exception when unique_violation then
  raise warning 'SKIPPED unique index: duplicate paystack_ref rows exist (possible double credits). Find them with: select paystack_ref, count(*) from tunez_purchases group by 1 having count(*) > 1;';
end $$;


-- ── 6. Editor CVs: private bucket ───────────────────────────────────────────
-- The app now stores CV storage paths and admins open them with signed links,
-- so the bucket no longer needs to be public. Applicants may upload only into
-- their own folder; only admins may read.
update storage.buckets set public = false where id = 'editor-cvs';

drop policy if exists "editor_cvs_owner_upload" on storage.objects;
create policy "editor_cvs_owner_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'editor-cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "editor_cvs_owner_update" on storage.objects;
create policy "editor_cvs_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'editor-cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "editor_cvs_admin_read" on storage.objects;
create policy "editor_cvs_admin_read" on storage.objects for select to authenticated
  using (bucket_id = 'editor-cvs' and (public.is_admin(auth.uid()) or (storage.foldername(name))[1] = auth.uid()::text));
